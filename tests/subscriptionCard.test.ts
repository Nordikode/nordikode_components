// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, type App } from 'vue'
import { createVuetify } from 'vuetify'
import { VAlert, VBtn } from 'vuetify/components'

import NkSubscriptionCard from '../src/components/NkSubscriptionCard.vue'
import type { NkCatalogPlan } from '../src/licensing/planOffers'
import type { NkSubscriptionSummary } from '../src/licensing/subscription'
import type { NkSubscriptionCardTexts } from '../src/types/NkLicensingLabels'

// Abonnementskortet (SIGN-1790) er det samme i firmaappen og Sign-
// innstillingene. Det som voktes: vilkårene vises slik licensing lagret dem,
// handlingene følger rettighetene og statusen, og en bundet oppsigelse
// forklares i stedet for å nekte stumt.

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
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

const texts: NkSubscriptionCardTexts = {
  status: (status) => `status:${status}`,
  complimentary: 'Kostnadsfritt',
  notAvailable: 'Ikke tilgjengelig',
  seatsLabel: 'Brukere',
  billingLabel: 'Betalingsfrekvens',
  commitmentLabel: 'Binding',
  nextInvoiceLabel: 'Neste faktura',
  paymentTermsLabel: 'Betalingsmåte',
  priceLabel: 'Pris',
  seatsUnlimited: (used) => `${used} i bruk · ubegrenset`,
  seatsUsage: (used, total) => `${used} av ${total} i bruk`,
  seatsFromNextBilling: (total) => `${total} fra neste faktura`,
  billingEvery: (months) => (months === 1 ? 'Hver måned' : `Hver ${months}. måned`),
  commitmentFor: (months) => (months === 0 ? 'Ingen binding' : `${months} måneders binding`),
  commitmentTrial: 'Ingen i prøveperioden',
  commitmentUntil: (date) => `til ${date}`,
  endPolicy: (policy) => `policy:${policy}`,
  trialUntil: (date) => `Gratis til ${date}`,
  endsOn: (date) => `Avsluttes ${date}`,
  nextInvoiceOn: (date) => date,
  paymentTermsCard: 'Kort',
  paymentTermsInvoice: 'Faktura',
  paymentTermsTrial: 'Ingenting trekkes i prøveperioden',
  monthlyList: (amount) => `${amount} per måned`,
  modelFlat: 'én pris for hele firmaet',
  modelPerUser: (amount) => `${amount} per bruker`,
  modelCompany: (amount, included) => `${amount} for firmaet, ${included} bruker inkludert`,
  modelExtraUser: (amount) => `${amount} per ekstra bruker`,
  pendingPlan: (plan, date) => `Bytter til ${plan} ${date}.`,
  pendingOffer: (billing, commitment, date) => `Endres til ${billing}, ${commitment} ${date}.`,
  trialEndsToday: 'Prøveperioden slutter i dag.',
  trialCountdown: (days) => `${days} dager igjen.`,
  incompleteAlert: 'Venter på betaling.',
  pastDueAlert: 'Siste betaling feilet.',
  suspendedAlert: 'Abonnementet er sperret.',
  cancelScheduled: (date) => `Fornyelsen er av. Avsluttes ${date}.`,
  cancelCommitted: (date) => `Bundet — kan sies opp tidligst ${date}.`,
  actions: {
    chooseOffer: 'Velg tilbud',
    completeCheckout: 'Fullfør betaling',
    abandonCheckout: 'Avbryt bestillingen',
    retryPayment: 'Fullfør betaling',
    resume: 'Gjenoppta',
    manageSeats: 'Administrer seter',
    changeSeats: 'Endre antall brukere',
    changeOffer: 'Bytt betalingsfrekvens/binding',
    changePlan: 'Bytt plan',
    cancel: 'Si opp abonnementet',
  },
}

const plan: NkCatalogPlan = {
  id: 'plan-sign',
  key: 'sign',
  name: 'Sign',
  pricingModel: 'included_seats',
  includedSeats: 1,
  currency: 'NOK',
  baseAmountMinor: 189000,
  seatAmountMinor: 29900,
  seats: 1,
  monthlyListMinor: 189000,
  defaultOfferId: 'c1:t12',
  apps: [{ appId: 'app-sign', appKey: 'sign', name: 'Sign' }],
  offers: [
    {
      offerId: 'c1:t12',
      billingMonths: 1,
      cadenceAdjustmentPercent: 0,
      commitmentMonths: 12,
      commitmentAdjustmentPercent: 0,
      commitmentEndPolicy: 'renew_same',
      isDefault: true,
      quote: { currency: 'NOK', effectiveMonthlyMinor: 189000, totalMinor: 189000 },
    },
  ],
}

const subscription: NkSubscriptionSummary = {
  id: 'sub-1',
  appName: 'Sign',
  status: 'active',
  currency: 'NOK',
  paidSeatCount: 3,
  cancelAtPeriodEnd: false,
  isComplimentary: false,
  currentPeriodEnd: '2026-11-19',
  trialEndsAt: null,
  planId: 'plan-sign',
  planName: 'Sign',
  pricingModel: 'included_seats',
  planIncludedSeats: 1,
  apps: [{ appKey: 'sign', appName: 'Sign' }],
  seatsCount: 3,
  baseAmountMinor: 189000,
  seatAmountMinor: 29900,
  monthlyListMinor: 248800,
  billingMonths: 1,
  commitmentMonths: 12,
  commitmentEndsAt: '2027-10-19',
  commitmentEndPolicy: 'renew_same',
  nextBillingAt: '2026-11-19',
  paymentTerms: 'card',
  cancelAt: null,
  cancelableFrom: '2027-10-19',
  pendingChange: null,
  seats: [
    { id: 's1', userId: 'u1', userName: 'Kari Lund', userEmail: 'kari@fjordbygg.no' },
    { id: 's2', userId: 'u2', userName: 'Ola Nordmann', userEmail: null },
  ],
}

let app: App | null = null
let host: HTMLElement | null = null

function mount(props: Record<string, unknown>, listeners: Record<string, () => void> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({ render: () => h(NkSubscriptionCard, { ...props, ...listeners }) })
  app.use(createVuetify({ components: { VAlert, VBtn } }))
  app.mount(host)
}

const base = {
  subscription,
  plans: [plan],
  texts,
  formatMoney: (amountMinor: number, currency: string) => `${amountMinor / 100} ${currency}`,
  formatDate: (iso: string | null | undefined) => iso ?? null,
}

const fact = (key: string): string => host!.querySelector(`[data-fact="${key}"] dd`)!.textContent!.trim()
const buttons = (): string[] => [...host!.querySelectorAll('button')].map((button) => button.textContent!.trim())

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('NkSubscriptionCard', () => {
  it('viser vilkårene slik licensing lagret dem, uten å regne', async () => {
    mount(base)
    await nextTick()

    expect(host!.querySelector('h2')!.textContent).toBe('Sign')
    expect(fact('seats')).toBe('2 av 3 i bruk')
    expect(fact('billing')).toBe('Hver måned')
    expect(fact('commitment')).toBe('12 måneders binding · til 2027-10-19 · policy:renew_same')
    expect(fact('nextInvoice')).toBe('2026-11-19')
    expect(fact('paymentTerms')).toBe('Kort')
    expect(fact('price')).toBe('2488 NOK per måned · 1890 NOK for firmaet, 1 bruker inkludert · 299 NOK per ekstra bruker')
    expect(host!.textContent).toContain('status:active')
  })

  it('skjuler handlingene uten rettighet og viser dem med', async () => {
    mount(base)
    await nextTick()
    expect(buttons()).toEqual([])

    app?.unmount()
    host?.remove()
    mount({ ...base, canManage: true, canManageSeats: true })
    await nextTick()
    expect(buttons()).toEqual(['Administrer seter', 'Endre antall brukere', 'Bytt betalingsfrekvens/binding', 'Si opp abonnementet'])
    // Bare én plan i katalogen: ingen «Bytt plan».
    expect(buttons()).not.toContain('Bytt plan')
  })

  it('forklarer en bundet oppsigelse i stedet for å nekte stumt', async () => {
    mount({ ...base, canManage: true })
    await nextTick()

    const cancel = host!.querySelector<HTMLButtonElement>('[data-test="cancel"]')!
    expect(cancel.disabled).toBe(true)
    expect(host!.querySelector('[data-test="cancel-hint"]')!.textContent).toContain('tidligst 2027-10-19')
  })

  it('viser prøveperioden med nedtelling og «Velg tilbud», og sender hendelsen', async () => {
    const chooseOffer = vi.fn()
    const trial = { ...subscription, status: 'trialing', trialEndsAt: new Date(Date.now() + 5 * 86400000).toISOString() }
    mount({ ...base, subscription: trial, canManage: true }, { onChooseOffer: chooseOffer })
    await nextTick()

    expect(fact('seats')).toBe('2 i bruk · ubegrenset')
    expect(fact('commitment')).toBe('Ingen i prøveperioden')
    expect(fact('paymentTerms')).toBe('Ingenting trekkes i prøveperioden')
    expect(host!.textContent).toContain('5 dager igjen.')

    const button = [...host!.querySelectorAll('button')].find((candidate) => candidate.textContent!.trim() === 'Velg tilbud')!
    button.click()
    expect(chooseOffer).toHaveBeenCalledTimes(1)
  })

  it('viser ventende planbytte med planens navn fra katalogen', async () => {
    const time = { ...plan, id: 'plan-time', name: 'Sign + Time' }
    const pending = { ...subscription, pendingChange: { type: 'plan', planId: 'plan-time', offerId: 'c1:t12', billingMonths: 1, commitmentMonths: 12, effectiveAt: '2027-10-19' } }
    mount({ ...base, subscription: pending, plans: [plan, time], canManage: true })
    await nextTick()

    expect(host!.querySelector('[data-test="pending-change"]')!.textContent).toContain('Bytter til Sign + Time 2027-10-19.')
    expect(buttons()).toContain('Bytt plan')
  })
})
