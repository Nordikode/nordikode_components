import type { DefineComponent } from 'vue'

export * from './tokens'

export type SharedLocale = 'en' | 'no' | 'sv' | 'fr' | 'pl'

export type NkStatusChipTone = 'success' | 'inflight' | 'warning' | 'error' | 'info' | 'ai' | 'neutral'
export type NkStatusChipSize = 'sm' | 'md'
/** NkEmptyState (SIGN-447): `default` for hele flater, `compact` for lister etter søk/filter. */
export type NkEmptyStateSize = 'default' | 'compact'

export const IdentityAvatar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkEmptyState: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkStatusChip: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PhoneNumberInput: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

export interface StaleChunkRouter {
  onError(handler: (error: unknown, to: { fullPath: string }) => unknown): unknown
}
export declare function installStaleChunkReload(router?: StaleChunkRouter): void
export declare function isStaleChunkError(error: unknown): boolean

/**
 * Delt beløpsformatering (SIGN-499): valuta er alltid data (tenant/dokument),
 * locale er brukerens UI-locale som full BCP-47-tag. Se src/money.ts.
 */
export interface FormatMoneyOptions {
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  compact?: boolean
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero'
}
export declare function toBcp47(locale: string | null | undefined): string
export declare function formatMoney(
  amount: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function formatMinorAmount(
  amountMinor: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function formatMoneyRange(
  from: number,
  to: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function supportedCurrencyCodes(): string[]

import type { IconSet } from 'vuetify'
export type MdiRegistry = Readonly<Record<string, string>>
/** Vuetify-ikonsett som slår opp `mdi-*`-navn i et generert @mdi/js-register (SIGN-521). */
export declare function mdiRegistryIconSet(registry: MdiRegistry): IconSet
