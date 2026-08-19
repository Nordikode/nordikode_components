import { nkOpacity, nkStatusDark, nkStatusLight } from '../base'
import type { NkProductTheme } from '../types'

// Verdier hentet fra nordikode_backoffice (plugins/vuetify.ts + style.css)
// 2026-08-18.
//
// Bevisst avvik fra dagens app (fase 1-beslutning): success/warning/error i
// light flyttet til felles statuspalett; backoffice hadde
// #2f7d5d/#b07a2f/#b54a4a. (Dark matchet allerede.)
export const backofficeTheme: NkProductTheme = {
  product: 'backoffice',
  vuetifyThemeName: 'NordikodeBackoffice',
  light: {
    page: '#fcf6f6',
    surface: '#ffffff',
    surfaceSoft: '#f7ebec',
    surfaceSoftAccent: '#f2d7db',
    surfaceRail: '#f7ebec', // avledet: = surfaceSoft
    railStart: '#f7ebec', // avledet
    railEnd: '#f2d7db', // avledet
    railIcon: '#d86a76', // avledet: = secondary
    railIconStrong: '#35171b', // avledet: = textPrimary
    surfaceBorder: 'rgba(159, 47, 59, 0.16)',
    surfaceGlass: 'rgba(255, 255, 255, 0.72)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.62)',
    textPrimary: '#35171b',
    textSecondary: '#7b5d62',
    primary: '#9f2f3b',
    primaryHover: '#7d2431',
    onPrimary: '#fff9fa',
    secondary: '#d86a76',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#7d2431',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#c99a2e', // avledet: = felles warning
    onAttention: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusLight,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#f3e6e7',
    onPrimarySoft: '#9f2f3b',
    successSoft: '#e4f1eb',
    onSuccessSoft: '#1f8a55',
    warningSoft: '#f9f3e6',
    onWarningSoft: '#c99a2e',
    errorSoft: '#f7eaea',
    onErrorSoft: '#c0504d',
    shadowSoft: 'rgba(53, 23, 27, 0.14)',
    shadowStrong: 'rgba(53, 23, 27, 0.2)',
    borderColor: '#35171b', // avledet (ingen variables-blokk i appen)
    borderOpacity: nkOpacity.borderLight,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisLight,
  },
  dark: {
    page: '#1c1214',
    surface: '#271a1e',
    surfaceSoft: '#2e2024',
    surfaceSoftAccent: '#3a282e',
    surfaceRail: '#2e2024', // avledet
    railStart: '#2e2024', // avledet
    railEnd: '#3a282e', // avledet
    railIcon: '#e08f99', // avledet: = secondary
    railIconStrong: '#f2e4e6', // avledet: = textPrimary
    surfaceBorder: 'rgba(242, 228, 230, 0.14)',
    surfaceGlass: 'rgba(39, 26, 30, 0.72)',
    surfaceSubtle: 'rgba(39, 26, 30, 0.62)',
    textPrimary: '#f2e4e6',
    textSecondary: '#bfa3a8',
    primary: '#d4707b',
    primaryHover: '#df8a94',
    onPrimary: '#35171b',
    secondary: '#e08f99',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#df8a94',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9ad55', // avledet: = felles warning (dark)
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusDark,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#3c2429',
    onPrimarySoft: '#d4707b',
    successSoft: '#2b2d2a',
    onSuccessSoft: '#4cb583',
    warningSoft: '#3c2c25',
    onWarningSoft: '#d9ad55',
    errorSoft: '#3c2629',
    onErrorSoft: '#d97b78',
    shadowSoft: 'rgba(0, 0, 0, 0.45)',
    shadowStrong: 'rgba(0, 0, 0, 0.6)',
    borderColor: '#f2e4e6', // avledet
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
