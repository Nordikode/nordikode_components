<script setup lang="ts">
/**
 * Supportbanneret (SIGN-1547): står fast over headerraden i `AppHeader` så
 * lenge nettleseren er i en supportøkt — en Nordikode-ansatt som bruker
 * plattformen som en bruker i ett firma. Sier hvem det vises som, hvor lenge
 * økten varer, om endringer er på, og gir én vei ut («Avslutt»).
 *
 * Kan ikke lukkes eller skjules: det finnes ingen lukkeknapp og ingen prop
 * som slår det av mens økten finnes.
 *
 * Ren presentasjon, som resten av chromen: økten og tekstene kommer som
 * props, modusbytte og avslutt sendes som hendelser — verts-appen (eller
 * `@nordikode/app-core`) eier kallene. Navn og firma er data. Gjenstående
 * tid formateres med `Intl` på brukerens språk.
 *
 * Å slå på endringer bekreftes i banneret selv (ingen dialog): banneret
 * bytter til én linje som sier hva det betyr, med «Slå på» og «Avbryt».
 * Å slå av trenger ingen bekreftelse.
 *
 * Farger: varselrollen fra designsystemet — `--nk-warning`/`--nk-on-warning`
 * i Vuetify-appene, `--color-warning`/`--color-on-warning` på nettsiden.
 * Verts-appen kan overstyre med `--nk-chrome-support` og
 * `--nk-chrome-on-support`. Modus bæres alltid av tekst, aldri bare farge.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toBcp47 } from '../money'
import { setSupportBannerHeight } from './supportBannerHeight'

export type SupportSessionMode = 'READ' | 'WRITE'

export type AppHeaderSupportSession = {
  /** Brukeren økten vises som. Data, aldri oversatt. */
  userName: string
  /** Firmaet økten er bundet til. Data, aldri oversatt. */
  tenantName?: string | null
  /** Appen banneret står i («Nordikode Sign»). Produktnavn oversettes aldri. */
  appName?: string | null
  mode: SupportSessionMode
  /** Når økten utløper (ISO 8601). */
  expiresAt: string
  /** Et modusbytte eller en avslutning er underveis: knappene er av. */
  busy?: boolean
}

export type AppHeaderSupportSessionLabels = {
  /** aria-label på banneret. */
  region: string
  /** «Du ser {app} som {name} ({tenant})». Plassholderne fylles av banneret. */
  viewingAs: string
  /** Samme uten firma: «Du ser {app} som {name}». */
  viewingAsWithoutTenant: string
  /** «{time} igjen» — `{time}` er den formaterte tiden («23 min»). */
  timeLeft: string
  /** Vises når tiden er ute, til økten er hentet på nytt. */
  expired: string
  /** Modus i ord: «Lesemodus». */
  readMode: string
  /** Modus i ord: «Endringer er på». */
  writeMode: string
  /** Bryteren: «Gjør endringer». */
  makeChanges: string
  /** Bekreftelsen før endringer slås på. */
  confirmWrite: string
  /** Bekreft-knappen: «Slå på». */
  confirm: string
  /** «Avbryt». */
  cancel: string
  /** «Avslutt». */
  end: string
}

/** Kildespråket. Verts-appen sender sine oversettelser i `labels`. */
const DEFAULT_LABELS: AppHeaderSupportSessionLabels = {
  region: 'Support session',
  viewingAs: 'You are viewing {app} as {name} ({tenant})',
  viewingAsWithoutTenant: 'You are viewing {app} as {name}',
  timeLeft: '{time} left',
  expired: 'The session has ended',
  readMode: 'Read mode',
  writeMode: 'Changes are on',
  makeChanges: 'Make changes',
  confirmWrite: 'Changes you make are saved for the customer and logged.',
  confirm: 'Turn on',
  cancel: 'Cancel',
  end: 'End',
}

const props = withDefaults(
  defineProps<{
    session: AppHeaderSupportSession
    labels?: Partial<AppHeaderSupportSessionLabels>
    /** Brukerens UI-språk, som det er (`no`, `sv`, `pt-BR`). Utelatt: kildespråket. */
    locale?: string | null
  }>(),
  { labels: () => ({}), locale: null },
)

const emit = defineEmits<{
  /** Brukeren ba om å bytte modus (bekreftet når det gjelder å slå på). */
  mode: [mode: SupportSessionMode]
  /** Brukeren trykket «Avslutt». */
  end: []
}>()

const text = computed<AppHeaderSupportSessionLabels>(() => ({ ...DEFAULT_LABELS, ...props.labels }))

const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match).replace(/\s{2,}/g, ' ').trim()

const title = computed(() => {
  const tenant = (props.session.tenantName ?? '').trim()

  return fill(tenant === '' ? text.value.viewingAsWithoutTenant : text.value.viewingAs, {
    app: (props.session.appName ?? '').trim(),
    name: props.session.userName,
    tenant,
  })
})

/* Gjenstående tid: én klokke i banneret, ingen kall. Utløpet selv håndteres
   av verts-appen (app-core henter sesjonen på nytt når tiden er ute). */
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

const remainingSeconds = computed(() => {
  const expires = Date.parse(props.session.expiresAt)

  return Number.isNaN(expires) ? null : Math.max(0, Math.ceil((expires - now.value) / 1000))
})

const formatUnit = (value: number, unit: 'hour' | 'minute' | 'second'): string => {
  try {
    return new Intl.NumberFormat(toBcp47(props.locale), { style: 'unit', unit, unitDisplay: 'short' }).format(value)
  } catch {
    return String(value)
  }
}

const timeText = computed(() => {
  const seconds = remainingSeconds.value

  if (seconds === null) return ''
  if (seconds === 0) return text.value.expired

  let time: string

  if (seconds < 60) {
    time = formatUnit(seconds, 'second')
  } else if (seconds < 3600) {
    time = formatUnit(Math.ceil(seconds / 60), 'minute')
  } else {
    const minutes = Math.ceil(seconds / 60)
    const rest = minutes % 60
    time = rest === 0
      ? formatUnit(minutes / 60, 'hour')
      : `${formatUnit(Math.floor(minutes / 60), 'hour')} ${formatUnit(rest, 'minute')}`
  }

  return fill(text.value.timeLeft, { time })
})

/* Skjermlesere får tiden lest ved hvert hele minutt, ikke hvert sekund. */
const timeDateTime = computed(() => (remainingSeconds.value === null ? undefined : `PT${remainingSeconds.value}S`))

const writing = computed(() => props.session.mode === 'WRITE')
const busy = computed(() => props.session.busy === true)
const modeText = computed(() => (writing.value ? text.value.writeMode : text.value.readMode))

/* Bekreftelsen: bare når endringer slås PÅ. */
const confirming = ref(false)
const confirmButton = ref<HTMLButtonElement | null>(null)
const switchButton = ref<HTMLButtonElement | null>(null)

async function onSwitch() {
  if (busy.value) return

  if (writing.value) {
    emit('mode', 'READ')
    return
  }

  confirming.value = true
  await nextTick()
  confirmButton.value?.focus()
}

function confirmWrite() {
  confirming.value = false
  emit('mode', 'WRITE')
  void nextTick(() => switchButton.value?.focus())
}

function cancelWrite() {
  confirming.value = false
  void nextTick(() => switchButton.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && confirming.value) {
    event.stopPropagation()
    cancelWrite()
  }
}

// Modusen kom utenfra (bekreftet av core, eller byttet i en annen fane):
// en åpen bekreftelse gjelder ikke lenger.
watch(writing, () => {
  confirming.value = false
})

/* Høyden meldes til `useSupportBannerHeight()` så en `v-app-bar` med fast
   høyde kan vokse med banneret. */
const root = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

const reportHeight = (): void => {
  setSupportBannerHeight(root.value?.getBoundingClientRect().height ?? 0)
}

onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now()
  }, 1000)

  reportHeight()

  if (typeof ResizeObserver !== 'undefined' && root.value) {
    observer = new ResizeObserver(reportHeight)
    observer.observe(root.value)
  }
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  observer?.disconnect()
  setSupportBannerHeight(0)
})
</script>

<template>
  <div
    ref="root"
    class="nk-support"
    :class="{ 'nk-support--write': writing }"
    role="region"
    :aria-label="text.region"
    @keydown="onKeydown"
  >
    <div class="nk-support__inner">
      <svg
        class="nk-support__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 19 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>

      <template v-if="confirming">
        <p class="nk-support__text nk-support__text--confirm" role="alert">{{ text.confirmWrite }}</p>
        <div class="nk-support__actions">
          <button
            ref="confirmButton"
            type="button"
            class="nk-support__button nk-support__button--solid"
            @click="confirmWrite"
          >
            {{ text.confirm }}
          </button>
          <button type="button" class="nk-support__button" @click="cancelWrite">{{ text.cancel }}</button>
        </div>
      </template>

      <template v-else>
        <p class="nk-support__text">
          <span class="nk-support__title">{{ title }}</span>
          <span class="nk-support__meta">
            <span class="nk-support__mode">{{ modeText }}</span>
            <time v-if="timeText" class="nk-support__time" :datetime="timeDateTime">{{ timeText }}</time>
          </span>
        </p>
        <div class="nk-support__actions">
          <button
            ref="switchButton"
            type="button"
            class="nk-support__switch"
            role="switch"
            :aria-checked="writing"
            :disabled="busy"
            @click="onSwitch"
          >
            <span class="nk-support__switch-track" aria-hidden="true">
              <span class="nk-support__switch-thumb" />
            </span>
            <span class="nk-support__switch-label">{{ text.makeChanges }}</span>
          </button>
          <button type="button" class="nk-support__button" :disabled="busy" @click="emit('end')">
            {{ text.end }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.nk-support {
  --nk-support-bg: var(--nk-chrome-support, var(--nk-warning, var(--color-warning)));
  --nk-support-ink: var(--nk-chrome-on-support, var(--nk-on-warning, var(--color-on-warning)));

  background: var(--nk-support-bg);
  color: var(--nk-support-ink);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.nk-support__inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding: 0.375rem 1.25rem;
}

.nk-support__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.nk-support__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.75rem;
  row-gap: 0.125rem;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.nk-support__title {
  min-width: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.nk-support__meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.5rem;
}

/* Modus i ord, med ramme i blekkfargen: leses uten farge (WCAG 1.4.1). */
.nk-support__mode {
  border: 1px solid currentColor;
  border-radius: 9999px;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.nk-support__time {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.nk-support__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nk-support__button,
.nk-support__switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.75rem;
  border: 1px solid currentColor;
  border-radius: var(--radius-compact, 0.375rem);
  background: transparent;
  padding: 0 0.625rem;
  color: inherit;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.nk-support__switch {
  border-color: transparent;
  padding-inline: 0.25rem;
}

/* Fylt knapp: fargene byttes om, så kontrasten er den samme som banneret. */
.nk-support__button--solid {
  border-color: var(--nk-support-ink);
  background: var(--nk-support-ink);
  color: var(--nk-support-bg);
}

.nk-support__button:hover:not(:disabled):not(.nk-support__button--solid),
.nk-support__switch:hover:not(:disabled) {
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.nk-support__button:focus-visible,
.nk-support__switch:focus-visible {
  outline: 2px solid var(--nk-support-ink);
  outline-offset: 2px;
}

.nk-support__button:disabled,
.nk-support__switch:disabled {
  cursor: default;
  opacity: 0.6;
}

.nk-support__switch-track {
  display: inline-flex;
  align-items: center;
  width: 2rem;
  height: 1.125rem;
  flex-shrink: 0;
  border: 1.5px solid currentColor;
  border-radius: 9999px;
  padding: 0 0.125rem;
  transition: background-color 0.15s;
}

.nk-support__switch-thumb {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  background: currentColor;
  transition: transform 0.15s, background-color 0.15s;
}

.nk-support__switch[aria-checked='true'] .nk-support__switch-track {
  background: var(--nk-support-ink);
}

.nk-support__switch[aria-checked='true'] .nk-support__switch-thumb {
  background: var(--nk-support-bg);
  transform: translateX(0.875rem);
}

/* Smale skjermer: teksten over, knappene under — begge i full bredde. */
@media (max-width: 639px) {
  .nk-support__inner {
    flex-wrap: wrap;
    gap: 0.375rem 0.5rem;
    padding-inline: 0.75rem;
  }

  .nk-support__text {
    flex-basis: calc(100% - 1.75rem);
  }

  .nk-support__actions {
    flex: 1 1 100%;
    justify-content: space-between;
  }

  .nk-support__button,
  .nk-support__switch {
    min-height: 2.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nk-support__switch-track,
  .nk-support__switch-thumb {
    transition: none;
  }
}
</style>
