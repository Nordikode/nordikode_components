<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CountryCode } from 'libphonenumber-js/min'
import type { SharedLocale } from '../types/SharedLocale'
import { usePhoneNumberField } from '../phone/usePhoneNumberField'

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
  hint?: string | null
  persistentHint?: boolean
  density?: 'default' | 'comfortable' | 'compact'
  variant?: 'outlined' | 'filled' | 'underlined' | 'plain' | 'solo' | 'solo-filled' | 'solo-inverted'
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
  hint: null,
  persistentHint: false,
  density: undefined,
  variant: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Landet kommer alltid fra den som bruker komponenten (brukerens, firmaets
// eller markedets land). Uten land står velgeren tom — aldri et fast land.
// Logikken deles med den Vuetify-frie utgaven (`PhoneNumberField` i web).
const {
  selectedCountry,
  nationalInput,
  countrySearch,
  selectedCountryOption,
  filteredCountryOptions,
  selectCountry: chooseCountry,
  isValidInput,
} = usePhoneNumberField({
  modelValue: () => props.modelValue,
  defaultCountryCode: () => props.defaultCountryCode,
  locale: () => props.locale,
  emit: (value) => emit('update:modelValue', value),
})

const countryMenuOpen = ref(false)

const normalizedNumberRules = computed(() => {
  // Meldingene kan være null. Vuetify godtar bare true, false eller tekst fra
  // en regel — null blir ignorert, og feltet regnes som gyldig. Uten melding
  // er feltet fortsatt ugyldig (false), bare uten tekst (SIGN-1195).
  const rules: Array<(value: string) => string | boolean> = []

  if (props.required) {
    rules.push((value: string) => value.trim().length > 0 || (props.requiredMessage ?? false))
  }

  rules.push((value: string) => {
    const trimmed = value.trim()
    if (trimmed === '') {
      return true
    }

    return isValidInput(trimmed) || (props.invalidMessage ?? false)
  })

  return rules
})

function selectCountry(countryCode: CountryCode): void {
  chooseCountry(countryCode)
  countryMenuOpen.value = false
}
</script>

<template>
  <div class="phone-input-layout">
    <v-text-field
      v-model="nationalInput"
      class="phone-input-number"
      :density="density"
      :disabled="disabled"
      :hint="hint ?? undefined"
      :persistent-hint="persistentHint"
      :variant="variant"
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
                <span v-if="selectedCountryOption" class="phone-input-selected-flag">{{ selectedCountryOption.flag }}</span>
                <span class="phone-input-selected-code">{{ selectedCountryOption?.title ?? '+' }}</span>
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
