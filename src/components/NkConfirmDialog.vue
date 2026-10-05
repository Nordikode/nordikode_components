<script setup lang="ts">
import { nextTick, ref } from 'vue'
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
 * - **Fokus starter på Avbryt**, så Enter aldri utfører en handling
 *   brukeren ikke har sett på.
 * - `tone="danger"` er for det som ikke kan angres: bekreft-knappen får
 *   feilfargen. Standard-slotten er for en kort oversikt over hva som
 *   berøres eller ett felt (begrunnelse) — ikke for skjemaer.
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

const focusCancel = () => {
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
        color="default"
        :disabled="props.loading"
        variant="outlined"
        @click="onUpdate(false)"
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
</style>
