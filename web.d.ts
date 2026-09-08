import type { DefineComponent } from 'vue'

export type AppLauncherItem = {
  key: string
  label: string
  url: string
  group?: string
  badge?: number | null
}

export type AccountMenuService = {
  key: string
  label: string
  url: string
}

export type AccountMenuLabels = {
  menu: string
  services: string
  current: string
  logOut: string
}

export type WebAppIconName =
  | 'portal'
  | 'sign'
  | 'time'
  | 'website'
  | 'account'
  | 'backoffice'
  | 'helpcenter'
  | 'developer'
  | 'admin'
  | 'review'

export const webAppIcons: Record<WebAppIconName, string[]>
export const webAppFallbackIcon: string[]
export function webAppIconFor(key: string): string[]

export type TenantSwitcherOption = {
  id: string
  name: string
  logoUrl?: string | null
}

export type TenantSwitcherLabels = {
  menu: string
  current: string
  companies: string
}

export type AppHeaderNavChild = {
  key: string
  label: string
  href: string
  external?: boolean
  active?: boolean
}

export type AppHeaderNavItem = AppHeaderNavChild & {
  href?: string
  children?: AppHeaderNavChild[]
}

export type AppHeaderLabels = {
  navigation: string
  menu: string
}

export type PageHeaderBack = {
  href: string
  label: string
}

export type ThemeToggleLabels = {
  toLight: string
  toDark: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export function useTheme(): {
  isDark: import('vue').Ref<boolean>
  preference: import('vue').Ref<ThemePreference>
  toggle: () => ThemePreference
  applyPreference: (preference: ThemePreference) => void
}

export const AppLauncherMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AccountIdentityMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const TenantSwitcherMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const BrandWordmark: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AppHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PageHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const ThemeToggle: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

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
