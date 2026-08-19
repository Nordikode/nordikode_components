import { nkOpacity, nkStatusDark, nkStatusLight } from '../base'
import type { NkProductTheme } from '../types'

// Verdier hentet uendret fra sign-web (plugins/vuetify.ts + style.css)
// 2026-08-18. Verdier merket «avledet» fantes ikke i appen og er utledet
// mekanisk fra eksisterende farger.
export const signTheme: NkProductTheme = {
  product: 'sign',
  vuetifyThemeName: 'NordikodeSign',
  light: {
    page: '#f6f4fa',
    surface: '#ffffff',
    surfaceSoft: '#f6f4fa',
    surfaceSoftAccent: '#f6f4fa', // avledet: = surfaceSoft
    surfaceRail: '#f4eff8',
    railStart: '#dfdbed',
    railEnd: '#ecdde9',
    railIcon: '#b49db9',
    railIconStrong: '#47406a',
    surfaceBorder: 'rgba(33, 29, 53, 0.1)',
    surfaceGlass: 'rgba(255, 255, 255, 0.72)', // avledet
    surfaceSubtle: 'rgba(255, 255, 255, 0.62)', // avledet
    textPrimary: '#211d35',
    textSecondary: '#6b6880',
    primary: '#5e4b8b',
    primaryHover: '#4c3c73',
    onPrimary: '#ffffff',
    secondary: '#8a7ab8',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#5e4b8b',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9a62e',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusLight,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#ece9f1',
    onPrimarySoft: '#5e4b8b',
    successSoft: '#e4f1eb',
    onSuccessSoft: '#1f8a55',
    warningSoft: '#f9f3e6',
    onWarningSoft: '#c99a2e',
    errorSoft: '#f7eaea',
    onErrorSoft: '#c0504d',
    shadowSoft: 'rgba(33, 29, 53, 0.14)', // avledet
    shadowStrong: 'rgba(33, 29, 53, 0.2)', // avledet
    borderColor: '#211d35',
    borderOpacity: nkOpacity.borderLight,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisLight,
  },
  dark: {
    page: '#15121f',
    surface: '#1e192c',
    surfaceSoft: '#241e33',
    surfaceSoftAccent: '#241e33', // avledet
    surfaceRail: '#191424',
    railStart: '#241e33',
    railEnd: '#2b2140',
    railIcon: '#8d7f9f',
    railIconStrong: '#cfc4e6',
    surfaceBorder: 'rgba(234, 230, 244, 0.14)',
    surfaceGlass: 'rgba(30, 25, 44, 0.72)', // avledet
    surfaceSubtle: 'rgba(30, 25, 44, 0.62)', // avledet
    textPrimary: '#eae6f4',
    textSecondary: '#a49fb8',
    primary: '#a992dd',
    primaryHover: '#bda9e8',
    onPrimary: '#211d35',
    // NB: samme som light — eneste farge Sign delte mellom moduser; trolig en
    // glipp i appen, men beholdt uendret til det er designvurdert.
    secondary: '#8a7ab8',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#a992dd',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9ad55',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusDark,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#2f2841',
    onPrimarySoft: '#a992dd',
    successSoft: '#242c36',
    onSuccessSoft: '#4cb583',
    warningSoft: '#342b31',
    onWarningSoft: '#d9ad55',
    errorSoft: '#342535',
    onErrorSoft: '#d97b78',
    shadowSoft: 'rgba(0, 0, 0, 0.35)', // avledet
    shadowStrong: 'rgba(0, 0, 0, 0.5)', // avledet
    borderColor: '#eae6f4',
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
