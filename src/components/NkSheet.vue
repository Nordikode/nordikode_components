<script setup lang="ts">
import { computed, useId, useSlots } from 'vue'
import { useDisplay } from 'vuetify'

/**
 * Delt dialogskall (SIGN-733): ett «sheet» med hode, rullende kropp og
 * festet handlingsrad — erstatter app-kopiene av `.nk-sheet*` i time-web,
 * company, account og developer.
 *
 * - Hodet og handlingsraden står fast; bare kroppen ruller (v-dialog
 *   `scrollable` gjør kortet til en flex-kolonne som aldri overstiger
 *   skjermen).
 * - Kroppen har innvendig luft som dekker Vuetifys flytende etiketter og
 *   fokusrammer, så ingenting klippes ved rulleposisjon 0 (SIGN-732).
 * - Under `smAndDown` er sheetet fullskjerm (kan skrus av med
 *   `fullscreenOnMobile`), og handlingsraden respekterer safe-area.
 * - Appen eier all tekst (i18n) og alle handlinger; komponenten eier
 *   bare geometri og toner — kun tokens, ingen egne px.
 *
 * Åpen/lukket styres enten med `v-model` eller med `open` + `close`;
 * begge hendelsene sendes uansett, så eieren kan velge.
 */
interface Props {
  /** v-model. */
  modelValue?: boolean
  /** Alternativ til v-model for eiere som styrer åpen/lukket selv (`:open` + `@close`). */
  open?: boolean
  title?: string
  subtitle?: string
  /** Bredde på desktop; ignoreres i fullskjerm. */
  maxWidth?: number | string
  /** Fullskjerm under Vuetifys `smAndDown` (standard: ja). */
  fullscreenOnMobile?: boolean
  /** Rendrer innholdet også når sheetet er lukket (monteringspunkt for f.eks. Stripe). */
  eager?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  open: undefined,
  title: '',
  subtitle: '',
  maxWidth: 560,
  fullscreenOnMobile: true,
  eager: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const slots = useSlots()
const { smAndDown } = useDisplay()

const isOpen = computed(() => props.modelValue ?? props.open ?? false)
const fullscreen = computed(() => props.fullscreenOnMobile && smAndDown.value)
const hasHead = computed(
  () => props.title !== '' || props.subtitle !== '' || Boolean(slots.head) || Boolean(slots.badge),
)
const hasActions = computed(() => Boolean(slots.actions))

const titleId = `nk-sheet-title-${useId()}`

const onUpdate = (value: boolean) => {
  emit('update:modelValue', value)
  if (!value) emit('close')
}
</script>

<template>
  <v-dialog
    :model-value="isOpen"
    :max-width="maxWidth"
    :fullscreen="fullscreen"
    :eager="eager"
    :aria-labelledby="props.title !== '' ? titleId : undefined"
    scrollable
    @update:model-value="onUpdate"
  >
    <v-card class="nk-sheet" :class="{ 'nk-sheet--fullscreen': fullscreen }">
      <div v-if="hasHead" class="nk-sheet__head">
        <slot name="head">
          <div class="nk-sheet__texts">
            <div class="nk-sheet__title-row">
              <h2 v-if="props.title !== ''" :id="titleId" class="nk-sheet__title">{{ props.title }}</h2>
              <slot name="badge" />
            </div>
            <p v-if="props.subtitle !== ''" class="nk-sheet__subtitle">{{ props.subtitle }}</p>
          </div>
        </slot>
      </div>

      <div class="nk-sheet__body" :class="{ 'nk-sheet__body--last': !hasActions }">
        <slot />
      </div>

      <div v-if="hasActions" class="nk-sheet__actions">
        <slot name="actions" />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Kortet er en flex-kolonne begrenset av dialogen (`scrollable`); selve
   kortet ruller aldri — det gjør kroppen. Selektoren må slå Vuetifys
   `.v-dialog > .v-overlay__content > .v-card` (border-radius 4px og
   overflow-y: auto). */
.v-dialog > .v-overlay__content > .v-card.nk-sheet {
  background: var(--nk-surface);
  border-radius: var(--nk-radius-lg);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}

.nk-sheet__head {
  align-items: flex-start;
  display: flex;
  flex-shrink: 0;
  gap: calc(var(--nk-space-unit) * 1.5);
  padding: calc(var(--nk-space-unit) * 3) calc(var(--nk-space-unit) * 3) 0;
}

.nk-sheet__texts {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) / 2);
  min-width: 0;
}

.nk-sheet__title-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-gap-inline);
}

.nk-sheet__title {
  color: var(--nk-text-title);
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 0;
}

/* avledet: ett hakk under body-rollen, som støttetekst i kort/paneler. */
.nk-sheet__subtitle {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.875);
  line-height: 1.45;
  margin: 0;
}

/* Kroppen er det eneste som ruller. Rullefeltet klipper ved sin egen
   padding-kant, og Vuetifys flytende etikett står over feltets ramme mens
   fokusrammen ligger utenfor den — derfor har kroppen luft øverst og i
   sidene som er større enn begge (SIGN-732), og sekundært en kvart enhet
   nederst for fokusrammer. Luften mellom hode og kropp ligger her (ikke
   som margin på hodet) så den ikke ruller bort. */
.nk-sheet__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 1.75);
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: calc(var(--nk-space-unit) * 2.5) calc(var(--nk-space-unit) * 3) var(--nk-space-unit);
}

/* Barn i den rullende kolonnen skal ha sin fulle høyde og la kroppen rulle —
   uten dette krymper flex-barn til plassen som er igjen og klipper resten
   (SIGN-681). */
.nk-sheet__body > :deep(*) {
  flex-shrink: 0;
}

.nk-sheet__body--last {
  padding-bottom: calc(var(--nk-space-unit) * 3);
}

.nk-sheet__actions {
  align-items: center;
  background: var(--nk-surface);
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
  justify-content: flex-end;
  padding: calc(var(--nk-space-unit) * 1.5) calc(var(--nk-space-unit) * 3) calc(var(--nk-space-unit) * 3);
}

/* Fullskjerm på mobil: ingen hjørner, hele høyden, og hode/handlingsrad
   holder unna safe-area øverst og nederst. */
.v-dialog > .v-overlay__content > .v-card.nk-sheet--fullscreen {
  border-radius: 0;
  height: 100%;
  max-height: none;
}

.nk-sheet--fullscreen .nk-sheet__head {
  padding-top: calc(var(--nk-space-unit) * 3 + env(safe-area-inset-top, 0px));
}

.nk-sheet--fullscreen .nk-sheet__actions {
  padding-bottom: calc(var(--nk-space-unit) * 3 + env(safe-area-inset-bottom, 0px));
}

.nk-sheet--fullscreen .nk-sheet__body--last {
  padding-bottom: calc(var(--nk-space-unit) * 3 + env(safe-area-inset-bottom, 0px));
}
</style>
