import type { DefineComponent } from 'vue'

export * from './tokens'

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

export type NkStatusChipTone = 'success' | 'inflight' | 'warning' | 'error' | 'info' | 'neutral'
export type NkStatusChipSize = 'sm' | 'md'

export interface AppSidebarRailItem {
  active?: boolean
  disabled?: boolean
  icon: string
  key: string
  label: string
}

export const AppSidebarRail: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AppTopHeader: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const AppBreadcrumbs: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const IdentityAvatar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkStatusChip: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PhoneNumberInput: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const TenantSelector: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const UserIdentityMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

export interface StaleChunkRouter {
  onError(handler: (error: unknown, to: { fullPath: string }) => unknown): unknown
}
export declare function installStaleChunkReload(router?: StaleChunkRouter): void
export declare function isStaleChunkError(error: unknown): boolean
