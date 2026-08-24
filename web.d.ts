import type { DefineComponent } from 'vue'

export type AppLauncherItem = {
  key: string
  label: string
  url: string
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

export const AppLauncherMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AccountIdentityMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const TenantSwitcherMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const BrandWordmark: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
