import { nkOpacity, nkStatusDark, nkStatusLight } from '../base'
import type { NkProductTheme } from '../types'

// Verdier hentet uendret fra time-web (plugins/vuetify.ts + style.css)
// 2026-08-18. «Avledet» = fantes ikke i appen, utledet mekanisk.
export const timeTheme: NkProductTheme = {
  product: 'time',
  vuetifyThemeName: 'NordikodeTime',
  light: {
    page: '#faf6f0',
    surface: '#ffffff',
    surfaceSoft: '#faf6f0',
    surfaceSoftAccent: '#faf6f0', // avledet: = surfaceSoft
    surfaceRail: '#f8efe2',
    railStart: '#f1e3cd',
    railEnd: '#f7ddc4',
    railIcon: '#c9a382',
    railIconStrong: '#6b4a24',
    surfaceBorder: 'rgba(44, 36, 24, 0.12)',
    surfaceGlass: 'rgba(255, 255, 255, 0.72)', // avledet
    surfaceSubtle: 'rgba(255, 255, 255, 0.62)', // avledet
    textPrimary: '#2c2418',
    textSecondary: '#7d715f',
    primary: '#b45309',
    primaryHover: '#92400e',
    onPrimary: '#ffffff',
    secondary: '#c98f57',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#b45309',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9a62e',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusLight,
    shadowSoft: 'rgba(44, 36, 24, 0.14)', // avledet
    shadowStrong: 'rgba(44, 36, 24, 0.2)', // avledet
    borderColor: '#2c2418',
    borderOpacity: nkOpacity.borderLight,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisLight,
  },
  dark: {
    page: '#191510',
    surface: '#231d16',
    surfaceSoft: '#2a2219',
    surfaceSoftAccent: '#2a2219', // avledet
    surfaceRail: '#1e1812',
    railStart: '#2a2219',
    railEnd: '#332a1e',
    railIcon: '#a08d72',
    railIconStrong: '#e6d9c4',
    surfaceBorder: 'rgba(241, 233, 221, 0.14)',
    surfaceGlass: 'rgba(35, 29, 22, 0.72)', // avledet
    surfaceSubtle: 'rgba(35, 29, 22, 0.62)', // avledet
    textPrimary: '#f1e9dd',
    textSecondary: '#b3a893',
    primary: '#e0913c',
    primaryHover: '#eaa55c',
    onPrimary: '#2c2418',
    secondary: '#d9b189',
    onSecondary: '#000000', // avledet: Vuetifys tidligere auto-verdi
    info: '#e0913c',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9ad55',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusDark,
    shadowSoft: 'rgba(0, 0, 0, 0.35)', // avledet
    shadowStrong: 'rgba(0, 0, 0, 0.5)', // avledet
    borderColor: '#f1e9dd',
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
