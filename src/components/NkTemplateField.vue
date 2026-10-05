<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { missingTemplatePlaceholders, parseTemplate, templateToken } from '../template'
import type { NkTemplateFieldLabels } from '../types/NkTemplateFieldLabels'
import type { NkTemplatePlaceholder } from '../types/NkTemplatePlaceholder'

/**
 * Felt for tekster med plassholdere (SIGN-1465): SMS-maler og andre tekster
 * kunden møter. Plassholderne skrives aldri for hånd.
 *
 * - Under feltet står én knapp per plassholder; et trykk setter den inn der
 *   markøren står (ellers på slutten).
 * - I feltet vises en plassholder som en brikke med navnet, ikke `{link}`.
 *   Brikken kan ikke redigeres innvendig og slettes som ett tegn med
 *   Backspace/Delete. Skriver eller limer brukeren inn `{link}`, blir det
 *   en brikke.
 * - `v-model` er lagringsformatet, uendret: teksten med `{key}`. Bare
 *   nøklene i `placeholders` blir brikker; en ukjent `{…}` er tekst.
 * - En plassholder med `missingMessage` er obligatorisk: mangler den i en
 *   tekst som ikke er tom, vises meldingen ved feltet. Appen stopper
 *   lagringen med `missingTemplatePlaceholders()` — samme regel.
 * - Appen eier all tekst (`labels`, plassholdernes `label`/`missingMessage`,
 *   `hint`, `emptyText`) og listen over plassholdere (data, typisk nøklene i
 *   standardmalen).
 * - `maxLength` teller lagringsformatet, som er det backend validerer.
 */
interface Props {
  modelValue: string
  placeholders: NkTemplatePlaceholder[]
  labels: NkTemplateFieldLabels
  /** Hjelpetekst under feltet. */
  hint?: string
  /** Vises når feltet er tomt (f.eks. standardteksten); plassholderne i den vises som brikker. */
  emptyText?: string
  maxLength?: number
  /** Høyden på det tomme feltet, i linjer. Feltet vokser med teksten. */
  rows?: number
  disabled?: boolean
  /** Appens egne feil, vist sammen med manglende plassholdere. */
  errorMessages?: string | string[]
}

const props = withDefaults(defineProps<Props>(), {
  hint: undefined,
  emptyText: undefined,
  maxLength: undefined,
  rows: 2,
  disabled: false,
  errorMessages: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()
const messagesId = `${id}-messages`
const editor = ref<HTMLDivElement | null>(null)
const focused = ref(false)

// Det feltet sist sendte ut; en v-model-endring utenfra tegner feltet på nytt.
let current = props.modelValue ?? ''
const value = ref(current)

// Markøren som tegn i lagringsformatet, husket når feltet mister fokus,
// så en knapp setter inn der brukeren var.
let savedSelection: [number, number] | null = null

const keys = computed(() => props.placeholders.map((placeholder) => placeholder.key))
const labelFor = (key: string): string => props.placeholders.find((placeholder) => placeholder.key === key)?.label ?? key

const isEmpty = computed(() => value.value === '')
const emptySegments = computed(() => (props.emptyText ? parseTemplate(props.emptyText, keys.value) : []))
const missing = computed(() => missingTemplatePlaceholders(value.value, props.placeholders))
const tooLong = computed(() => props.maxLength !== undefined && value.value.length > props.maxLength)
const shownErrors = computed(() => [
  ...(Array.isArray(props.errorMessages) ? props.errorMessages : [props.errorMessages]).filter((message) => message !== ''),
  ...missing.value.map((placeholder) => placeholder.missingMessage as string),
])
const hasError = computed(() => shownErrors.value.length > 0 || tooLong.value)
const active = computed(() => focused.value || !isEmpty.value || Boolean(props.emptyText))

/* --- Lagringsformat ⇄ DOM --- */

const isChip = (node: Node): node is HTMLElement => node instanceof HTMLElement && node.dataset.nkPlaceholder !== undefined

// Den siste <br> i feltet er bare der så markøren kan stå på en tom siste linje.
const isTrailingBreak = (node: Node): boolean => node.nodeName === 'BR' && node === editor.value?.lastChild

function serialize(parent: Node): string {
  let out = ''

  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? '').replace(/ /g, ' ')
    } else if (isChip(node)) {
      out += templateToken(node.dataset.nkPlaceholder as string)
    } else if (node.nodeName === 'BR') {
      out += isTrailingBreak(node) ? '' : '\n'
    } else {
      // Blokker nettleseren selv har laget (div/p) er linjeskift.
      if (out !== '' && !out.endsWith('\n')) {
        out += '\n'
      }
      out += serialize(node)
    }
  }

  return out
}

function nodeLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0
  }
  if (isChip(node)) {
    return templateToken(node.dataset.nkPlaceholder as string).length
  }
  if (node.nodeName === 'BR') {
    return isTrailingBreak(node) ? 0 : 1
  }
  return serialize(node).length
}

function chipNode(key: string): HTMLElement {
  const chip = document.createElement('span')
  chip.className = 'nk-template-field__chip'
  chip.contentEditable = 'false'
  chip.dataset.nkPlaceholder = key
  chip.textContent = labelFor(key)
  return chip
}

function render(text: string): void {
  const el = editor.value
  if (!el) {
    return
  }

  el.replaceChildren(
    ...parseTemplate(text, keys.value).map((segment) =>
      segment.kind === 'text' ? document.createTextNode(segment.text) : chipNode(segment.key),
    ),
    document.createElement('br'),
  )
}

/** Hvor (node, offset) ligger, som tegn i lagringsformatet. */
function offsetOf(container: Node, offset: number): number {
  const el = editor.value as HTMLDivElement
  const range = document.createRange()
  range.setStart(el, 0)
  range.setEnd(container, offset)
  return serialize(range.cloneContents()).length
}

function selectionOffsets(): [number, number] | null {
  const el = editor.value
  const selection = window.getSelection()
  if (!el || !selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
    return null
  }

  return [offsetOf(range.startContainer, range.startOffset), offsetOf(range.endContainer, range.endOffset)]
}

function placeCaret(offset: number): void {
  const el = editor.value
  const selection = window.getSelection()
  if (!el || !selection) {
    return
  }

  const range = document.createRange()
  let remaining = offset
  let placed = false

  for (const node of Array.from(el.childNodes)) {
    const isText = node.nodeType === Node.TEXT_NODE
    if (remaining === 0 && !isText) {
      range.setStartBefore(node)
      placed = true
      break
    }

    const length = nodeLength(node)
    if (isText && remaining <= length) {
      range.setStart(node, remaining)
      placed = true
      break
    }
    if (!isText && remaining < length) {
      range.setStartAfter(node)
      placed = true
      break
    }
    remaining -= length
  }

  if (!placed) {
    range.selectNodeContents(el)
    range.collapse(false)
  }

  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

function commit(text: string): void {
  current = text
  value.value = text
  emit('update:modelValue', text)
}

/** Erstatter tegnene [start, end) i lagringsformatet og setter markøren etter. */
function splice(start: number, end: number, text: string): void {
  const next = current.slice(0, start) + text + current.slice(end)
  render(next)
  commit(next)
  editor.value?.focus()
  placeCaret(start + text.length)
  savedSelection = [start + text.length, start + text.length]
}

/* --- Hendelser --- */

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) {
    return
  }
  syncFromDom()
}

function syncFromDom(): void {
  const el = editor.value
  if (!el) {
    return
  }

  const text = serialize(el)
  const chips = el.querySelectorAll('[data-nk-placeholder]').length
  const tokens = parseTemplate(text, keys.value).filter((segment) => segment.kind === 'placeholder').length

  // Skrevet eller limt inn `{link}` blir brikke; en <br> nettleseren har
  // fjernet, legges tilbake.
  if (chips !== tokens || el.lastChild?.nodeName !== 'BR') {
    const caret = selectionOffsets()?.[0] ?? text.length
    render(text)
    placeCaret(caret)
  }

  if (text !== current) {
    commit(text)
  }

  onSelectionChange()
}

function onBeforeInput(event: InputEvent): void {
  const type = event.inputType

  if (type.startsWith('format') || type === 'insertFromDrop') {
    event.preventDefault()
    return
  }

  // Linjeskift som tekst, ikke blokker — også fra mobiltastaturer.
  if (type === 'insertParagraph' || type === 'insertLineBreak') {
    event.preventDefault()
    const offsets = selectionOffsets()
    if (offsets) {
      splice(offsets[0], offsets[1], '\n')
    }
  }
}

function onPaste(event: ClipboardEvent): void {
  event.preventDefault()
  const text = (event.clipboardData?.getData('text/plain') ?? '').replace(/\r\n?/g, '\n')
  const offsets = selectionOffsets()
  if (offsets && text !== '') {
    splice(offsets[0], offsets[1], text)
  }
}

// En brikke er ett tegn: Backspace rett etter (Delete rett før) fjerner hele.
function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing || (event.key !== 'Backspace' && event.key !== 'Delete')) {
    return
  }

  const offsets = selectionOffsets()
  if (!offsets || offsets[0] !== offsets[1]) {
    return
  }

  const caret = offsets[0]
  for (const key of keys.value) {
    const token = templateToken(key)
    if (event.key === 'Backspace' && current.slice(0, caret).endsWith(token)) {
      event.preventDefault()
      splice(caret - token.length, caret, '')
      return
    }
    if (event.key === 'Delete' && current.slice(caret).startsWith(token)) {
      event.preventDefault()
      splice(caret, caret + token.length, '')
      return
    }
  }
}

function onSelectionChange(): void {
  const offsets = selectionOffsets()
  if (offsets) {
    savedSelection = offsets
  }
}

function insert(key: string): void {
  // Markøren der den står nå (knappen tar ikke fokus fra feltet med mus),
  // ellers der den sto da feltet mistet fokus (tastatur), ellers på slutten.
  const [start, end] = selectionOffsets() ?? savedSelection ?? [current.length, current.length]
  splice(Math.min(start, current.length), Math.min(end, current.length), templateToken(key))
}

function focusEditor(): void {
  const el = editor.value
  if (!el || props.disabled || el.contains(document.activeElement)) {
    return
  }
  el.focus()
  placeCaret(savedSelection?.[1] ?? current.length)
}

watch(
  () => props.modelValue,
  (next) => {
    if ((next ?? '') !== current) {
      current = next ?? ''
      value.value = current
      render(current)
    }
  },
)

watch(keys, () => render(current))

onMounted(() => {
  render(current)
  document.addEventListener('selectionchange', onSelectionChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
})

defineExpose({ focus: focusEditor })
</script>

<template>
  <v-input
    :id="id"
    class="nk-template-field"
    :disabled="props.disabled"
    :error="hasError"
    :error-messages="shownErrors"
    :focused="focused"
    hide-details="auto"
    :hint="props.hint"
    persistent-hint
  >
    <div class="nk-template-field__body">
      <v-field
        :active="active"
        bg-color="transparent"
        color="primary"
        density="comfortable"
        :dirty="!isEmpty"
        :disabled="props.disabled"
        :error="hasError"
        :focused="focused"
        :label="props.labels.field"
        variant="outlined"
        @click:control="focusEditor"
      >
        <div class="v-field__input nk-template-field__control">
          <div
            ref="editor"
            :aria-describedby="messagesId"
            :aria-disabled="props.disabled || undefined"
            :aria-invalid="hasError || undefined"
            :aria-label="props.labels.field"
            aria-multiline="true"
            class="nk-template-field__editor"
            :contenteditable="props.disabled ? 'false' : 'true'"
            role="textbox"
            spellcheck="true"
            :style="{ minHeight: `calc(${props.rows} * 1.5em)` }"
            @beforeinput="onBeforeInput"
            @blur="focused = false"
            @compositionend="syncFromDom"
            @drop.prevent
            @focus="focused = true"
            @input="onInput"
            @keydown="onKeydown"
            @keyup="onSelectionChange"
            @mouseup="onSelectionChange"
            @paste="onPaste"
          />
          <div v-if="isEmpty && emptySegments.length > 0" aria-hidden="true" class="nk-template-field__empty">
            <template v-for="(segment, index) in emptySegments" :key="index">
              <span v-if="segment.kind === 'placeholder'" class="nk-template-field__chip">{{ labelFor(segment.key) }}</span>
              <template v-else>{{ segment.text }}</template>
            </template>
          </div>
        </div>
      </v-field>

      <div v-if="props.placeholders.length > 0" :aria-label="props.labels.insert" class="nk-template-field__insert" role="group">
        <v-btn
          v-for="placeholder in props.placeholders"
          :key="placeholder.key"
          class="text-none"
          :disabled="props.disabled"
          prepend-icon="mdi-plus"
          size="small"
          variant="tonal"
          @click="insert(placeholder.key)"
          @mousedown.prevent
        >
          {{ placeholder.label }}
        </v-btn>
      </div>
    </div>

    <template v-if="props.maxLength !== undefined" #details>
      <v-counter active :max="props.maxLength" :value="value.length" />
    </template>
  </v-input>
</template>

<style scoped>
.nk-template-field__body {
  display: flex;
  flex-direction: column;
  gap: var(--nk-space-unit);
  min-width: 0;
  width: 100%;
}

.nk-template-field__body > .v-field {
  width: 100%;
}

.nk-template-field__control {
  position: relative;
}

.nk-template-field__editor {
  line-height: 1.5;
  outline: none;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  width: 100%;
}

.nk-template-field__empty {
  color: var(--nk-text-secondary);
  inset: 0;
  line-height: 1.5;
  padding: inherit;
  pointer-events: none;
  position: absolute;
  white-space: pre-wrap;
}

.nk-template-field :deep(.v-input__details) {
  padding-inline: calc(var(--nk-space-unit) * 2);
}

.nk-template-field__insert {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-gap-inline);
}

.nk-template-field :deep(.nk-template-field__chip),
.nk-template-field__chip {
  background: var(--nk-muted-soft);
  border-radius: var(--nk-radius-pill);
  color: var(--nk-on-muted-soft);
  cursor: default;
  font-size: 0.875em;
  font-weight: 500;
  margin: 0 calc(var(--nk-space-unit) * 0.25);
  padding: 0 var(--nk-space-unit);
  user-select: all;
  white-space: nowrap;
}

.nk-template-field__empty .nk-template-field__chip {
  opacity: 0.7;
}
</style>
