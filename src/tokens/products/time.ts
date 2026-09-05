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
    surfaceInverse: '#231d16', // avledet: = dark.surface (mørkt panel i light)
    onSurfaceInverse: '#f1e9dd', // avledet: = dark.textPrimary — 13,9:1 på inverse
    onSurfaceInverseMuted: '#b3a893', // avledet: = dark.textSecondary — 7,1:1
    onSurfaceInverseAccent: '#4cb583', // avledet: = dark.onSuccessSoft — 6,6:1
    textPrimary: '#2c2418',
    textSecondary: '#7d715f',
    primary: '#b45309',
    primaryHover: '#92400e',
    primaryPress: '#92400e', // avledet: = hover til produktet adopterer ny palett
    link: '#b45309', // avledet: = primary til produktet adopterer ny palett
    linkHover: '#92400e', // avledet
    onPrimary: '#ffffff',
    secondary: '#c98f57',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#b45309',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9a62e',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusLight,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#f6eae1',
    onPrimarySoft: '#b45309',
    infoSoft: '#f6eae1', // avledet: 12 %-blend av info over surface (som de andre soft-flatene)
    onInfoSoft: '#b45309', // avledet: = info
    aiSoft: '#f6eae1', // avledet: = infoSoft til produktet adopterer ny palett
    onAiSoft: '#b45309', // avledet
    successSoft: '#e4f1eb',
    onSuccessSoft: '#1f8a55',
    inflightSoft: '#f3e6d8', // avledet: felles kopper-tint (ny palett) til produktet adopterer den
    onInflightSoft: '#7c5322', // avledet: 5,5:1 på inflightSoft
    warningSoft: '#f9f3e6',
    onWarningSoft: '#c99a2e',
    errorSoft: '#f7eaea',
    onErrorSoft: '#c0504d',
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
    surfaceInverse: '#2a2219', // avledet: = surfaceSoftAccent (løftet flate)
    onSurfaceInverse: '#f1e9dd', // avledet: = textPrimary — 13,0:1 på inverse
    onSurfaceInverseMuted: '#b3a893', // avledet: = textSecondary — 6,7:1
    onSurfaceInverseAccent: '#4cb583', // avledet: = onSuccessSoft — 6,2:1
    textPrimary: '#f1e9dd',
    textSecondary: '#b3a893',
    primary: '#e0913c',
    primaryHover: '#eaa55c',
    primaryPress: '#eaa55c', // avledet: = hover til produktet adopterer ny palett
    link: '#e0913c', // avledet: = primary til produktet adopterer ny palett
    linkHover: '#eaa55c', // avledet
    onPrimary: '#2c2418',
    secondary: '#d9b189',
    onSecondary: '#000000', // avledet: Vuetifys tidligere auto-verdi
    info: '#e0913c',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9ad55',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusDark,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#3a2b1b',
    onPrimarySoft: '#e0913c',
    infoSoft: '#3a2b1b', // avledet: 12 %-blend av info over surface
    onInfoSoft: '#e0913c', // avledet: = info
    aiSoft: '#3a2b1b', // avledet: = infoSoft til produktet adopterer ny palett
    onAiSoft: '#e0913c', // avledet
    successSoft: '#282f23',
    onSuccessSoft: '#4cb583',
    inflightSoft: '#33260f', // avledet: felles kopper-tint mørk (ny palett)
    onInflightSoft: '#dfb073', // avledet: 7,4:1 på inflightSoft
    warningSoft: '#392e1e',
    onWarningSoft: '#d9ad55',
    errorSoft: '#392822',
    onErrorSoft: '#d97b78',
    shadowSoft: 'rgba(0, 0, 0, 0.35)', // avledet
    shadowStrong: 'rgba(0, 0, 0, 0.5)', // avledet
    borderColor: '#f1e9dd',
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
