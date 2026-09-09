/**
 * Vuetify-fri inngang for webflatene (nettsiden, admin, konto-appen,
 * company-appen) og produktappenes chrome (Sign, Time — SIGN-442). Egen entry
 * slik at konsumenter uten Vuetify aldri berører hovedinngangens
 * Vuetify-imports.
 */
// Temakontrakten (color-scheme følger `dark`-klassen) — havner i style.css.
import './theme.css'

export { default as AppLauncherMenu } from './AppLauncherMenu.vue'
export { default as AccountIdentityMenu } from './AccountIdentityMenu.vue'
export { default as TenantSwitcherMenu } from './TenantSwitcherMenu.vue'
export { default as BrandWordmark } from './BrandWordmark.vue'
export { default as ProductSymbol } from './ProductSymbol.vue'
export { default as AppHeader } from './AppHeader.vue'
export { default as PageHeader } from './PageHeader.vue'
export { default as ThemeToggle } from './ThemeToggle.vue'
export { default as NotificationBellMenu } from './NotificationBellMenu.vue'
export { default as NkSignedOutDialog } from './NkSignedOutDialog.vue'
export { useTheme } from './useTheme'

export type { AppLauncherItem } from './AppLauncherMenu.vue'
export type { AccountMenuService, AccountMenuLabels } from './AccountIdentityMenu.vue'
export type { TenantSwitcherOption, TenantSwitcherLabels } from './TenantSwitcherMenu.vue'
export type { AppHeaderNavItem, AppHeaderNavChild, AppHeaderLabels } from './AppHeader.vue'
export type { ProductSymbolKey } from './ProductSymbol.vue'
export type { BrandKey } from './BrandWordmark.vue'
export type { PageHeaderBack } from './PageHeader.vue'
export type { ThemeToggleLabels } from './ThemeToggle.vue'
export type { NotificationBellItem, NotificationBellLabels } from './NotificationBellMenu.vue'
export type { NkSignedOutDialogLabels, NkSignedOutReason } from './NkSignedOutDialog.vue'
export type { ThemePreference } from './useTheme'
export { webAppIcons, webAppIconFor, webAppFallbackIcon } from './appIcons'
export type { WebAppIconName } from './appIcons'

export { installStaleChunkReload, isStaleChunkError } from '../staleChunkReload'
export type { StaleChunkRouter } from '../staleChunkReload'

export { formatMinorAmount, formatMoney, formatMoneyRange, supportedCurrencyCodes, toBcp47 } from '../money'
export type { FormatMoneyOptions } from '../money'
