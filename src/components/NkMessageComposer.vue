<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatFileSize } from '../conversation'
import type { NkMessageComposerAttachments } from '../types/NkMessageComposerAttachments'
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
 * - Appen eier all tekst (`labels`, `error`).
 * - Vedlegg (SIGN-1317): med `attachments` og `labels.attach` får feltet en
 *   legg ved-knapp. Valgte filer står som merker over feltet og kan fjernes
 *   før sending; `send` får dem som andre argument. Appen avgjør i
 *   `attachments.validate` hva som tas imot, med sin egen tekst. En melding
 *   kan være filer alene. `#attachments` og `#prepend` finnes fortsatt for
 *   appens egne ting.
 */
interface Props {
  send: (text: string, files: File[]) => Promise<boolean>
  labels: NkMessageComposerLabels
  /** Vedlegg: grensene og teksten er appens (SIGN-1317). Uten verdi finnes ingen legg ved-knapp. */
  attachments?: NkMessageComposerAttachments
  /** Brukerens UI-språk, for størrelsen på valgte filer. */
  locale?: string
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
  attachments: undefined,
  locale: 'en',
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

/* --- Vedlegg (SIGN-1317) --- */
const picker = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const attachError = ref('')
const canAttach = computed(() => props.attachments !== undefined && props.labels.attach !== undefined)

function openPicker(): void {
  attachError.value = ''
  picker.value?.click()
}

/** Hver fil prøves for seg: de som tas imot legges til, den første som avvises gir teksten. */
function onPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''

  if (!props.attachments) {
    return
  }

  const accepted: File[] = []
  let refused = ''

  for (const file of picked) {
    const reason = props.attachments.validate(file, files.value.length + accepted.length)

    if (reason === null) {
      accepted.push(file)
    } else if (refused === '') {
      refused = reason
    }
  }

  files.value = props.attachments.multiple === false ? accepted.slice(0, 1) : [...files.value, ...accepted]
  attachError.value = refused
}

function removeFile(index: number): void {
  files.value = files.value.filter((_, i) => i !== index)
  attachError.value = ''
}

function sizeLabel(file: File): string {
  return formatFileSize(file.size, props.locale)
}

const shownError = computed(() => props.error || attachError.value)

const length = computed(() => draft.value.length)
const tooLong = computed(() => props.maxLength !== undefined && length.value > props.maxLength)
const nearLimit = computed(() => props.maxLength !== undefined && length.value >= props.maxLength * 0.8)
const hasContent = computed(() => draft.value.trim() !== '' || files.value.length > 0)
const canSend = computed(() => !props.disabled && !sending.value && hasContent.value && !tooLong.value)

async function submit(): Promise<void> {
  if (!canSend.value) {
    return
  }

  sending.value = true
  attachError.value = ''

  try {
    if (await props.send(draft.value.trim(), [...files.value])) {
      draft.value = ''
      files.value = []
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
    <div v-if="$slots.attachments || files.length > 0" class="nk-message-composer__attachments">
      <slot name="attachments" />
      <v-chip
        v-for="(file, index) in files"
        :key="`${file.name}-${file.size}-${index}`"
        class="nk-message-composer__file"
        closable
        :close-label="props.labels.removeAttachment ? `${props.labels.removeAttachment}: ${file.name}` : file.name"
        :disabled="props.disabled || sending"
        :prepend-icon="file.type.startsWith('image/') ? 'mdi-image-outline' : 'mdi-file-outline'"
        size="small"
        variant="tonal"
        @click:close="removeFile(index)"
      >
        <span class="nk-message-composer__file-name">{{ file.name }}</span>
        <span class="nk-message-composer__file-size">{{ sizeLabel(file) }}</span>
      </v-chip>
    </div>

    <div class="nk-message-composer__row">
      <slot name="prepend" />

      <template v-if="canAttach">
        <input
          ref="picker"
          :accept="props.attachments?.accept"
          class="nk-message-composer__picker"
          :multiple="props.attachments?.multiple !== false"
          tabindex="-1"
          type="file"
          @change="onPicked"
        >
        <v-btn
          class="nk-message-composer__attach"
          icon="mdi-paperclip"
          variant="text"
          :aria-label="props.labels.attach"
          :disabled="props.disabled || sending"
          :title="props.labels.attach"
          @click="openPicker"
        />
      </template>

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
        :error-messages="shownError"
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

.nk-message-composer__file {
  max-width: 100%;
}

.nk-message-composer__file-name {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-message-composer__file-size {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  margin-inline-start: calc(var(--nk-space-unit) / 2);
}

/* Filvelgeren åpnes fra knappen; selv er den ute av syne og ute av tab-rekkefølgen. */
.nk-message-composer__picker {
  height: 1px;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 1px;
}

.nk-message-composer__attach {
  flex: none;
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
