import { effectScope, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { isValidInternationalPhoneNumber, usePhoneNumberField } from '../src/phone/usePhoneNumberField'

// Telefonfeltet (SIGN-1301): landet er data fra den som bruker feltet, aldri
// en fast verdi. Uten land står velgeren tom, og nummeret blir ikke gjort om
// til internasjonal form før brukeren har valgt land eller skrevet +landkode.

function mountField(initial: { modelValue?: string; defaultCountryCode?: string | null; locale?: string } = {}) {
  const modelValue = ref(initial.modelValue ?? '')
  const defaultCountryCode = ref<string | null>(initial.defaultCountryCode ?? null)
  const emitted: string[] = []

  const scope = effectScope()
  const field = scope.run(() =>
    usePhoneNumberField({
      modelValue: () => modelValue.value,
      defaultCountryCode: () => defaultCountryCode.value,
      locale: () => initial.locale ?? 'en',
      emit: (value) => {
        emitted.push(value)
        modelValue.value = value
      },
    }),
  )!

  return { field, modelValue, defaultCountryCode, emitted, stop: () => scope.stop() }
}

describe('telefonfeltet med landvelger', () => {
  it('starter på landet det får', () => {
    const { field, stop } = mountField({ defaultCountryCode: 'SE' })

    expect(field.selectedCountry.value).toBe('SE')
    expect(field.selectedCountryOption.value?.title).toBe('+46')
    stop()
  })

  it('står tomt uten land — ingen reserve', () => {
    const { field, stop } = mountField({ defaultCountryCode: null })

    expect(field.selectedCountry.value).toBeNull()
    expect(field.selectedCountryOption.value).toBeNull()
    stop()
  })

  it('står tomt når landet er ukjent', () => {
    const { field, stop } = mountField({ defaultCountryCode: 'XX' })

    expect(field.selectedCountry.value).toBeNull()
    stop()
  })

  it('gir nummeret i internasjonal form fra valgt land', async () => {
    const { field, emitted, stop } = mountField({ defaultCountryCode: 'SE' })

    field.nationalInput.value = '070 123 45 67'
    await nextTick()

    expect(emitted.at(-1)).toBe('+46701234567')
    stop()
  })

  it('uten land sendes teksten som skrevet, og den er ikke gyldig', async () => {
    const { field, emitted, stop } = mountField()

    field.nationalInput.value = '912 34 567'
    await nextTick()

    expect(emitted.at(-1)).toBe('912 34 567')
    expect(field.isValidInput('912 34 567')).toBe(false)
    expect(isValidInternationalPhoneNumber(emitted.at(-1))).toBe(false)
    stop()
  })

  it('brukeren kan skrive en annen landkode, og velgeren følger med', async () => {
    const { field, emitted, stop } = mountField({ defaultCountryCode: 'SE' })

    field.nationalInput.value = '+33 6 12 34 56 78'
    await nextTick()
    await nextTick()

    expect(field.selectedCountry.value).toBe('FR')
    expect(emitted.at(-1)).toBe('+33612345678')
    stop()
  })

  it('brukeren kan velge et annet land i menyen', async () => {
    const { field, emitted, stop } = mountField({ defaultCountryCode: 'SE' })

    field.nationalInput.value = '601 234 567'
    await nextTick()
    field.selectCountry('PL')
    await nextTick()

    expect(emitted.at(-1)).toBe('+48601234567')
    stop()
  })

  it('følger landet når det endres, så lenge feltet er tomt og urørt', async () => {
    const { field, defaultCountryCode, stop } = mountField({ defaultCountryCode: null })

    defaultCountryCode.value = 'FR'
    await nextTick()

    expect(field.selectedCountry.value).toBe('FR')
    stop()
  })

  it('et senere landbytte overstyrer ikke landet brukeren valgte selv', async () => {
    const { field, defaultCountryCode, stop } = mountField({ defaultCountryCode: 'SE' })

    field.selectCountry('PL')
    await nextTick()
    defaultCountryCode.value = 'FR'
    await nextTick()

    expect(field.selectedCountry.value).toBe('PL')
    stop()
  })

  it('et lagret nummer velger landet sitt selv', () => {
    const { field, emitted, stop } = mountField({ modelValue: '+48601234567', defaultCountryCode: 'SE' })

    expect(field.selectedCountry.value).toBe('PL')
    // Verdien utenfra sendes ikke tilbake — skjemaet er ikke «endret».
    expect(emitted).toEqual([])
    stop()
  })

  it('landnavnene vises i brukerens språk og kan søkes i', () => {
    const { field, stop } = mountField({ locale: 'sv' })

    field.countrySearch.value = 'frankrike'

    expect(field.filteredCountryOptions.value.map((option) => option.value)).toContain('FR')
    stop()
  })

  it('søket setter land som begynner med søket først', () => {
    const { field, stop } = mountField({ locale: 'en' })

    field.countrySearch.value = 'fr'

    expect(field.filteredCountryOptions.value[0]?.subtitle.toLowerCase().startsWith('fr')).toBe(true)
    stop()
  })
})

describe('isValidInternationalPhoneNumber', () => {
  it('krever landkode', () => {
    expect(isValidInternationalPhoneNumber('+46701234567')).toBe(true)
    expect(isValidInternationalPhoneNumber('0701234567')).toBe(false)
    expect(isValidInternationalPhoneNumber('')).toBe(false)
    expect(isValidInternationalPhoneNumber(null)).toBe(false)
    expect(isValidInternationalPhoneNumber('+46')).toBe(false)
  })
})
