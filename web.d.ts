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

export type AccountMenuThemeOption = {
  value: string
  label: string
}

export type AccountMenuTheme = {
  label: string
  options: AccountMenuThemeOption[]
  value: string
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
  toggle: () => void
  applyPreference: (preference: ThemePreference) => void
}

export const AppTopBar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
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
