// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { createVuetify } from 'vuetify'
import { VAlert, VBtn, VCard, VDialog } from 'vuetify/components'

// Betalingsdialogen (SIGN-95, delt i SIGN-1790) med mocket stripe-js:
// elementet monteres fra clientSecret, bekreftelsen bruker klientbygget
// return_url (nåværende side + checkout=return) med redirect 'if_required',
// og utfallet meldes som succeeded/processing/failed. Portert fra
// firmaappens StripePaymentDialog.spec.

const readyCallbacks: Array<() => void> = []

const paymentElement = {
  mount: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn((event: string, callback: () => void) => {
    if (event === 'ready') readyCallbacks.push(callback)
  }),
}

const elementsInstance = { create: vi.fn(() => paymentElement) }

const fakeStripe = {
  elements: vi.fn(() => elementsInstance),
  confirmPayment: vi.fn(),
  confirmSetup: vi.fn(),
}

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async () => fakeStripe),
}))

import NkPaymentElementDialog from '../src/components/NkPaymentElementDialog.vue'

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globals.visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1280, height: 800 }
  if (typeof Element.prototype.animate !== 'function') {
    Element.prototype.animate = (() => ({ finished: Promise.resolve(), cancel() {} })) as never
  }
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never
})

const labels = {
  loading: 'Laster betalingsskjemaet …',
  payNow: 'Betal nå',
  saveCard: 'Lagre kort',
  securedByStripe: 'Betalinger behandles trygt av Stripe.',
  cancel: 'Avbryt',
  failed: 'Betalingen kunne ikke fullføres.',
}

let app: App | null = null
let host: HTMLElement | null = null
let emitted: Record<string, unknown[][]> = {}

const state = reactive({ open: false, clientSecret: null as string | null, mode: 'payment' as 'payment' | 'setup' })

const flush = async () => {
  for (let i = 0; i < 6; i += 1) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

const record = (name: string) => (...args: unknown[]) => {
  ;(emitted[name] ??= []).push(args)
}

const mountDialog = async (mode: 'payment' | 'setup') => {
  state.open = false
  state.clientSecret = null
  state.mode = mode
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(NkPaymentElementDialog, {
        open: state.open,
        mode: state.mode,
        clientSecret: state.clientSecret,
        publishableKey: 'pk_test_market',
        title: 'Betaling',
        labels,
        onSucceeded: record('succeeded'),
        onProcessing: record('processing'),
        onFailed: record('failed'),
        onClose: record('close'),
      }),
  })
  app.use(createVuetify({ components: { VAlert, VBtn, VCard, VDialog } }))
  app.mount(host)

  state.open = true
  state.clientSecret = 'pi_1_secret_2'
  await flush()
  // Payment Element melder seg klart — først da aktiveres betal-knappen.
  readyCallbacks.forEach((callback) => callback())
  await flush()
}

const confirmButton = () => document.body.querySelector<HTMLButtonElement>('button[data-test="confirm"]')
const clickConfirm = async () => {
  confirmButton()!.click()
  await flush()
}

beforeEach(() => {
  vi.clearAllMocks()
  readyCallbacks.length = 0
  emitted = {}
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
  document.body.innerHTML = ''
})

describe('NkPaymentElementDialog', () => {
  it('monterer betalingselementet fra clientSecret', async () => {
    fakeStripe.confirmPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded' } })

    await mountDialog('payment')

    expect(fakeStripe.elements).toHaveBeenCalledWith(expect.objectContaining({ clientSecret: 'pi_1_secret_2' }))
    expect(paymentElement.mount).toHaveBeenCalled()
    expect(confirmButton()!.disabled).toBe(false)
  })

  it('bekrefter betalingen med klientbygget return_url uten tvungen redirect', async () => {
    fakeStripe.confirmPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded' } })

    await mountDialog('payment')
    await clickConfirm()

    expect(fakeStripe.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}${window.location.pathname}?checkout=return` },
      }),
    )
    expect(emitted.succeeded).toHaveLength(1)
  })

  it('melder processing når betalingen fortsatt behandles', async () => {
    fakeStripe.confirmPayment.mockResolvedValue({ paymentIntent: { status: 'processing' } })

    await mountDialog('payment')
    await clickConfirm()

    expect(emitted.processing).toHaveLength(1)
    expect(emitted.succeeded).toBeUndefined()
  })

  it('melder failed med Stripes melding og viser den i dialogen', async () => {
    fakeStripe.confirmPayment.mockResolvedValue({ error: { message: 'Kortet ble avvist.' } })

    await mountDialog('payment')
    await clickConfirm()

    expect(emitted.failed?.[0]).toEqual(['Kortet ble avvist.'])
    expect(document.body.textContent).toContain('Kortet ble avvist.')
  })

  it('bruker confirmSetup når kortet skal lagres', async () => {
    fakeStripe.confirmSetup.mockResolvedValue({ setupIntent: { status: 'succeeded' } })

    await mountDialog('setup')
    expect(confirmButton()!.textContent).toContain('Lagre kort')
    await clickConfirm()

    expect(fakeStripe.confirmSetup).toHaveBeenCalledWith(expect.objectContaining({ redirect: 'if_required' }))
    expect(fakeStripe.confirmPayment).not.toHaveBeenCalled()
    expect(emitted.succeeded).toHaveLength(1)
  })

  it('river ned betalingselementet når dialogen lukkes', async () => {
    fakeStripe.confirmPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded' } })

    await mountDialog('payment')
    state.open = false
    state.clientSecret = null
    await flush()

    expect(paymentElement.destroy).toHaveBeenCalled()
  })
})
