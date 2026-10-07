import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'
import { toBcp47 } from '../money'

/**
 * Logikken bak telefonfeltet med landvelger. Den deles av de to utgavene av
 * feltet, så de oppfører seg likt på alle flater (SIGN-1301):
 * `PhoneNumberInput` (Vuetify, de innloggede appene) og `PhoneNumberField`
 * (uten Vuetify, nettsiden).
 *
 * Landet kommer alltid fra den som bruker feltet (brukerens, firmaets eller
 * markedets land). Uten land står velgeren tom — aldri et fast land.
 */

export interface PhoneCountryOption {
  /** Landkoden med pluss, f.eks. «+46». */
  title: string
  value: CountryCode
  /** Landets navn i brukerens språk. */
  subtitle: string
  flag: string
  search: string
}

export interface PhoneNumberFieldSource {
  modelValue: () => string | null | undefined
  defaultCountryCode: () => string | null | undefined
  locale: () => string | null | undefined
  emit: (value: string) => void
}

export interface PhoneNumberFieldState {
  selectedCountry: Ref<CountryCode | null>
  nationalInput: Ref<string>
  countrySearch: Ref<string>
  countryOptions: ComputedRef<PhoneCountryOption[]>
  selectedCountryOption: ComputedRef<PhoneCountryOption | null>
  filteredCountryOptions: ComputedRef<PhoneCountryOption[]>
  /** Brukeren velger land i menyen. */
  selectCountry: (countryCode: CountryCode) => void
  /** Er teksten i feltet et gyldig nummer i valgt land (eller med +landkode)? */
  isValidInput: (value: string) => boolean
}

export function usePhoneNumberField(source: PhoneNumberFieldSource): PhoneNumberFieldState {
  const selectedCountry = ref<CountryCode | null>(resolveCountryCode(source.defaultCountryCode()))
  // Når brukeren selv har valgt land (i menyen eller ved å skrive +landkode),
  // skal et senere bytte av standardlandet ikke overstyre valget.
  const countryChosenByUser = ref(false)
  const nationalInput = ref('')
  const applyingExternalValue = ref(false)
  // Teksten feltet fikk fra modelValue. Watcheren på nationalInput kjører etter
  // at synken er ferdig, så uten denne ville et eldre nummer uten landkode blitt
  // sendt tilbake normalisert og gjort skjemaet «endret» uten at noen rørte det.
  let lastSyncedNational: string | null = null
  const countrySearch = ref('')

  const intlLocale = computed(() => toBcp47(source.locale()))
  const regionNames = computed(() => {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') {
      return null
    }

    return new Intl.DisplayNames([intlLocale.value], { type: 'region' })
  })

  const countryOptions = computed<PhoneCountryOption[]>(() => {
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

  const selectedCountryOption = computed<PhoneCountryOption | null>(() => {
    return countryOptions.value.find((option) => option.value === selectedCountry.value) ?? null
  })

  const filteredCountryOptions = computed(() => {
    const query = countrySearch.value.trim().toLowerCase()

    if (query === '') {
      return countryOptions.value
    }

    // Land og landkoder som begynner med søket står først («fr» gir Frankrike
    // før land som bare har bokstavene et sted i navnet).
    const startsWithQuery = (option: PhoneCountryOption): boolean =>
      option.subtitle.toLowerCase().startsWith(query) || option.title.startsWith(query) || option.title.startsWith(`+${query}`)

    const matches = countryOptions.value.filter((option) => option.search.toLowerCase().includes(query))

    return [...matches.filter(startsWithQuery), ...matches.filter((option) => !startsWithQuery(option))]
  })

  watch(
    source.defaultCountryCode,
    (value) => {
      if (countryChosenByUser.value || source.modelValue()?.trim() || nationalInput.value.trim()) {
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
    source.modelValue,
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
    const fromSync = value === lastSyncedNational
    lastSyncedNational = null
    if (fromSync) {
      return
    }

    const trimmed = value.trim()
    if (trimmed.startsWith('+')) {
      const parsed = parsePhoneNumberFromString(trimmed)
      if (parsed?.country) {
        selectedCountry.value = parsed.country
        countryChosenByUser.value = true
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
      lastSyncedNational = ''
      return
    }

    // Eldre numre kan være lagret uten landkode; tolk dem i valgt land.
    const parsed = parsePhoneNumberFromString(trimmed, selectedCountry.value ?? undefined)
    if (parsed) {
      if (parsed.country) {
        selectedCountry.value = parsed.country
      }

      nationalInput.value = formatNationalNumber(parsed.nationalNumber, parsed.country ?? selectedCountry.value)
      lastSyncedNational = nationalInput.value
      return
    }

    nationalInput.value = trimmed
    lastSyncedNational = trimmed
  }

  function emitNormalizedValue(): void {
    if (applyingExternalValue.value) {
      return
    }

    const trimmed = nationalInput.value.trim()
    if (trimmed === '') {
      source.emit('')
      return
    }

    if (trimmed.startsWith('+')) {
      const parsed = parsePhoneNumberFromString(trimmed)
      source.emit(parsed?.number ?? trimmed)
      return
    }

    const parsed = parsePhoneNumberFromString(trimmed, selectedCountry.value ?? undefined)
    if (parsed) {
      source.emit(parsed.number)
      return
    }

    const digits = trimmed.replace(/[^\d]/g, '')
    if (digits === '') {
      source.emit('')
      return
    }

    if (!selectedCountry.value) {
      // Uten land kan nummeret ikke gjøres om til E.164; valideringen ber
      // brukeren velge land eller skrive +landkode.
      source.emit(trimmed)
      return
    }

    source.emit(`+${getCountryCallingCode(selectedCountry.value)}${digits}`)
  }

  function selectCountry(countryCode: CountryCode): void {
    selectedCountry.value = countryCode
    countryChosenByUser.value = true
    countrySearch.value = ''
  }

  function isValidInput(value: string): boolean {
    return isValidPhoneNumber(value.trim(), selectedCountry.value)
  }

  return {
    selectedCountry,
    nationalInput,
    countrySearch,
    countryOptions,
    selectedCountryOption,
    filteredCountryOptions,
    selectCountry,
    isValidInput,
  }
}

/**
 * Er verdien et gyldig nummer i internasjonal form (med landkode)? Til
 * skjemaer som vil stoppe innsending før serveren gjør det.
 */
export function isValidInternationalPhoneNumber(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim()

  if (!trimmed.startsWith('+')) {
    return false
  }

  return parsePhoneNumberFromString(trimmed)?.isValid() ?? false
}

function resolveCountryCode(value: string | null | undefined): CountryCode | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toUpperCase()

  return isSupportedCountry(normalized) ? normalized : null
}

function countryCodeToFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

function formatNationalNumber(value: string, countryCode: CountryCode | null): string {
  return new AsYouType(countryCode ?? undefined).input(value)
}

function isValidPhoneNumber(value: string, countryCode: CountryCode | null): boolean {
  const parsed = value.startsWith('+') || !countryCode
    ? parsePhoneNumberFromString(value)
    : parsePhoneNumberFromString(value, countryCode)

  return parsed?.isValid() ?? false
}
