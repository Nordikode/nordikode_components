// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref, type App } from 'vue'
import { createVuetify } from 'vuetify'
import { VForm, VIcon, VList, VListItem, VListItemTitle, VMenu, VTextField } from 'vuetify/components'

import PhoneNumberInput from '../src/components/PhoneNumberInput.vue'

// Telefonfeltet med Vuetify (SIGN-1213): et tomt påkrevd felt og et ugyldig
// nummer skal være ugyldige, et gyldig nummer gyldig — også når appen ikke
// sender med feilmeldingstekst. SIGN-1195: med `null` som melding slapp
// Vuetify feltet gjennom som gyldig, fordi en regel som gir null ignoreres.

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

type FieldProps = {
  required?: boolean
  requiredMessage?: string | null
  invalidMessage?: string | null
}

let app: App | null = null
let host: HTMLElement | null = null

function mountField(fieldProps: FieldProps) {
  host = document.createElement('div')
  document.body.appendChild(host)

  const form = ref<InstanceType<typeof VForm> | null>(null)
  const modelValue = ref('')

  app = createApp({
    render: () =>
      h(VForm, { ref: form }, () => [
        h(PhoneNumberInput, {
          modelValue: modelValue.value,
          'onUpdate:modelValue': (value: string) => {
            modelValue.value = value
          },
          defaultCountryCode: 'NO',
          locale: 'en',
          ...fieldProps,
        }),
      ]),
  })
  app.use(createVuetify({ components: { VForm, VIcon, VList, VListItem, VListItemTitle, VMenu, VTextField } }))
  app.mount(host)

  const input = () => host!.querySelector<HTMLInputElement>('input[type="tel"]')!
  const type = async (text: string) => {
    input().value = text
    input().dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
  }
  const validate = async () => {
    const result = await form.value!.validate()
    await nextTick()
    return result
  }
  const messages = () => Array.from(host!.querySelectorAll<HTMLElement>('.v-messages__message')).map((el) => el.textContent?.trim())

  return { modelValue, type, validate, messages }
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('telefonfeltet med Vuetify', () => {
  it('avviser et tomt påkrevd felt, med meldingen appen sender', async () => {
    const field = mountField({ required: true, requiredMessage: 'Telefonnummer må fylles ut.' })

    expect((await field.validate()).valid).toBe(false)
    expect(field.messages()).toContain('Telefonnummer må fylles ut.')
  })

  it('avviser et tomt påkrevd felt også uten meldingstekst (SIGN-1195)', async () => {
    const field = mountField({ required: true, requiredMessage: null })

    expect((await field.validate()).valid).toBe(false)
    expect(field.messages().filter(Boolean)).toEqual([])
  })

  it('avviser et ugyldig nummer, med og uten meldingstekst', async () => {
    const withText = mountField({ invalidMessage: 'Skriv et gyldig telefonnummer.' })
    await withText.type('123')
    expect((await withText.validate()).valid).toBe(false)
    expect(withText.messages()).toContain('Skriv et gyldig telefonnummer.')

    app?.unmount()
    host?.remove()

    const withoutText = mountField({ invalidMessage: null })
    await withoutText.type('123')
    expect((await withoutText.validate()).valid).toBe(false)
    expect(withoutText.messages().filter(Boolean)).toEqual([])
  })

  it('godtar et gyldig nummer og gir det i internasjonal form', async () => {
    const field = mountField({ required: true, requiredMessage: null, invalidMessage: null })
    await field.type('912 34 567')

    expect((await field.validate()).valid).toBe(true)
    expect(field.messages().filter(Boolean)).toEqual([])
    expect(field.modelValue.value).toBe('+4791234567')
  })

  it('lar et tomt felt som ikke er påkrevd være gyldig', async () => {
    const field = mountField({ required: false })

    expect((await field.validate()).valid).toBe(true)
  })
})
