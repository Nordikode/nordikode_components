/**
 * Vuetify-fri inngang for webflatene (nettsiden, konto-appen — og etter hvert
 * produktappenes produktvelger, jf. SIGN-94). Egen entry slik at konsumenter
 * uten Vuetify aldri berører hovedinngangens Vuetify-imports.
 */
export { default as AppLauncherMenu } from './AppLauncherMenu.vue'
export { default as AccountIdentityMenu } from './AccountIdentityMenu.vue'
export { default as BrandWordmark } from './BrandWordmark.vue'

export type { AppLauncherItem } from './AppLauncherMenu.vue'
export type { AccountMenuService, AccountMenuLabels } from './AccountIdentityMenu.vue'
export { webAppIcons, webAppIconFor, webAppFallbackIcon } from './appIcons'
export type { WebAppIconName } from './appIcons'
