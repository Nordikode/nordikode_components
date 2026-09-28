import type { DefineComponent } from 'vue'

export * from './tokens'

/** Plattformens språkkode. Hvilke språk som finnes, er data fra språkregisteret (SIGN-1157). */
export type SharedLocale = string

export type NkStatusChipTone = 'success' | 'inflight' | 'warning' | 'error' | 'info' | 'ai' | 'neutral'
export type NkStatusChipSize = 'sm' | 'md'
/** NkEmptyState (SIGN-447): `default` for hele flater, `compact` for lister etter søk/filter. */
export type NkEmptyStateSize = 'default' | 'compact'

export const IdentityAvatar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkEmptyState: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkSheet (SIGN-733): det delte dialogskallet — hode, rullende kropp og festet
 * handlingsrad, fullskjerm under `smAndDown`. Props: `modelValue`/`open`, `title`,
 * `subtitle`, `maxWidth`, `fullscreenOnMobile`, `eager`; slots `default`, `actions`,
 * `head`, `badge`; emits `update:modelValue` og `close`.
 */
export const NkSheet: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
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
/** Det `configureLocales` trenger fra en rad i språkregisteret (SIGN-1164). */
export interface LocaleRegistryEntry {
  code: string
  bcp47: string
  aliases?: ReadonlyArray<string> | null
}
/**
 * Erstatter tabellen bak `toBcp47` med språkregisteret (core `platformLocales`).
 * En tom liste setter tabellen tilbake til startverdien.
 */
export declare function configureLocales(locales: ReadonlyArray<LocaleRegistryEntry>): void
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
