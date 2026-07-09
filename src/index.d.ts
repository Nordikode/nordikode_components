declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

export { default as AppSidebarRail } from './components/AppSidebarRail.vue'
export { default as AppTopHeader } from './components/AppTopHeader.vue'
export { default as AppBreadcrumbs } from './components/AppBreadcrumbs.vue'
export { default as IdentityAvatar } from './components/IdentityAvatar.vue'
export { default as PhoneNumberInput } from './components/PhoneNumberInput.vue'
export { default as TenantSelector } from './components/TenantSelector.vue'
export { default as UserIdentityMenu } from './components/UserIdentityMenu.vue'

export type { AppSidebarRailItem } from './types/AppSidebarRailItem'
export type { AppBreadcrumbItem } from './types/AppBreadcrumbItem'
export type { HeaderTenantOption } from './types/HeaderTenantOption'
export type { SharedLocale } from './types/SharedLocale'
