<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import NkSheet from './NkSheet.vue'
import type { NkConfirmDialogTone } from '../types/NkConfirmDialogTone'

/**
 * Felles bekreftelsesdialog (SIGN-846, delen som kom fra SIGN-22): ett
 * spørsmål, en kort forklaring og to knapper. Bygger på NkSheet og NkDialog,
 * så spørsmålet er dialogens navn, forklaringen er beskrivelsen
 * (`role="alertdialog"` + `aria-describedby`), Esc avbryter og fokus går
 * tilbake dit brukeren kom fra.
 *
 * - **Teksten er appens** (i18n) og følger tone-regelen: tittelen er
 *   spørsmålet («Slette avdelingen «Montering»?»), bekreft-knappen sier
 *   handlingen i klartekst («Slett avdelingen» — aldri «OK»/«Ja»), og feilen
 *   er «Kunne ikke X.». Derfor har ingen av tekstene en standardverdi.
 * - **`confirm` lukker ikke dialogen.** Eieren utfører handlingen, viser
 *   `loading` imens og lukker selv når den er ferdig — eller setter `error`
 *   og lar dialogen stå. Avbryt, Esc og klikk utenfor sender `cancel` og
 *   lukker; mens `loading` står på, kan dialogen ikke lukkes.
 * - **Avbryt er en tekstknapp i appens egen knappefarge** (SIGN-1763), lik
 *   «Avbryt» i appens andre dialoger: ingen ramme og ingen egen farge.
 *   Handlingen er den fylte knappen.
 * - **Fokus starter på Avbryt**, så Enter aldri utfører en handling
 *   brukeren ikke har sett på. Fokus som settes fra kode, får i Safari
 *   tastaturmarkeringen også etter et museklikk. Derfor husker dialogen om
 *   den ble åpnet fra tastaturet, og skjuler markeringen på Avbryt ellers
 *   (SIGN-1763) — se `quietFocus` under.
 * - `tone="danger"` gir bekreft-knappen feilfargen. Det er appens valg om
 *   den har en rød handling i det hele tatt: Sign har ingen, der er
 *   handlingen alltid i handlingsfargen. Standard-slotten er for en kort
 *   oversikt over hva som berøres eller ett felt (begrunnelse) — ikke for
 *   skjemaer.
 */
interface Props {
  /** v-model. */
  modelValue?: boolean
  /** Spørsmålet — dialogens navn. */
  title: string
  /** Kort forklaring av konsekvensen — dialogens beskrivelse. */
  message?: string
  /** Handlingen i klartekst («Slett avdelingen»). */
  confirmLabel: string
  /** «Avbryt» fra appens i18n. */
  cancelLabel: string
  tone?: NkConfirmDialogTone
  /** Handlingen pågår: knappene låses og dialogen kan ikke lukkes. */
  loading?: boolean
  /** Bekreft-knappen er låst (f.eks. til en begrunnelse er skrevet). */
  confirmDisabled?: boolean
  /** Feilen fra forrige forsøk («Kunne ikke slette avdelingen.»). */
  error?: string
  /** Bredde på desktop. */
  maxWidth?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  message: '',
  tone: 'default',
  loading: false,
  confirmDisabled: false,
  error: '',
  maxWidth: 440,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const cancelButton = ref<{ $el?: HTMLElement } | null>(null)

// Fokusmarkeringen er for den som bruker tastaturet (Storybook
// «Tilgjengelighet» → «Fokusmarkering»: musebrukere skal ikke få ringen).
// Nettleseren avgjør det selv med `:focus-visible` når brukeren flytter
// fokus, men ikke når fokus settes fra kode: Safari tegner da Vuetifys fyll
// og ring på Avbryt også etter et museklikk. Dialogen spør derfor elementet
// som hadde fokus i det den åpnet: traff det `:focus-visible`, kom brukeren
// fra tastaturet og får markeringen. Ellers er den skjult til brukeren tar
// i tastaturet eller flytter fokus — fra da av bestemmer nettleseren igjen.
const openedFromKeyboard = ref(false)
const quietFocus = ref(false)

const focusIsFromKeyboard = (): boolean => {
  if (typeof document === 'undefined') return false
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active === document.body) return false
  try {
    return active.matches(':focus-visible')
  } catch {
    // Nettleseren kjenner ikke `:focus-visible`: vis heller markeringen for
    // alle enn å skjule den for noen som trenger den.
    return true
  }
}

// `sync`: elementet som åpnet dialogen, må leses før Vuetify flytter fokus inn.
watch(
  () => props.modelValue,
  (open) => {
    openedFromKeyboard.value = open && focusIsFromKeyboard()
    quietFocus.value = open && !openedFromKeyboard.value
  },
  { flush: 'sync', immediate: true },
)

const showFocus = () => {
  quietFocus.value = false
}

const focusCancel = () => {
  // Settes på nytt her: fokus kan ha vært innom Avbryt og videre mens
  // dialogen kom inn, og da har `blur` alt slått markeringen på.
  quietFocus.value = !openedFromKeyboard.value
  void nextTick(() => cancelButton.value?.$el?.focus?.({ preventScroll: true }))
}

// Avbryt-knappen, Esc og klikk utenfor ender alle her.
const onUpdate = (value: boolean) => {
  if (value) {
    emit('update:modelValue', true)
    return
  }
  if (props.loading) return
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <NkSheet
    :fullscreen-on-mobile="false"
    :max-width="props.maxWidth"
    :model-value="props.modelValue"
    :persistent="props.loading"
    role="alertdialog"
    :title="props.title"
    @after-enter="focusCancel"
    @update:model-value="onUpdate"
  >
    <p v-if="props.message !== ''" class="nk-confirm__message" data-nk-dialog-description>{{ props.message }}</p>
    <slot />
    <v-alert v-if="props.error !== ''" density="compact" role="alert" type="error" variant="tonal">
      {{ props.error }}
    </v-alert>

    <template #actions>
      <v-btn
        ref="cancelButton"
        class="nk-confirm__cancel"
        :class="{ 'nk-confirm__cancel--quiet-focus': quietFocus }"
        :disabled="props.loading"
        variant="text"
        @blur="showFocus"
        @click="onUpdate(false)"
        @keydown="showFocus"
      >
        {{ props.cancelLabel }}
      </v-btn>
      <v-btn
        class="nk-confirm__confirm"
        :color="props.tone === 'danger' ? 'error' : undefined"
        :disabled="props.confirmDisabled"
        :loading="props.loading"
        @click="emit('confirm')"
      >
        {{ props.confirmLabel }}
      </v-btn>
    </template>
  </NkSheet>
</template>

<style scoped>
.nk-confirm__message {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-body);
  line-height: 1.5;
  margin: 0;
}

/* Dialogen ble åpnet med mus eller berøring, og fokus er satt på Avbryt fra
   kode: Vuetifys tastaturmarkering (fyllet i `.v-btn__overlay` og ringen i
   `::after`) skjules. Klassen står bare til brukeren trykker en tast eller
   flytter fokus, så den som bruker tastaturet, alltid ser hvor fokus er
   (WCAG 2.4.7). Fyllet under musepekeren er Vuetifys eget og står urørt. */
.nk-confirm__cancel--quiet-focus:focus-visible::after,
.nk-confirm__cancel--quiet-focus:focus-visible:not(:hover) > :deep(.v-btn__overlay) {
  opacity: 0;
}
</style>
