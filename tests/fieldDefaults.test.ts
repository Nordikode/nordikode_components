// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createApp, h, type App, type Component } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'

import NkListPane from '../src/components/NkListPane.vue'
import PhoneNumberInput from '../src/components/PhoneNumberInput.vue'
import { NK_FIELD_AUTOCOMPLETE, nkFieldDefaults } from '../src/tokens'

// Nettleserens autoforslag er av på alle felt (SIGN-1907). Det som voktes:
// standarden når selve <input>-elementet i hver felttype — også tekstområdet,
// som ikke arver fra tekstfeltet — og et felt som ber om autofyll, får det.

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globals.visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1280, height: 800 }
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never
})

let app: App | null = null
let host: HTMLElement | null = null

const { VAutocomplete, VCombobox, VNumberInput, VSelect, VTextarea, VTextField } = components
const fields: Record<string, Component> = { VTextField, VTextarea, VSelect, VAutocomplete, VCombobox, VNumberInput }

function mount(component: Component, props: Record<string, unknown> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({ render: () => h(component, { label: 'Felt', ...props }) })
  app.use(createVuetify({ components, defaults: nkFieldDefaults() }))
  app.mount(host)

  return host.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]), textarea')!
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('nkFieldDefaults (SIGN-1907)', () => {
  it.each(Object.keys(fields))('%s: autoforslag er av uten at feltet ber om det', (name) => {
    const input = mount(fields[name]!)

    expect(input.getAttribute('autocomplete')).toBe(NK_FIELD_AUTOCOMPLETE)
  })

  it.each(Object.keys(fields))('%s har en oppføring i standardene', (name) => {
    expect(nkFieldDefaults()[name]).toMatchObject({ autocomplete: 'off' })
  })

  it('et felt som gjelder brukeren selv, beholder sin egen verdi', () => {
    const input = mount(VTextField, { autocomplete: 'email', type: 'email' })

    expect(input.getAttribute('autocomplete')).toBe('email')
  })

  it('en betinget verdi som blir `undefined`, faller tilbake til standarden', () => {
    const input = mount(VTextField, { autocomplete: undefined })

    expect(input.getAttribute('autocomplete')).toBe('off')
  })

  it('feltene alle appene bruker har samme utseende', () => {
    const defaults = nkFieldDefaults()

    for (const name of ['VTextField', 'VTextarea', 'VSelect', 'VAutocomplete', 'VCombobox']) {
      expect(defaults[name]).toMatchObject({ variant: 'outlined', density: 'comfortable', hideDetails: 'auto' })
    }
  })

  it('telefonfeltet: av som standard, `tel` bare når eieren ber om det', () => {
    expect(mount(PhoneNumberInput, { defaultCountryCode: 'SE' }).getAttribute('autocomplete')).toBe('off')

    app?.unmount()
    host?.remove()

    expect(mount(PhoneNumberInput, { defaultCountryCode: 'SE', autocomplete: 'tel' }).getAttribute('autocomplete')).toBe('tel')
  })

  it('søkefeltet i listepanelet er et søkefelt for nettleseren, også uten ekstra attributter', () => {
    const input = mount(NkListPane, { title: 'Saker', search: '', searchPlaceholder: 'Søk' })

    expect(input.getAttribute('type')).toBe('search')
    expect(input.getAttribute('name')).toBe('search')
    expect(input.getAttribute('autocomplete')).toBe('off')
  })
})
