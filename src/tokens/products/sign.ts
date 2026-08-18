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
    info: '#5e4b8b',
    attention: '#d9a62e',
    ...nkStatusLight,
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
    info: '#a992dd',
    attention: '#d9ad55',
    ...nkStatusDark,
    shadowSoft: 'rgba(0, 0, 0, 0.35)', // avledet
    shadowStrong: 'rgba(0, 0, 0, 0.5)', // avledet
    borderColor: '#eae6f4',
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
