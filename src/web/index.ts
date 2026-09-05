/**
 * Vuetify-fri inngang for webflatene (nettsiden, konto-appen — og etter hvert
 * produktappenes produktvelger, jf. SIGN-94). Egen entry slik at konsumenter
 * uten Vuetify aldri berører hovedinngangens Vuetify-imports.
 */
export { default as AppTopBar } from './AppTopBar.vue'
export { default as AppLauncherMenu } from './AppLauncherMenu.vue'
export { default as AccountIdentityMenu } from './AccountIdentityMenu.vue'
export { default as TenantSwitcherMenu } from './TenantSwitcherMenu.vue'
export { default as BrandWordmark } from './BrandWordmark.vue'
export { default as AppHeader } from './AppHeader.vue'
export { default as PageHeader } from './PageHeader.vue'
export { default as ThemeToggle } from './ThemeToggle.vue'
export { useTheme } from './useTheme'

export type { AppLauncherItem } from './AppLauncherMenu.vue'
export type { AccountMenuService, AccountMenuLabels, AccountMenuTheme, AccountMenuThemeOption } from './AccountIdentityMenu.vue'
export type { TenantSwitcherOption, TenantSwitcherLabels } from './TenantSwitcherMenu.vue'
export type { AppHeaderNavItem, AppHeaderNavChild, AppHeaderLabels } from './AppHeader.vue'
export type { PageHeaderBack } from './PageHeader.vue'
export type { ThemeToggleLabels } from './ThemeToggle.vue'
export type { ThemePreference } from './useTheme'
export { webAppIcons, webAppIconFor, webAppFallbackIcon } from './appIcons'
export type { WebAppIconName } from './appIcons'

export { installStaleChunkReload, isStaleChunkError } from '../staleChunkReload'
export type { StaleChunkRouter } from '../staleChunkReload'
