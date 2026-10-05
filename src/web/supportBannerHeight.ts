import { readonly, ref } from 'vue'

/**
 * Høyden på supportbanneret i `AppHeader` (SIGN-1547), i piksler — 0 når
 * banneret ikke vises.
 *
 * Banneret står over headerraden og gjør headeren høyere. Der headeren
 * flyter i dokumentet (nettsiden, company) skjer det av seg selv. Der den
 * ligger i en `v-app-bar` med fast høyde (Sign, Time, backoffice), må
 * app-baren få høyden lagt til, ellers dekker banneret innholdet under:
 *
 *   const supportBannerHeight = useSupportBannerHeight()
 *   <v-app-bar :height="HEADER_HEIGHT + supportBannerHeight">
 *
 * Banneret måler seg selv (teksten brytes på smale skjermer), så verdien
 * følger faktisk høyde — aldri en konstant i appen.
 */
const supportBannerHeight = ref(0)

/** Settes av banneret selv. Ikke for appene. */
export function setSupportBannerHeight(height: number): void {
  supportBannerHeight.value = Math.max(0, Math.ceil(height))
}

export function useSupportBannerHeight() {
  return readonly(supportBannerHeight)
}
