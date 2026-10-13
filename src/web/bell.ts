/**
 * Egen inngang for varslingsbjellen (SIGN-1295): nettsiden laster bjellen
 * bare for innloggede, og den skal da ikke ligge i fellespakka alle
 * besøkende henter. `web`-inngangen eksporterer bjellen som før; denne
 * finnes for den som vil hente den alene, i en egen modul.
 */
export { default as NotificationBellMenu } from './NotificationBellMenu.vue'
export type { NotificationBellCompany, NotificationBellItem, NotificationBellLabels } from './NotificationBellMenu.vue'
