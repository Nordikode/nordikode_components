<script setup lang="ts">
/**
 * Båndet «Bekreft e-posten din» (SIGN-1676): vises øverst i innholdet på
 * alle innloggede flater så lenge kontoen mangler bekreftet e-postadresse
 * og fristen ikke er passert. Sier hvilken adresse lenken gikk til og
 * fristen, og har én knapp: «Send ny lenke». Kan ikke lukkes — det
 * forsvinner når adressen er bekreftet (appen henter `me` på nytt via
 * realtime) eller når fristen stenger kontoen.
 *
 * Dataene kommer som props (`me.pendingEmailVerification`), tekstene fra
 * pakken på språket i `locale` (`emailVerificationTexts`); sendingen eies
 * av verts-appen og meldes som hendelsen `resend`. Nedtellingen etter en
 * sending (`resendSecondsLeft`) eies også av appen, så den er lik på alle
 * flater. Fristen formateres med `Intl` på brukerens språk.
 *
 * Farger: varselrollen fra designsystemet — `--nk-warning`/`--nk-on-warning`
 * i Vuetify-appene, `--color-warning`/`--color-on-warning` på nettsiden.
 */
import { computed } from 'vue'
import { toBcp47 } from '../money'
import { emailVerificationTexts, type EmailVerificationBannerTexts } from './emailVerificationTexts'

export type PendingEmailVerification = {
  /** Adressen lenken gikk til. Data, aldri oversatt. */
  email: string
  /** Fristen, ISO 8601 eller `YYYY-MM-DD HH:MM:SS` (UTC) slik core gir den. */
  deadlineAt: string
}

const props = withDefaults(
  defineProps<{
    pending: PendingEmailVerification
    /** Brukerens UI-språk, som det er (`no`, `sv`, `pt-BR`). Utelatt: kildespråket. */
    locale?: string | null
    /** En sending er underveis: knappen er av. */
    busy?: boolean
    /** Sekunder igjen av nedtellingen etter en sending; 0 = knappen er åpen. */
    resendSecondsLeft?: number
    labels?: Partial<EmailVerificationBannerTexts>
  }>(),
  { locale: null, busy: false, resendSecondsLeft: 0, labels: () => ({}) },
)

const emit = defineEmits<{
  /** Brukeren trykket «Send ny lenke». */
  resend: []
}>()

const text = computed<EmailVerificationBannerTexts>(() => ({ ...emailVerificationTexts(props.locale), ...props.labels }))

const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)

/** Core sin `DateTime` er `YYYY-MM-DD HH:MM:SS` uten sone (UTC); ISO 8601 tas som det er. */
const parseDeadline = (value: string): Date | null => {
  const trimmed = value.trim()
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed) ? `${trimmed.replace(' ', 'T')}Z` : trimmed
  const parsed = Date.parse(normalized)

  return Number.isNaN(parsed) ? null : new Date(parsed)
}

const deadline = computed(() => parseDeadline(props.pending.deadlineAt))

const deadlineText = computed(() => {
  if (deadline.value === null) return props.pending.deadlineAt

  try {
    return new Intl.DateTimeFormat(toBcp47(props.locale), { dateStyle: 'long', timeStyle: 'short' }).format(deadline.value)
  } catch {
    return deadline.value.toISOString()
  }
})

const message = computed(() => fill(text.value.message, { date: deadlineText.value, email: props.pending.email }))

const buttonText = computed(() =>
  props.resendSecondsLeft > 0 ? fill(text.value.resendIn, { seconds: String(props.resendSecondsLeft) }) : text.value.resend,
)

const disabled = computed(() => props.busy || props.resendSecondsLeft > 0)
</script>

<template>
  <div class="nk-verify" role="region" :aria-label="text.region">
    <div class="nk-verify__inner">
      <svg
        class="nk-verify__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>

      <p class="nk-verify__text">
        <time v-if="deadline" :datetime="deadline.toISOString()" class="nk-verify__hidden">{{ deadlineText }}</time>
        {{ message }}
      </p>

      <div class="nk-verify__actions">
        <button type="button" class="nk-verify__button" :disabled="disabled" @click="emit('resend')">
          {{ buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nk-verify {
  --nk-verify-bg: var(--nk-warning, var(--color-warning));
  --nk-verify-ink: var(--nk-on-warning, var(--color-on-warning));

  background: var(--nk-verify-bg);
  color: var(--nk-verify-ink);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.nk-verify__inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding: 0.375rem 1.25rem;
}

.nk-verify__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.nk-verify__text {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

/* Maskinlesbar frist for skjermlesere; den synlige teksten bærer datoen selv. */
.nk-verify__hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.nk-verify__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.nk-verify__button {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  border: 1px solid currentColor;
  border-radius: var(--radius-compact, 0.375rem);
  background: transparent;
  padding: 0 0.625rem;
  color: inherit;
  font: inherit;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.nk-verify__button:hover:not(:disabled) {
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.nk-verify__button:focus-visible {
  outline: 2px solid var(--nk-verify-ink);
  outline-offset: 2px;
}

.nk-verify__button:disabled {
  cursor: default;
  opacity: 0.6;
}

/* Smale skjermer: teksten over, knappen under i full bredde. */
@media (max-width: 639px) {
  .nk-verify__inner {
    flex-wrap: wrap;
    gap: 0.375rem 0.5rem;
    padding-inline: 0.75rem;
  }

  .nk-verify__text {
    flex-basis: calc(100% - 1.75rem);
  }

  .nk-verify__actions {
    flex: 1 1 100%;
  }

  .nk-verify__button {
    width: 100%;
    min-height: 2.25rem;
    justify-content: center;
  }
}
</style>
