<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'
import type { SharedLocale } from '../types/SharedLocale'

interface Props {
  modelValue?: string | null
  defaultCountryCode?: string | null
  locale?: SharedLocale | null
  disabled?: boolean
  required?: boolean
  countryLabel?: string | null
  numberLabel?: string | null
  countryPlaceholder?: string | null
  placeholder?: string | null
  requiredMessage?: string | null
  invalidMessage?: string | null
  noResultsMessage?: string | null
}

interface CountryOption {
  title: string
  value: CountryCode
  subtitle: string
  flag: string
  search: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  defaultCountryCode: null,
  locale: 'en',
  disabled: false,
  required: false,
  countryLabel: 'Country',
  numberLabel: 'Phone number',
  countryPlaceholder: 'Select country',
  placeholder: '',
  requiredMessage: 'Phone number is required.',
  invalidMessage: 'Enter a valid phone number.',
  noResultsMessage: 'No matching country code.',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fallbackCountryCode: CountryCode = 'NO'
const selectedCountry = ref<CountryCode>(resolveCountryCode(props.defaultCountryCode) ?? fallbackCountryCode)
const nationalInput = ref('')
const applyingExternalValue = ref(false)
const countryMenuOpen = ref(false)
const countrySearch = ref('')

const intlLocale = computed(() => resolveIntlLocale(props.locale))
const regionNames = computed(() => {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') {
    return null
  }

  return new Intl.DisplayNames([intlLocale.value], { type: 'region' })
})

const countryOptions = computed<CountryOption[]>(() => {
  return getCountries()
    .map((countryCode) => {
      const countryName = regionNames.value?.of(countryCode) ?? countryCode
      const callingCode = `+${getCountryCallingCode(countryCode)}`
      const flag = countryCodeToFlag(countryCode)

      return {
        title: callingCode,
        value: countryCode,
        subtitle: countryName,
        flag,
        search: `${countryName} ${countryCode} ${callingCode} ${flag}`,
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title, intlLocale.value))
})

const selectedCountryOption = computed<CountryOption | null>(() => {
  return countryOptions.value.find((option) => option.value === selectedCountry.value) ?? null
})
const filteredCountryOptions = computed(() => {
  const query = countrySearch.value.trim().toLowerCase()

  if (query === '') {
    return countryOptions.value
  }

  return countryOptions.value.filter((option) => option.search.toLowerCase().includes(query))
})

const normalizedNumberRules = computed(() => {
  const rules = []

  if (props.required) {
    rules.push((value: string) => value.trim().length > 0 || props.requiredMessage)
  }

  rules.push((value: string) => {
    const trimmed = value.trim()
    if (trimmed === '') {
      return true
    }

    return isValidPhoneNumber(trimmed, selectedCountry.value) || props.invalidMessage
  })

  return rules
})

watch(
  () => props.defaultCountryCode,
  (value) => {
    if (props.modelValue?.trim()) {
      return
    }

    const nextCountry = resolveCountryCode(value)
    if (nextCountry) {
      selectedCountry.value = nextCountry
    }
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (value) => {
    applyingExternalValue.value = true
    syncFromModelValue(value ?? '')
    applyingExternalValue.value = false
  },
  { immediate: true },
)

watch(selectedCountry, () => {
  emitNormalizedValue()
})

watch(nationalInput, (value) => {
  const trimmed = value.trim()
  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed)
    if (parsed?.country) {
      selectedCountry.value = parsed.country
      nationalInput.value = formatNationalNumber(parsed.nationalNumber, parsed.country)
      return
    }
  }

  emitNormalizedValue()
})

function syncFromModelValue(value: string): void {
  const trimmed = value.trim()

  if (trimmed === '') {
    nationalInput.value = ''
    return
  }

  const parsed = parsePhoneNumberFromString(trimmed)
  if (parsed) {
    if (parsed.country) {
      selectedCountry.value = parsed.country
    }

    nationalInput.value = formatNationalNumber(parsed.nationalNumber, parsed.country ?? selectedCountry.value)
    return
  }

  nationalInput.value = trimmed
}

function emitNormalizedValue(): void {
  if (applyingExternalValue.value) {
    return
  }

  const trimmed = nationalInput.value.trim()
  if (trimmed === '') {
    emit('update:modelValue', '')
    return
  }

  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed)
    emit('update:modelValue', parsed?.number ?? trimmed)
    return
  }

  const parsed = parsePhoneNumberFromString(trimmed, selectedCountry.value)
  if (parsed) {
    emit('update:modelValue', parsed.number)
    return
  }

  const digits = trimmed.replace(/[^\d]/g, '')
  if (digits === '') {
    emit('update:modelValue', '')
    return
  }

  emit('update:modelValue', `+${getCountryCallingCode(selectedCountry.value)}${digits}`)
}

function resolveCountryCode(value: string | null | undefined): CountryCode | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toUpperCase()

  return isSupportedCountry(normalized) ? normalized : null
}

function resolveIntlLocale(locale: SharedLocale | null): string {
  switch (locale) {
    case 'no':
      return 'nb-NO'
    case 'sv':
      return 'sv-SE'
    case 'fr':
      return 'fr-FR'
    case 'pl':
      return 'pl-PL'
    default:
      return 'en-GB'
  }
}

function countryCodeToFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

function formatNationalNumber(value: string, countryCode: CountryCode): string {
  return new AsYouType(countryCode).input(value)
}

function isValidPhoneNumber(value: string, countryCode: CountryCode): boolean {
  const parsed = value.startsWith('+')
    ? parsePhoneNumberFromString(value)
    : parsePhoneNumberFromString(value, countryCode)

  return parsed?.isValid() ?? false
}

function getItemTitle(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    const raw = 'raw' in item ? (item as { raw?: CountryOption }).raw : undefined
    const title = raw?.title ?? ('title' in item ? (item as { title?: string }).title : undefined)
    return title ?? ''
  }

  return ''
}

function getItemSubtitle(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    const raw = 'raw' in item ? (item as { raw?: CountryOption }).raw : undefined
    const subtitle = raw?.subtitle ?? ('subtitle' in item ? (item as { subtitle?: string }).subtitle : undefined)
    return subtitle ?? ''
  }

  return ''
}

function getItemFlag(item: unknown): string {
  if (typeof item === 'object' && item !== null) {
    const raw = 'raw' in item ? (item as { raw?: CountryOption }).raw : undefined
    const flag = raw?.flag ?? ('flag' in item ? (item as { flag?: string }).flag : undefined)
    return flag ?? ''
  }

  return ''
}

function selectCountry(countryCode: CountryCode): void {
  selectedCountry.value = countryCode
  countryMenuOpen.value = false
  countrySearch.value = ''
}
</script>

<template>
  <div class="phone-input-layout">
    <v-text-field
      v-model="nationalInput"
      class="phone-input-number"
      :disabled="disabled"
      :label="numberLabel ?? undefined"
      :placeholder="placeholder ?? undefined"
      :rules="normalizedNumberRules"
    >
      <template #prepend-inner>
        <div class="phone-input-prefix">
          <v-menu
            v-model="countryMenuOpen"
            :close-on-content-click="false"
            location="bottom start"
            offset="8"
          >
            <template #activator="{ props: activatorProps }">
              <button
                v-bind="activatorProps"
                :aria-label="countryLabel ?? undefined"
                class="phone-input-country-trigger"
                type="button"
              >
                <span class="phone-input-selected-flag">{{ selectedCountryOption?.flag ?? '' }}</span>
                <span class="phone-input-selected-code">{{ selectedCountryOption?.title ?? '' }}</span>
                <v-icon icon="mdi-chevron-down" size="18" />
              </button>
            </template>

            <div class="phone-input-menu">
              <v-text-field
                v-model="countrySearch"
                :label="countryLabel ?? undefined"
                :placeholder="countryPlaceholder ?? undefined"
                prepend-inner-icon="mdi-magnify"
              />

              <v-list class="phone-input-list">
                <v-list-item
                  v-for="option in filteredCountryOptions"
                  :key="option.value"
                  :active="option.value === selectedCountry"
                  @click="selectCountry(option.value)"
                >
                  <template #prepend>
                    <span class="phone-input-item-flag">{{ option.flag }}</span>
                  </template>

                  <v-list-item-title>
                    <span class="phone-input-item-row">
                      <span class="phone-input-item-code">{{ option.title }}</span>
                      <span class="phone-input-item-country">{{ option.subtitle }}</span>
                    </span>
                  </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="filteredCountryOptions.length === 0">
                  <v-list-item-title>{{ noResultsMessage }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </v-menu>

          <span class="phone-input-divider" aria-hidden="true"></span>
        </div>
      </template>
    </v-text-field>
  </div>
</template>

<style scoped>
.phone-input-layout {
  min-width: 0;
}

.phone-input-selected-flag {
  display: inline-flex;
}

.phone-input-prefix {
  align-items: center;
  display: inline-flex;
  max-width: 100%;
}

.phone-input-country-trigger {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  gap: 8px;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.phone-input-country-trigger:disabled {
  cursor: default;
}

.phone-input-selected-code {
  font-weight: 600;
  white-space: nowrap;
}

.phone-input-divider {
  align-self: stretch;
  background: currentColor;
  margin: 6px 12px 6px 14px;
  opacity: 0.16;
  width: 1px;
}

.phone-input-menu {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(var(--v-theme-on-surface), 0.08);
  min-width: 320px;
  padding: 12px;
}

.phone-input-list {
  max-height: 320px;
  overflow: auto;
  padding: 0;
}

.phone-input-item-flag {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  min-width: 20px;
}

.phone-input-item-row {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 52px minmax(0, 1fr);
  width: 100%;
}

.phone-input-item-code {
  color: var(--nk-text-primary, inherit);
  font-weight: 600;
  white-space: nowrap;
}

.phone-input-item-country {
  color: var(--nk-text-secondary, inherit);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-input-number {
  min-width: 0;
}
</style>
