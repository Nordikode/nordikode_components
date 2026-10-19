import type { NkStatusChipTone } from './NkStatusChipTone'

/**
 * Tekstene abonnementsflatene trenger fra appens i18n (SIGN-1790). Pakka
 * eier ingen strenger: alt som varierer med språk, antall eller beløp kommer
 * inn som strenger eller funksjoner, og beløp/datoer formateres av appen med
 * den delte formatteren og brukerens locale.
 */

/** Beløp i minor units + valutakode → ferdig formatert beløp (`formatMinorAmount` med appens locale). */
export type NkFormatMoney = (amountMinor: number, currency: string) => string

/** ISO-dato → ferdig formatert dato, null når verdien mangler eller er ugyldig. */
export type NkFormatDate = (iso: string | null | undefined) => string | null

/** Prosent med fortegn og prosenttegn slik språket skriver det («−16,67 %»). */
export type NkFormatPercentLabel = (value: number) => string

export interface NkOfferPickerLabels {
  billing: string
  commitment: string
  /** «Hver måned» / «Hver 3. måned». */
  billingEvery: (months: number) => string
  /** «Ingen binding» / «12 måneders binding». */
  commitmentFor: (months: number) => string
  /** «1 490 kr per måned». */
  perMonth: (amount: string) => string
}

export interface NkSeatStepperLabels {
  fewer: string
  more: string
}

export interface NkPlanCheckoutFormLabels {
  plan: string
  seats: string
  fewerSeats: string
  moreSeats: string
  /** «Har du en kampanjekode?» — lenken som åpner feltet. */
  promoToggle: string
  promoCode: string
  promoApply: string
  promoRemove: string
  calculating: string
}

export interface NkPaymentElementDialogLabels {
  loading: string
  payNow: string
  saveCard: string
  securedByStripe: string
  cancel: string
  failed: string
}

export interface NkSubscriptionCardTexts {
  /** Statuschipen («Aktiv», «Prøveperiode» …) for en abonnementsstatus. */
  status: (status: string) => string
  complimentary: string
  notAvailable: string
  seatsLabel: string
  billingLabel: string
  commitmentLabel: string
  nextInvoiceLabel: string
  paymentTermsLabel: string
  priceLabel: string
  seatsUnlimited: (used: number) => string
  seatsUsage: (used: number, total: number) => string
  seatsFromNextBilling: (total: number) => string
  billingEvery: (months: number) => string
  commitmentFor: (months: number) => string
  commitmentTrial: string
  commitmentUntil: (date: string) => string
  /** «fornyes med samme binding» / «fortsetter uten binding» / «utløper» for `renew_same`/`to_rolling`/`expire`. */
  endPolicy: (policy: string) => string
  trialUntil: (date: string) => string
  endsOn: (date: string) => string
  nextInvoiceOn: (date: string) => string
  paymentTermsCard: string
  paymentTermsInvoice: string
  paymentTermsTrial: string
  monthlyList: (amount: string) => string
  modelFlat: string
  modelPerUser: (amount: string) => string
  modelCompany: (amount: string, includedSeats: number) => string
  modelExtraUser: (amount: string) => string
  pendingPlan: (plan: string, date: string) => string
  pendingOffer: (billing: string, commitment: string, date: string) => string
  trialEndsToday: string
  trialCountdown: (days: number) => string
  incompleteAlert: string
  pastDueAlert: string
  suspendedAlert: string
  cancelScheduled: (date: string) => string
  cancelCommitted: (date: string) => string
  actions: {
    chooseOffer: string
    completeCheckout: string
    abandonCheckout: string
    retryPayment: string
    resume: string
    manageSeats: string
    changeSeats: string
    changeOffer: string
    changePlan: string
    cancel: string
  }
}

export interface NkPaymentMethod {
  id: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
  walletType: string | null
  isDefault: boolean
}

export interface NkPaymentMethodListLabels {
  empty: string
  /** Reserven når kortet ikke har merke. */
  card: string
  default: string
  setDefault: string
  remove: string
  expires: (month: string, year: string) => string
}

/** Én faktura slik tabellen viser den — alt ferdig formatert av appen. */
export interface NkInvoiceRow {
  id: string
  number: string
  dateLabel: string
  statusTone: NkStatusChipTone
  statusLabel: string
  /** «Forfaller 1. nov. 2026» for ubetalte, ellers null. */
  dueLabel: string | null
  totalLabel: string
  /** Lenken til PDF-en (åpnes i ny fane); null når den ikke finnes. */
  pdfHref: string | null
  /** Uten lenke: eieren henter PDF-en selv på `download` (én fil ved klikk). */
  downloadable?: boolean
}

export interface NkInvoiceTableLabels {
  empty: string
  number: string
  date: string
  status: string
  total: string
  pdf: string
}
