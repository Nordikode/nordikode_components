import type { NkPlanChangePreview, NkPlanCheckoutQuote } from './planOffers'

/**
 * Prissammendraget alle flatene viser (SIGN-1790): ferdig formaterte linjer
 * fra licensing sin `Quote`. Tekstene kommer fra appen som funksjoner, så
 * pakka eier ingen strenger og ingen språkliste.
 */
export interface NkQuoteLine {
  key: string
  label: string
  amount: string
  emphasis?: boolean
  /** Skillelinje over raden (summen som avslutter en gruppe). */
  divider?: boolean
}

export interface NkQuoteLineTexts {
  /** Formatterer et beløp i tilbudets valuta. */
  money: (amountMinor: number) => string
  /** Formatterer en prosent med fortegn («−5», «+10»), uten prosenttegn. */
  percent: (value: number) => string
  lineBase: string
  linePerSeat: (seats: number) => string
  lineExtraSeats: (seats: number) => string
  linePeriod: (months: number) => string
  lineCadence: (percent: string) => string
  lineCommitment: (percent: string) => string
  discount: string
  vat: (rate: string) => string
  giftCard: string
  total: string
  amountDue: string
}

export interface NkChangePreviewTexts {
  money: (amountMinor: number) => string
  percent: (value: number) => string
  lineProrated: string
  vat: (rate: string) => string
  amountDue: string
  lineNextPeriod: (months: number) => string
}

export interface NkChangePreviewTermTexts {
  /** ISO-dato → ferdig formatert dato; null når verdien mangler. */
  date: (iso: string | null) => string | null
  nothingDue: string
  effectiveNow: string
  effectiveFrom: (date: string) => string
  commitmentEnd: (date: string) => string
  nextBilling: (date: string) => string
}

/** Mva-satsen uten fortegn («25», «12,5»). */
const rate = (texts: Pick<NkQuoteLineTexts, 'percent'>, value: number): string => texts.percent(value).replace(/^\+/, '')

/**
 * Forhåndsvisningen som komponentlinjer: grunnpris/per bruker, ekstra
 * brukere, periode, frekvens- og bindingsjustering, rabatt, mva, gavekort,
 * total og «å betale nå». Alle beløp gjelder hele betalingsperioden, og
 * hvert beløp er en verdi fra licensing sin Quote — ingen linje regnes her.
 */
export const quoteLines = (checkout: NkPlanCheckoutQuote, texts: NkQuoteLineTexts): NkQuoteLine[] => {
  const { quote } = checkout
  const lines: NkQuoteLine[] = []
  const add = (key: string, label: string, amountMinor: number, emphasis = false): void => {
    lines.push({ key, label, amount: texts.money(amountMinor), emphasis, divider: key === 'total' })
  }

  if (quote.pricingModel === 'per_seat') {
    add('seats', texts.linePerSeat(quote.seats), quote.seatsPeriodMinor)
  } else {
    add('base', texts.lineBase, quote.basePeriodMinor)

    if (quote.billableSeats > 0 && quote.market.seatAmountMinor !== null) {
      add('extra', texts.lineExtraSeats(quote.billableSeats), quote.seatsPeriodMinor)
    }
  }

  add('period', texts.linePeriod(quote.cadence.months), quote.cadence.periodListMinor)

  if (quote.cadence.adjustmentMinor !== 0) {
    add('cadence', texts.lineCadence(texts.percent(quote.cadence.adjustmentPercent)), quote.cadence.adjustmentMinor)
  }

  if (quote.commitment.adjustmentMinor !== 0) {
    add('commitment', texts.lineCommitment(texts.percent(quote.commitment.adjustmentPercent)), quote.commitment.adjustmentMinor)
  }

  if (checkout.discountMinor > 0) {
    add('discount', texts.discount, -checkout.discountMinor)
  }

  add('vat', texts.vat(rate(texts, quote.vat.rate)), checkout.vatMinor)

  if (checkout.giftCardMinor > 0) {
    add('gift_card', texts.giftCard, -checkout.giftCardMinor)
  }

  add('total', texts.total, checkout.totalMinor, true)

  if (checkout.amountDueMinor !== checkout.totalMinor) {
    add('due', texts.amountDue, checkout.amountDueMinor, true)
  }

  return lines
}

/**
 * Forhåndsvisningen av en endring som linjer: det som belastes nå
 * (proratert differanse, mva og «å betale nå») når noe belastes, og neste
 * periodes total med endringen. Beløpene er verdier fra licensing.
 */
export const changePreviewLines = (preview: NkPlanChangePreview, texts: NkChangePreviewTexts): NkQuoteLine[] => {
  const lines: NkQuoteLine[] = []

  if (preview.totalMinor > 0) {
    lines.push(
      { key: 'prorated', label: texts.lineProrated, amount: texts.money(preview.amountMinor) },
      { key: 'vat', label: texts.vat(rate(texts, preview.quote.vat.rate)), amount: texts.money(preview.vatMinor) },
      { key: 'due', label: texts.amountDue, amount: texts.money(preview.totalMinor), emphasis: true, divider: true },
    )
  }

  lines.push({
    key: 'next_period',
    label: texts.lineNextPeriod(preview.quote.cadence.months),
    amount: texts.money(preview.quote.totalMinor),
  })

  return lines
}

/**
 * Når endringen gjelder, bindingsslutt og neste faktura — datoene kommer
 * ferdig formatert inn via `date`, og rader uten dato utelates.
 */
export const changePreviewTerms = (preview: NkPlanChangePreview, texts: NkChangePreviewTermTexts): string[] => {
  const rows: string[] = []
  const effective = texts.date(preview.effectiveAt)

  if (preview.totalMinor === 0) rows.push(texts.nothingDue)

  if (!preview.scheduled) rows.push(texts.effectiveNow)
  else if (effective) rows.push(texts.effectiveFrom(effective))

  const commitmentEnd = texts.date(preview.commitmentEndsAt)
  const nextBilling = texts.date(preview.nextBillingAt)

  if (commitmentEnd) rows.push(texts.commitmentEnd(commitmentEnd))
  if (nextBilling) rows.push(texts.nextBilling(nextBilling))

  return rows
}

export interface NkCheckoutTermTexts {
  date: (iso: string | null) => string | null
  invoiceTerms: (dueDays: number) => string
  cardTerms: string
  commitmentEnd: (date: string) => string
  nextBilling: (date: string) => string
}

/** Betalingsmåte, bindingsslutt og neste faktura for et kjøp — alt fra forhåndsvisningen. */
export const checkoutTerms = (checkout: NkPlanCheckoutQuote, texts: NkCheckoutTermTexts): string[] => {
  const rows = [checkout.paymentTerms === 'invoice' ? texts.invoiceTerms(checkout.invoiceDueDays ?? 0) : texts.cardTerms]
  const commitmentEnd = texts.date(checkout.commitmentEndsAt)
  const nextBilling = texts.date(checkout.nextBillingAt)

  if (commitmentEnd) rows.push(texts.commitmentEnd(commitmentEnd))
  if (nextBilling) rows.push(texts.nextBilling(nextBilling))

  return rows
}
