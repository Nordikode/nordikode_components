<script setup lang="ts">
/**
 * «Du er logget ut»-overlegget (SIGN-509): plattformsesjonen er borte —
 * logget ut i en annen fane/enhet eller utløpt — men appen navigerer ikke
 * bort. Skjermbildet under ligger urørt (ulagret skjematilstand overlever),
 * og «Logg inn igjen» lar verts-appen åpne innloggingen i et eget vindu og
 * gjenoppta sesjonen på stedet.
 *
 * Kan ikke lukkes av brukeren (ingen lukkeknapp, Escape gjør ingenting):
 * det finnes ingen meningsfull tilstand «uinnlogget, men fortsett».
 * Vuetify-fri, styles mot web-tokenene (`--color-*`, `--radius-*`) og
 * aksentkontrakten `--nk-chrome-accent` / `--nk-chrome-accent-ink`.
 * Etikettene kommer som props: pakka er i18n-fri, verts-appen eier språket.
 * z-index: `--nk-overlay-z` (default 60 — over headeren (50) og toasts).
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

export type NkSignedOutReason = 'revoked' | 'expired'

export type NkSignedOutDialogLabels = {
  /** Overskrift, f.eks. «Du er logget ut». */
  title: string
  /** Brødtekst når sesjonen ble avsluttet et annet sted (annen fane/enhet). */
  revoked: string
  /** Brødtekst når sesjonen utløp. */
  expired: string
  /** Knappen: «Logg inn igjen». */
  signInAgain: string
  /** Statustekst mens innloggingsvinduet er åpent, f.eks. «Venter på innlogging…». */
  waiting: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    reason?: NkSignedOutReason
    /** Innloggingsvinduet er åpent — knappen viser `waiting` og deaktiveres. */
    waiting?: boolean
    labels: NkSignedOutDialogLabels
  }>(),
  { reason: 'revoked', waiting: false },
)

const emit = defineEmits<{ 'sign-in': [] }>()

const uid = `nk-signed-out-${Math.random().toString(36).slice(2, 8)}`
const button = ref<HTMLButtonElement | null>(null)

const body = computed(() => (props.reason === 'expired' ? props.labels.expired : props.labels.revoked))

// Fokus flyttes inn i dialogen når den åpner (og tilbake når den lukker),
// og scroll på dokumentet låses så innholdet bak ikke kan brukes.
let previouslyFocused: Element | null = null

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  // Eneste fokuserbare element er knappen — hold fokus der.
  event.preventDefault()
  button.value?.focus()
}

watch(
  () => props.open,
  async (open) => {
    if (typeof document === 'undefined') return
    if (open) {
      previouslyFocused = document.activeElement
      document.documentElement.classList.add('nk-signed-out-open')
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      button.value?.focus()
    } else {
      document.documentElement.classList.remove('nk-signed-out-open')
      document.removeEventListener('keydown', onKeydown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('nk-signed-out-open')
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="nk-signed-out">
      <div v-if="open" class="nk-signed-out" role="presentation">
        <div
          class="nk-signed-out__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`${uid}-title`"
          :aria-describedby="`${uid}-body`"
        >
          <span class="nk-signed-out__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
          </span>
          <h2 :id="`${uid}-title`" class="nk-signed-out__title">{{ labels.title }}</h2>
          <p :id="`${uid}-body`" class="nk-signed-out__body">{{ body }}</p>
          <button
            ref="button"
            type="button"
            class="nk-signed-out__button"
            :disabled="waiting"
            :aria-busy="waiting || undefined"
            @click="emit('sign-in')"
          >
            {{ waiting ? labels.waiting : labels.signInAgain }}
          </button>
          <p v-if="waiting" class="nk-signed-out__status" role="status" aria-live="polite">
            {{ labels.waiting }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.nk-signed-out {
  position: fixed;
  inset: 0;
  z-index: var(--nk-overlay-z, 60);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--color-ink) 45%, transparent);
  backdrop-filter: blur(4px);
}

.nk-signed-out__dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 26rem;
  padding: 2rem 1.5rem 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard);
  background: var(--color-surface-raised);
  color: var(--color-ink);
  text-align: center;
  box-shadow: 0 1.5rem 3rem color-mix(in srgb, var(--color-ink) 24%, transparent);
}

.nk-signed-out__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--nk-chrome-accent, var(--color-ink)) 12%, transparent);
  color: var(--nk-chrome-accent, var(--color-ink));
}

.nk-signed-out__icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.nk-signed-out__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.nk-signed-out__body {
  margin: 0;
  color: var(--color-ink-secondary);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.nk-signed-out__button {
  margin-top: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1.5rem;
  border: 0;
  border-radius: var(--radius-compact);
  background: var(--nk-chrome-accent, var(--color-ink));
  color: var(--nk-chrome-accent-ink, var(--color-surface));
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
}

.nk-signed-out__button:hover:not(:disabled) {
  filter: brightness(1.08);
}

.nk-signed-out__button:focus-visible {
  outline: 2px solid var(--nk-chrome-accent, var(--color-ink));
  outline-offset: 2px;
}

.nk-signed-out__button:disabled {
  cursor: default;
  opacity: 0.7;
}

.nk-signed-out__status {
  margin: 0;
  color: var(--color-ink-tertiary);
  font-size: 0.8125rem;
}

.nk-signed-out-enter-active,
.nk-signed-out-leave-active {
  transition: opacity 0.15s;
}

.nk-signed-out-enter-from,
.nk-signed-out-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nk-signed-out-enter-active,
  .nk-signed-out-leave-active,
  .nk-signed-out__button {
    transition: none;
  }
}
</style>

<!-- Uscopet med vilje: `:global()` i scoped CSS knekker i pakkas
     LightningCSS-minifisering. Klassenavnene er nk-namespacet. -->
<style>
html.nk-signed-out-open {
  overflow: hidden;
}
</style>
