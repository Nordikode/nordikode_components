import { h, ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkSubscriptionCard from '../../components/NkSubscriptionCard.vue'
import NkPlanCheckoutForm from '../../components/NkPlanCheckoutForm.vue'
import NkPaymentMethodList from '../../components/NkPaymentMethodList.vue'
import NkInvoiceTable from '../../components/NkInvoiceTable.vue'
import { formatMinorAmount } from '../../money'
import { defaultOffer, type NkCatalogPlan, type NkPlanOffer } from '../../licensing/planOffers'
import type { NkSubscriptionSummary } from '../../licensing/subscription'
import type { NkSubscriptionCardTexts } from '../../types/NkLicensingLabels'

// Abonnementsflatene (SIGN-1790): det samme kortet, den samme utsjekken og
// de samme listene i firmaappen → Abonnement og Sign → Innstillinger →
// Abonnement. Tekstene her er norske eksempeldata — i appene kommer de fra
// i18n, og beløp/datoer fra den delte formatteren med brukerens locale.

const money = (amountMinor: number, currency: string): string => formatMinorAmount(amountMinor, currency, 'no')
const date = (iso: string | null | undefined): string | null =>
  iso ? new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' }).format(new Date(iso)) : null
const percent = (value: number): string =>
  new Intl.NumberFormat('nb-NO', { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 2 }).format(value / 100)

const texts: NkSubscriptionCardTexts = {
  status: (status) => ({ trialing: 'Prøveperiode', active: 'Aktiv', past_due: 'Forfalt', suspended: 'Sperret', incomplete: 'Venter på betaling' })[status] ?? status,
  complimentary: 'Kostnadsfritt',
  notAvailable: 'Ikke tilgjengelig',
  seatsLabel: 'Brukere',
  billingLabel: 'Betalingsfrekvens',
  commitmentLabel: 'Binding',
  nextInvoiceLabel: 'Neste faktura',
  paymentTermsLabel: 'Betalingsmåte',
  priceLabel: 'Pris',
  seatsUnlimited: (used) => `${used} i bruk · ubegrenset i prøveperioden`,
  seatsUsage: (used, total) => `${used} av ${total} i bruk`,
  seatsFromNextBilling: (total) => `${total} fra neste faktura`,
  billingEvery: (months) => (months === 1 ? 'Hver måned' : `Hver ${months}. måned`),
  commitmentFor: (months) => (months === 0 ? 'Ingen binding' : `${months} måneders binding`),
  commitmentTrial: 'Ingen i prøveperioden',
  commitmentUntil: (d) => `til ${d}`,
  endPolicy: (policy) => ({ renew_same: 'fornyes med samme binding', to_rolling: 'fortsetter uten binding', expire: 'utløper' })[policy] ?? policy,
  trialUntil: (d) => `Gratis til ${d}`,
  endsOn: (d) => `Avsluttes ${d}`,
  nextInvoiceOn: (d) => d,
  paymentTermsCard: 'Kort',
  paymentTermsInvoice: 'Faktura',
  paymentTermsTrial: 'Ingenting trekkes i prøveperioden',
  monthlyList: (amount) => `${amount} per måned`,
  modelFlat: 'én pris for hele firmaet',
  modelPerUser: (amount) => `${amount} per bruker`,
  modelCompany: (amount, included) => `${amount} for firmaet, ${included} bruker inkludert`,
  modelExtraUser: (amount) => `${amount} per ekstra bruker`,
  pendingPlan: (plan, d) => `Bytter til ${plan} ${d}.`,
  pendingOffer: (billing, commitment, d) => `Endres til ${billing}, ${commitment} ${d}.`,
  trialEndsToday: 'Prøveperioden slutter i dag.',
  trialCountdown: (days) => `${days} dager igjen av prøveperioden.`,
  incompleteAlert: 'Bestillingen venter på betaling. Fullfør betalingen, eller avbryt for å starte på nytt.',
  pastDueAlert: 'Siste betaling feilet. Oppdater kortet under Betaling for å beholde tilgangen.',
  suspendedAlert: 'Abonnementet er sperret fordi betalingen mangler.',
  cancelScheduled: (d) => `Fornyelsen er av. Abonnementet avsluttes ${d}.`,
  cancelCommitted: (d) => `Abonnementet er bundet og kan tidligst sies opp fra ${d}.`,
  actions: {
    chooseOffer: 'Velg tilbud',
    completeCheckout: 'Fullfør betaling',
    abandonCheckout: 'Avbryt bestillingen',
    retryPayment: 'Fullfør betaling',
    resume: 'Gjenoppta fornyelse',
    manageSeats: 'Administrer seter',
    changeSeats: 'Endre antall brukere',
    changeOffer: 'Bytt betalingsfrekvens/binding',
    changePlan: 'Bytt plan',
    cancel: 'Si opp abonnementet',
  },
}

const offer = (months: number, commitment: number, monthly: number): NkPlanOffer => ({
  offerId: `c${months}:t${commitment}`,
  billingMonths: months,
  cadenceAdjustmentPercent: months === 1 ? 0 : -16.67,
  commitmentMonths: commitment,
  commitmentAdjustmentPercent: 0,
  commitmentEndPolicy: 'renew_same',
  isDefault: months === 1,
  quote: { currency: 'NOK', effectiveMonthlyMinor: monthly, totalMinor: monthly * months },
})

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
  offers: [offer(1, 12, 189000), offer(12, 12, 157500)],
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
    { id: 's2', userId: 'u2', userName: 'Ola Nordmann', userEmail: 'ola@fjordbygg.no' },
  ],
}

const meta: Meta<typeof NkSubscriptionCard> = {
  title: 'Komponenter/Abonnement',
  component: NkSubscriptionCard,
}

export default meta
type Story = StoryObj<typeof NkSubscriptionCard>

const card = (overrides: Partial<NkSubscriptionSummary>, props: Record<string, unknown> = {}) =>
  h('div', { style: 'max-width: 36rem' }, [
    h(NkSubscriptionCard, { subscription: { ...subscription, ...overrides }, plans: [plan], texts, formatMoney: money, formatDate: date, canManage: true, canManageSeats: true, ...props }),
  ])

export const Aktivt: Story = { render: () => card({}) }

export const Prøveperiode: Story = {
  render: () => card({ status: 'trialing', trialEndsAt: new Date(Date.now() + 9 * 86400000).toISOString(), commitmentMonths: null }),
}

export const VenterPåBetaling: Story = { render: () => card({ status: 'incomplete' }) }

export const FeiletBetaling: Story = { render: () => card({ status: 'past_due' }) }

export const OppsigelsePlanlagt: Story = { render: () => card({ cancelAt: '2027-10-19', cancelAtPeriodEnd: true }) }

export const VentendeEndring: Story = {
  render: () => card({ pendingChange: { type: 'offer', planId: null, offerId: 'c12:t12', billingMonths: 12, commitmentMonths: 12, effectiveAt: '2026-11-19' } }),
}

export const UtenRettigheter: Story = { render: () => card({}, { canManage: false, canManageSeats: false }) }

// Utsjekkens skjema: eieren eier tilstanden — her holdes den i storyen.
export const Utsjekk: Story = {
  render: () => {
    const selected = ref<NkPlanOffer | null>(defaultOffer(plan))
    const seats = ref(2)
    const promoInput = ref('')

    return () =>
      h('div', { style: 'max-width: 32rem' }, [
        h(NkPlanCheckoutForm, {
          plans: [plan],
          selectedPlanId: plan.id,
          offer: selected.value,
          seats: seats.value,
          planHints: ['1 890 kr per måned, 1 bruker inkludert', '+ 299 kr per ekstra bruker'],
          promo: { input: promoInput.value, applied: null, appliedLabel: '', error: '', applying: false },
          lines: [
            { key: 'base', label: 'Planpris', amount: '1 890,00 kr' },
            { key: 'extra', label: '1 ekstra bruker', amount: '299,00 kr' },
            { key: 'vat', label: 'Mva (25 %)', amount: '547,25 kr' },
            { key: 'total', label: 'Totalt', amount: '2 736,25 kr', emphasis: true, divider: true },
          ],
          terms: ['Betales med kort.', 'Bundet til 19. okt. 2027.'],
          labels: {
            plan: 'Plan',
            seats: 'Antall brukere',
            fewerSeats: 'Færre brukere',
            moreSeats: 'Flere brukere',
            promoToggle: 'Har du en kampanjekode?',
            promoCode: 'Kampanjekode',
            promoApply: 'Bruk',
            promoRemove: 'Fjern',
            calculating: 'Beregner prisen …',
          },
          offerLabels: {
            billing: 'Betalingsfrekvens',
            commitment: 'Bindingstid',
            billingEvery: texts.billingEvery,
            commitmentFor: texts.commitmentFor,
            perMonth: (amount: string) => `${amount} per måned`,
          },
          formatMoney: money,
          formatPercentLabel: percent,
          'onUpdate:offer': (value: NkPlanOffer | null) => (selected.value = value),
          'onUpdate:seats': (value: number) => (seats.value = value),
          'onUpdate:promoInput': (value: string) => (promoInput.value = value),
        }),
      ])
  },
}

export const Betaling: Story = {
  render: () =>
    h('div', { style: 'display:grid; gap: 24px; max-width: 48rem' }, [
      h(NkPaymentMethodList, {
        canManage: true,
        methods: [
          { id: 'pm1', brand: 'visa', last4: '4242', expMonth: 8, expYear: 2029, walletType: null, isDefault: true },
          { id: 'pm2', brand: 'mastercard', last4: '4444', expMonth: 1, expYear: 2028, walletType: 'apple_pay', isDefault: false },
        ],
        labels: { empty: 'Ingen lagrede kort ennå.', card: 'Kort', default: 'Standard', setDefault: 'Sett som standard', remove: 'Fjern', expires: (m: string, y: string) => `Utløper ${m}/${y}` },
      }),
      h(NkInvoiceTable, {
        invoices: [
          { id: 'inv1', number: 'NK-2026-0042', dateLabel: '19. okt. 2026', statusTone: 'success', statusLabel: 'Betalt', dueLabel: null, totalLabel: '2 736,25 kr', pdfHref: '#' },
          { id: 'inv2', number: 'NK-2026-0051', dateLabel: '19. nov. 2026', statusTone: 'warning', statusLabel: 'Ubetalt', dueLabel: 'Forfaller 3. des. 2026', totalLabel: '2 736,25 kr', pdfHref: '#' },
        ],
        labels: { empty: 'Ingen fakturaer ennå.', number: 'Nummer', date: 'Dato', status: 'Status', total: 'Totalt', pdf: 'PDF' },
      }),
    ]),
}
