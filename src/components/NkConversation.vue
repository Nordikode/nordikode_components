<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatConversationTime, groupConversationEntries } from '../conversation'
import type { NkConversationEntry } from '../types/NkConversationEntry'
import type { NkConversationLabels } from '../types/NkConversationLabels'

/**
 * Delt samtalevisning (SIGN-1313): meldinger som bobler, delt per dag, med
 * hendelser i samtalen som sentrerte linjer. Brukes av helpcenter i
 * konto-appen og av «Henvendelser» i backoffice.
 *
 * - Komponenten viser det den får inn. Den har ingen store og gjør ingen
 *   kall. Appen eier all tekst: `text`, `author` og `receipt` på innslagene
 *   er ferdig oversatt, og `labels` kommer fra appens i18n.
 * - Den ruller ikke selv. Innslagene ligger i vanlig flyt, så det er siden
 *   (eller beholderen appen legger den i) som ruller — rulling i rulling er
 *   ubrukelig på mobil. `#footer` (skrivefeltet) står fast nederst.
 * - Åpnes nederst. Kommer det noe nytt mens leseren er nederst, følger
 *   visningen med. Har leseren rullet opp, flyttes ingenting: en knapp sier
 *   at det er noe nytt.
 * - `seen` sendes med id-en til nyeste innslag når det er synlig og fanen
 *   er framme. Det er appens signal for «lest til og med».
 */
interface Props {
  entries: NkConversationEntry[]
  /** Brukerens UI-språk. Dato og tid formateres av Intl. */
  locale: string
  /** Tidssonen dagene regnes i. Uten verdi brukes nettleserens. */
  timeZone?: string
  labels: NkConversationLabels
}

const props = withDefaults(defineProps<Props>(), {
  timeZone: undefined,
})

const emit = defineEmits<{
  /** Nyeste innslag er synlig for leseren. */
  seen: [lastEntryId: string]
}>()

const logEnd = ref<HTMLElement | null>(null)
const pageEnd = ref<HTMLElement | null>(null)
const footer = ref<HTMLElement | null>(null)

const atEnd = ref(false)
const hasUnseen = ref(false)

const days = computed(() => groupConversationEntries(props.entries, props.locale, new Date(), props.timeZone))
const lastEntry = computed<NkConversationEntry | undefined>(() => props.entries[props.entries.length - 1])

/** Navnet vises på første boble i en rekke fra samme avsender. */
function showsAuthor(entries: NkConversationEntry[], index: number): boolean {
  const entry = entries[index]
  const previous = entries[index - 1]

  if (!entry.author) {
    return false
  }

  return !previous || previous.kind !== 'message' || previous.own !== entry.own || previous.author !== entry.author
}

function time(entry: NkConversationEntry): string {
  return formatConversationTime(entry.at, props.locale, props.timeZone)
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToEnd(smooth: boolean): void {
  pageEnd.value?.scrollIntoView({ block: 'end', behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
}

let lastSeenId: string | null = null

function announceSeen(): void {
  const entry = lastEntry.value

  if (!entry || !atEnd.value || document.visibilityState !== 'visible' || entry.id === lastSeenId) {
    return
  }

  lastSeenId = entry.id
  emit('seen', entry.id)
}

let endObserver: IntersectionObserver | null = null
let footerObserver: ResizeObserver | null = null

/**
 * Slutten av meldingene regnes som synlig først når den står over den
 * faste bunnraden, ikke bak den.
 */
function observeEnd(): void {
  endObserver?.disconnect()

  if (!logEnd.value || typeof IntersectionObserver === 'undefined') {
    return
  }

  const footerHeight = Math.ceil(footer.value?.getBoundingClientRect().height ?? 0)

  endObserver = new IntersectionObserver(
    ([entry]) => {
      atEnd.value = entry.isIntersecting

      if (entry.isIntersecting) {
        hasUnseen.value = false
        announceSeen()
      }
    },
    { rootMargin: `0px 0px -${footerHeight}px 0px` },
  )
  endObserver.observe(logEnd.value)
}

onMounted(() => {
  // Åpnes nederst, etter at foreldrene har lagt ut siden.
  void nextTick(() => {
    scrollToEnd(false)
    observeEnd()
  })

  if (footer.value && typeof ResizeObserver !== 'undefined') {
    footerObserver = new ResizeObserver(() => observeEnd())
    footerObserver.observe(footer.value)
  }

  document.addEventListener('visibilitychange', announceSeen)
})

onBeforeUnmount(() => {
  endObserver?.disconnect()
  footerObserver?.disconnect()
  document.removeEventListener('visibilitychange', announceSeen)
})

watch(
  () => lastEntry.value?.id,
  (id, previous) => {
    if (!id || id === previous) {
      return
    }

    // Leseren var nederst, eller skrev selv: følg med. Ellers: si fra.
    if (atEnd.value || previous === undefined || lastEntry.value?.own) {
      void nextTick(() => {
        scrollToEnd(previous !== undefined)
        announceSeen()
      })
    } else {
      hasUnseen.value = true
    }
  },
  { flush: 'post' },
)

defineExpose({ scrollToEnd })
</script>

<template>
  <section class="nk-conversation">
    <div class="nk-conversation__log" role="log" :aria-label="props.labels.list">
      <slot v-if="props.entries.length === 0" name="empty" />

      <template v-for="day in days" :key="day.key">
        <p class="nk-conversation__day">
          <span>{{ day.label }}</span>
        </p>

        <template v-for="(entry, index) in day.entries" :key="entry.id">
          <p v-if="entry.kind === 'event'" class="nk-conversation__event">
            {{ entry.text }}
            <time :datetime="entry.at">{{ time(entry) }}</time>
          </p>

          <article
            v-else
            class="nk-conversation__message"
            :class="{ 'nk-conversation__message--own': entry.own }"
          >
            <p v-if="showsAuthor(day.entries, index)" class="nk-conversation__author">{{ entry.author }}</p>
            <p class="nk-conversation__bubble">{{ entry.text }}</p>
            <p class="nk-conversation__meta">
              <time :datetime="entry.at">{{ time(entry) }}</time>
              <template v-if="entry.receipt"> · {{ entry.receipt }}</template>
            </p>
          </article>
        </template>
      </template>

      <div ref="logEnd" class="nk-conversation__end" aria-hidden="true" />
    </div>

    <div ref="footer" class="nk-conversation__footer">
      <div v-if="hasUnseen" class="nk-conversation__jump">
        <v-btn
          color="primary"
          prepend-icon="mdi-arrow-down"
          rounded="pill"
          size="small"
          variant="flat"
          @click="scrollToEnd(true)"
        >
          {{ props.labels.newMessages }}
        </v-btn>
      </div>
      <slot name="footer" />
    </div>

    <div ref="pageEnd" class="nk-conversation__end" aria-hidden="true" />
  </section>
</template>

<style scoped>
.nk-conversation {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nk-conversation__log {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.75);
  padding-bottom: calc(var(--nk-space-unit) * 2);
}

.nk-conversation__end {
  height: 1px;
}

/* Dagskillet: en dempet linje med dagen i midten. */
.nk-conversation__day {
  align-items: center;
  color: var(--nk-text-secondary);
  display: flex;
  font-size: var(--nk-text-label);
  gap: calc(var(--nk-space-unit) * 1.5);
  margin: calc(var(--nk-space-unit) * 2) 0 var(--nk-space-unit);
}

.nk-conversation__day::before,
.nk-conversation__day::after {
  background: var(--nk-surface-border);
  content: '';
  flex: 1;
  height: 1px;
}

.nk-conversation__event {
  align-self: center;
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  margin: var(--nk-space-unit) 0;
  text-align: center;
}

.nk-conversation__event time {
  margin-inline-start: calc(var(--nk-space-unit) * 0.75);
  opacity: 0.85;
}

.nk-conversation__message {
  align-items: flex-start;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  max-width: min(calc(var(--nk-space-unit) * 70), 82%);
  min-width: 0;
}

.nk-conversation__message--own {
  align-items: flex-end;
  align-self: flex-end;
}

.nk-conversation__author {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  font-weight: 600;
  margin: calc(var(--nk-space-unit) * 0.75) calc(var(--nk-space-unit) * 0.5) calc(var(--nk-space-unit) * 0.25);
}

/* Motpartens boble: dempet flate med hårstrek. Egen boble: handlingsfargen. */
.nk-conversation__bubble {
  background: var(--nk-surface-soft);
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-lg);
  color: var(--nk-text-primary);
  font-size: var(--nk-text-body);
  line-height: 1.45;
  margin: 0;
  overflow-wrap: anywhere;
  padding: var(--nk-space-unit) calc(var(--nk-space-unit) * 1.5);
  white-space: pre-wrap;
}

.nk-conversation__message--own .nk-conversation__bubble {
  background: var(--nk-action-primary);
  border-color: transparent;
  color: var(--nk-on-action-primary);
}

.nk-conversation__meta {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  font-variant-numeric: tabular-nums;
  margin: calc(var(--nk-space-unit) * 0.25) calc(var(--nk-space-unit) * 0.5) 0;
}

/* Bunnraden (skrivefeltet) står fast nederst mens siden ruller. Flaten bak
   den er sidens egen, så meldingene ikke skinner gjennom. */
.nk-conversation__footer {
  background: var(--nk-conversation-footer-background, var(--nk-page));
  bottom: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  position: sticky;
  z-index: 1;
}

.nk-conversation__jump {
  display: flex;
  justify-content: center;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  transform: translateY(calc(-100% - var(--nk-space-unit)));
}
</style>
