<script setup lang="ts">
/**
 * Telefonfeltet med landvelger for webflatene uten Vuetify (nettsiden) —
 * samme oppførsel som `PhoneNumberInput` i hovedinngangen, fordi de to deler
 * logikken i `usePhoneNumberField` (SIGN-1301).
 *
 * Landet kommer fra verts-appen (`defaultCountryCode`: brukerens, firmaets
 * eller markedets land). Uten land står velgeren tom, og brukeren velger
 * land i menyen eller skriver nummeret med +landkode. Verdien ut er nummeret
 * i internasjonal form (E.164) så snart land og nummer er kjent.
 *
 * Ren presentasjon: etiketten over feltet og feilmeldingen under eier
 * verts-appen (`id` kobler `<label for>`; `invalid` gir rød ramme). Alle
 * tekster kommer som `labels` fra verts-appens oversettelser.
 *
 * Tema: verts-appens web-designtokens (`--color-*`, `--radius-*`).
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CountryCode } from 'libphonenumber-js/min'
import { usePhoneNumberField } from '../phone/usePhoneNumberField'

export type PhoneNumberFieldLabels = {
  /** aria-label på landknappen og på søkefeltet i menyen, f.eks. «Landkode». */
  country: string
  /** Plassholder i søkefeltet, f.eks. «Søk etter land». */
  search: string
  /** Vises når søket ikke gir treff. */
  noResults: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    /** ISO 3166-1 alpha-2 fra bruker, firma eller marked. Null = tom velger. */
    defaultCountryCode?: string | null
    /** Brukerens UI-språk — landnavnene vises i det. */
    locale?: string | null
    labels: PhoneNumberFieldLabels
    /** id på selve nummerfeltet, så verts-appens `<label for>` treffer. */
    id?: string
    name?: string
    disabled?: boolean
    required?: boolean
    /** Rød ramme og `aria-invalid` — verts-appen viser selv meldingen. */
    invalid?: boolean
    /** id på verts-appens feilmelding/hjelpetekst. */
    describedBy?: string
  }>(),
  {
    modelValue: '',
    defaultCountryCode: null,
    locale: null,
    id: undefined,
    name: undefined,
    disabled: false,
    required: false,
    invalid: false,
    describedBy: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Brukeren endret nummeret eller landet (ikke når verdien settes utenfra). */
  input: []
}>()

const {
  selectedCountry,
  nationalInput,
  countrySearch,
  selectedCountryOption,
  filteredCountryOptions,
  selectCountry,
} = usePhoneNumberField({
  modelValue: () => props.modelValue,
  defaultCountryCode: () => props.defaultCountryCode,
  locale: () => props.locale,
  emit: (value) => emit('update:modelValue', value),
})

const CHEVRON = 'm6 9 6 6 6-6'

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const numberEl = ref<HTMLInputElement | null>(null)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) void nextTick(() => searchEl.value?.focus())
}

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  countrySearch.value = ''
  if (returnFocus) trigger.value?.focus()
}

function choose(countryCode: CountryCode) {
  selectCountry(countryCode)
  open.value = false
  emit('input')
  // Etter valg av land er neste naturlige steg å skrive nummeret.
  void nextTick(() => numberEl.value?.focus())
}

function optionEls(): HTMLElement[] {
  return Array.from(listEl.value?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
}

function focusOption(index: number) {
  const items = optionEls()
  if (items.length === 0) return
  const target = ((index % items.length) + items.length) % items.length
  items[target]?.focus()
}

function onSearchKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusOption(0)
      break
    case 'Enter': {
      // Enter i søket velger første treff — og sender aldri inn skjemaet rundt.
      event.preventDefault()
      const first = filteredCountryOptions.value[0]
      if (first) choose(first.value)
      break
    }
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}

function onListKeydown(event: KeyboardEvent) {
  const items = optionEls()
  const current = items.indexOf(document.activeElement as HTMLElement)
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusOption(current + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (current <= 0) searchEl.value?.focus()
      else focusOption(current - 1)
      break
    case 'Home':
      event.preventDefault()
      focusOption(0)
      break
    case 'End':
      event.preventDefault()
      focusOption(items.length - 1)
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="nk-phone" :class="{ 'nk-phone--invalid': invalid, 'nk-phone--disabled': disabled }">
    <div class="nk-phone__frame">
      <button
        ref="trigger"
        type="button"
        class="nk-phone__trigger"
        :aria-label="selectedCountryOption ? `${labels.country}: ${selectedCountryOption.subtitle} ${selectedCountryOption.title}` : labels.country"
        :aria-expanded="open"
        aria-haspopup="listbox"
        :disabled="disabled"
        @click="toggle"
      >
        <span v-if="selectedCountryOption" class="nk-phone__flag" aria-hidden="true">{{ selectedCountryOption.flag }}</span>
        <span class="nk-phone__code">{{ selectedCountryOption?.title ?? '+' }}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          class="nk-phone__chevron"
          :class="{ 'nk-phone__chevron--open': open }"
          aria-hidden="true"
        >
          <path :d="CHEVRON" />
        </svg>
      </button>

      <span class="nk-phone__divider" aria-hidden="true" />

      <input
        :id="id"
        ref="numberEl"
        v-model="nationalInput"
        class="nk-phone__number"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        :name="name"
        :disabled="disabled"
        :required="required"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        @input="emit('input')"
      />
    </div>

    <Transition name="nk-pop">
      <div v-if="open" class="nk-phone__panel">
        <input
          ref="searchEl"
          v-model="countrySearch"
          class="nk-phone__search"
          type="search"
          autocomplete="off"
          :aria-label="labels.country"
          :placeholder="labels.search"
          @keydown="onSearchKeydown"
        />

        <div ref="listEl" role="listbox" class="nk-phone__list" :aria-label="labels.country" @keydown="onListKeydown">
          <button
            v-for="option in filteredCountryOptions"
            :key="option.value"
            type="button"
            role="option"
            class="nk-phone__option"
            :class="{ 'nk-phone__option--current': option.value === selectedCountry }"
            :aria-selected="option.value === selectedCountry"
            @click="choose(option.value)"
          >
            <span class="nk-phone__flag" aria-hidden="true">{{ option.flag }}</span>
            <span class="nk-phone__option-code">{{ option.title }}</span>
            <span class="nk-phone__option-country">{{ option.subtitle }}</span>
          </button>

          <p v-if="filteredCountryOptions.length === 0" class="nk-phone__empty">{{ labels.noResults }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nk-phone {
  position: relative;
  min-width: 0;
}

.nk-phone__frame {
  display: flex;
  align-items: stretch;
  min-width: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-compact);
  background: var(--color-surface-raised);
  color: var(--color-ink);
  transition: border-color 0.15s;
}

.nk-phone__frame:focus-within {
  border-color: var(--color-action);
}

.nk-phone--invalid .nk-phone__frame {
  border-color: var(--color-error);
}

.nk-phone--disabled .nk-phone__frame {
  opacity: 0.6;
}

.nk-phone__trigger {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.375rem;
  border: 0;
  border-radius: var(--radius-compact) 0 0 var(--radius-compact);
  background: transparent;
  padding: 0.5rem 0.5rem 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  color: inherit;
  cursor: pointer;
}

.nk-phone__trigger:focus-visible {
  outline: 2px solid var(--color-action);
  outline-offset: -2px;
}

.nk-phone__trigger:disabled {
  cursor: default;
}

.nk-phone__code {
  font-weight: 600;
  white-space: nowrap;
}

.nk-phone__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--color-ink-secondary);
  transition: transform 0.15s;
}

.nk-phone__chevron--open {
  transform: rotate(180deg);
}

.nk-phone__divider {
  flex-shrink: 0;
  width: 1px;
  margin: 0.375rem 0;
  background: var(--color-line);
}

.nk-phone__number {
  flex: 1;
  min-width: 0;
  border: 0;
  border-radius: 0 var(--radius-compact) var(--radius-compact) 0;
  background: transparent;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  color: inherit;
  outline: none;
}

.nk-phone__panel {
  position: absolute;
  inset-inline-start: 0;
  top: 100%;
  z-index: 50;
  margin-top: 0.5rem;
  width: min(20rem, calc(100vw - 2rem));
  transform-origin: top left;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard);
  background: var(--color-surface-raised);
  padding: 0.375rem;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.nk-phone__search {
  width: 100%;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-compact);
  background: var(--color-surface-raised);
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  color: var(--color-ink);
  outline: none;
}

.nk-phone__search:focus {
  border-color: var(--color-action);
}

.nk-phone__list {
  max-height: 16rem;
  margin-top: 0.375rem;
  overflow-y: auto;
}

.nk-phone__option {
  display: grid;
  width: 100%;
  grid-template-columns: 1.5rem 3.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  border: 0;
  border-radius: var(--radius-compact);
  background: transparent;
  padding: 0.5rem 0.75rem;
  text-align: start;
  font: inherit;
  font-size: 0.875rem;
  color: var(--color-ink-secondary);
  cursor: pointer;
  outline: none;
}

.nk-phone__option:hover,
.nk-phone__option:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-phone__option--current {
  font-weight: 500;
  color: var(--color-ink);
}

.nk-phone__option-code {
  font-weight: 600;
  white-space: nowrap;
  color: var(--color-ink);
}

.nk-phone__option-country {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-phone__empty {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-ink-secondary);
}

.nk-pop-enter-active {
  transition:
    transform 0.1s ease-out,
    opacity 0.1s ease-out;
}

.nk-pop-leave-active {
  transition:
    transform 75ms ease-in,
    opacity 75ms ease-in;
}

.nk-pop-enter-from,
.nk-pop-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nk-phone__frame,
  .nk-phone__chevron,
  .nk-pop-enter-active,
  .nk-pop-leave-active {
    transition: none;
  }
}
</style>
