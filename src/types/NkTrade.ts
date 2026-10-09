/** Levering av et fag (SIGN-1481): firmaet leverer det selv, eller setter det bort. */
export type NkTradeDelivery = 'own' | 'subcontracted'

/**
 * Et fag i firmaets fagliste (core `tenantTrades`). `key` er verdien som
 * lagres overalt (`trade_key`); `name` er firmaets eget navn og oversettes
 * ikke. `platformTradeKey` kobler faget til Nordikodes fagliste, så søket
 * også treffer plattformfagets synonymer.
 */
export interface NkTradeOption {
  key: string
  name: string
  delivery: NkTradeDelivery
  platformTradeKey?: string | null
  archived?: boolean
}

/** Et fag i Nordikodes fagliste (core `platformTrades`), med navn på brukerens språk. */
export interface NkPlatformTradeOption {
  key: string
  name: string
  synonyms?: string[]
}

/**
 * Det fagvelgeren ber appen opprette (core `createTenantTrade`). Fra
 * Nordikodes fagliste når `platformTradeKey` er satt, ellers et eget fag med
 * `name`. Nøkkelen lager core; velgeren lager aldri en selv.
 */
export interface NkTradeCreateInput {
  name: string
  platformTradeKey: string | null
  delivery: NkTradeDelivery
}
