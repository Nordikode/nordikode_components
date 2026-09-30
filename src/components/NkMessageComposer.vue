<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NkMessageComposerLabels } from '../types/NkMessageComposerLabels'

/**
 * Delt skrivefelt for samtaler (SIGN-1313): et felt som vokser med teksten
 * og en send-knapp.
 *
 * - Enter sender, Shift+Enter gir ny linje. På berøringsskjerm gir Enter
 *   ny linje, og knappen sender. Enter mens et tegn settes sammen (IME)
 *   sender aldri.
 * - `send` er appens funksjon. Den svarer `true` når meldingen er tatt
 *   imot: da tømmes feltet. Ved `false` eller feil beholdes teksten, og
 *   appen viser årsaken i `error`.
 * - Feltet og knappen er sperret mens sendingen pågår.
 * - Appen eier all tekst (`labels`, `error`). Vedlegg legges i
 *   `#attachments` (over feltet) og `#prepend` (knapp foran feltet).
 */
interface Props {
  send: (text: string) => Promise<boolean>
  labels: NkMessageComposerLabels
  /** Utkastet, når appen vil eie det (v-model). Uten v-model holder feltet det selv. */
  modelValue?: string
  disabled?: boolean
  /** Lengste tillatte melding. Telleren vises når det nærmer seg, og for lang tekst kan ikke sendes. */
  maxLength?: number
  /** Feilmelding under feltet, f.eks. når sendingen feilet. */
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  disabled: false,
  maxLength: undefined,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const field = ref<{ focus: () => void } | null>(null)
const ownDraft = ref(props.modelValue ?? '')
const sending = ref(false)

watch(
  () => props.modelValue,
  (value) => {
    if (value !== undefined && value !== ownDraft.value) {
      ownDraft.value = value
    }
  },
)

const draft = computed({
  get: () => ownDraft.value,
  set: (value: string) => {
    ownDraft.value = value
    emit('update:modelValue', value)
  },
})

const length = computed(() => draft.value.length)
const tooLong = computed(() => props.maxLength !== undefined && length.value > props.maxLength)
const nearLimit = computed(() => props.maxLength !== undefined && length.value >= props.maxLength * 0.8)
const canSend = computed(() => !props.disabled && !sending.value && draft.value.trim() !== '' && !tooLong.value)

async function submit(): Promise<void> {
  if (!canSend.value) {
    return
  }

  sending.value = true

  try {
    if (await props.send(draft.value.trim())) {
      draft.value = ''
    }
  } catch {
    // Teksten beholdes. Appen viser årsaken i `error`.
  } finally {
    sending.value = false
    field.value?.focus()
  }
}

function usesTouch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

function onEnter(event: KeyboardEvent): void {
  if (event.shiftKey || event.isComposing || usesTouch()) {
    return
  }

  event.preventDefault()
  void submit()
}

defineExpose({ focus: () => field.value?.focus() })
</script>

<template>
  <form class="nk-message-composer" @submit.prevent="submit">
    <div v-if="$slots.attachments" class="nk-message-composer__attachments">
      <slot name="attachments" />
    </div>

    <div class="nk-message-composer__row">
      <slot name="prepend" />

      <v-textarea
        ref="field"
        v-model="draft"
        auto-grow
        class="nk-message-composer__field"
        density="comfortable"
        hide-details="auto"
        max-rows="8"
        rows="1"
        variant="outlined"
        :aria-label="props.labels.field"
        :counter="nearLimit ? props.maxLength : undefined"
        :disabled="props.disabled || sending"
        :error="tooLong"
        :error-messages="props.error"
        :placeholder="props.labels.field"
        @keydown.enter="onEnter"
      />

      <v-btn
        class="nk-message-composer__send"
        color="primary"
        icon="mdi-send"
        type="submit"
        variant="flat"
        :aria-label="props.labels.send"
        :disabled="!canSend"
        :loading="sending"
      />
    </div>
  </form>
</template>

<style scoped>
.nk-message-composer {
  display: flex;
  flex-direction: column;
  gap: var(--nk-space-unit);
  padding: calc(var(--nk-space-unit) * 1.5) 0;
}

.nk-message-composer__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-gap-inline);
}

/* Knappene står i høyde med feltets første linje, også når feltet vokser. */
.nk-message-composer__row {
  align-items: flex-start;
  display: flex;
  gap: var(--nk-gap-inline);
}

.nk-message-composer__field {
  flex: 1;
  min-width: 0;
}

.nk-message-composer__send {
  flex: none;
}
</style>
