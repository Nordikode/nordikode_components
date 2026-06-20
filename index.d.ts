import type { DefineComponent } from 'vue'

export type SharedLocale = 'en' | 'no' | 'sv' | 'fr' | 'pl'

export interface HeaderTenantOption {
  title: string
  value: string
  logoUrl?: string | null
}

export interface AppBreadcrumbItem {
  label: string
  to?: unknown
}

export const AppTopHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AppBreadcrumbs: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const IdentityAvatar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PhoneNumberInput: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const TenantSelector: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const UserIdentityMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
