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
    surfacePanel: '#565046', // avledet: textPrimary (lys) + 20 % hvitt — løftet panel (SIGN-968), lik i begge moduser
    onSurfacePanel: '#f1e9dd', // avledet: = dark.textPrimary — 6,6:1 på panel
    onSurfacePanelMuted: '#cac3b4', // avledet: dark.textSecondary lysnet — 4,6:1
    onSurfacePanelAccent: '#92d1b3', // avledet: onSuccessSoft lysnet — 4,6:1
    onSurfacePanelWarning: '#e0bf7b', // avledet: attention lysnet — 4,5:1
    onSurfacePanelLink: '#ecbb87', // avledet: dark.link lysnet — 4,6:1
    textPrimary: '#2c2418',
    textSecondary: '#716656', // avledet: #7d715f mørknet 10 % mot svart — 5,2:1 på side og myk flate (#7d715f målte 4,4:1), 5,6:1 på kort
    textTitle: '#2c2418', // avledet: = textPrimary til produktet adopterer ny palett
    primary: '#b45309',
    primaryHover: '#92400e',
    primaryPress: '#92400e', // avledet: = hover til produktet adopterer ny palett
    link: '#b45309', // avledet: = primary til produktet adopterer ny palett
    linkHover: '#92400e', // avledet
    onPrimary: '#ffffff',
    secondary: '#835d39', // avledet: #c98f57 mørknet 35 % mot svart — 5,0:1 som tonal-chip («Til godkjenning», #c98f57 målte 2,5:1), 5,4:1 på side
    onSecondary: '#ffffff', // 5,9:1 på secondary
    info: '#b45309',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9a62e',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    frame: '#b45309', // avledet: = primary til produktet får egen rammefarge
    onFrame: '#ffffff', // avledet
    ...nkStatusLight,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    // Statusflatene er 12 %-tinten av de opprinnelige statustonene (#1f8a55,
    // #c99a2e, #c0504d) og er uendret; statusteksten er statusfargen selv,
    // som siden SIGN-1198 er mørk nok til å holde 4,5:1 også her.
    // Teksten på de myke handlingsflatene er primaryHover: primary selv målte
    // 4,3:1 på tinten (SIGN-1198).
    primarySoft: '#f6eae1',
    onPrimarySoft: '#92400e', // avledet: = primaryHover — 6,0:1 på primarySoft
    infoSoft: '#f6eae1', // avledet: 12 %-blend av info over surface (som de andre soft-flatene)
    onInfoSoft: '#92400e', // avledet: = primaryHover — 6,0:1 på infoSoft
    aiSoft: '#f6eae1', // avledet: = infoSoft til produktet adopterer ny palett
    onAiSoft: '#92400e', // avledet: = onInfoSoft — 6,0:1 på aiSoft
    successSoft: '#e4f1eb',
    onSuccessSoft: '#176840', // avledet: = success — 5,9:1 på successSoft
    inflightSoft: '#f3e6d8', // avledet: felles kopper-tint (ny palett) til produktet adopterer den
    onInflightSoft: '#7c5322', // avledet: 5,5:1 på inflightSoft
    mutedSoft: '#faf6f0', // avledet: = surfaceSoft til produktet adopterer ny palett
    onMutedSoft: '#2c2418', // avledet
    warningSoft: '#f9f3e6',
    onWarningSoft: '#795c1c', // avledet: = warning — 5,7:1 på warningSoft
    errorSoft: '#f7eaea',
    onErrorSoft: '#9a403e', // avledet: = error — 5,6:1 på errorSoft
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
    surfacePanel: '#565046', // avledet: textPrimary (lys) + 20 % hvitt — løftet panel (SIGN-968), lik i begge moduser
    onSurfacePanel: '#f1e9dd', // avledet: = dark.textPrimary — 6,6:1 på panel
    onSurfacePanelMuted: '#cac3b4', // avledet: dark.textSecondary lysnet — 4,6:1
    onSurfacePanelAccent: '#92d1b3', // avledet: onSuccessSoft lysnet — 4,6:1
    onSurfacePanelWarning: '#e0bf7b', // avledet: attention lysnet — 4,5:1
    onSurfacePanelLink: '#ecbb87', // avledet: dark.link lysnet — 4,6:1
    textPrimary: '#f1e9dd',
    textSecondary: '#b3a893',
    textTitle: '#f1e9dd', // avledet: = textPrimary til produktet adopterer ny palett
    primary: '#e0913c',
    primaryHover: '#eaa55c',
    primaryPress: '#eaa55c', // avledet: = hover til produktet adopterer ny palett
    link: '#e0913c', // avledet: = primary til produktet adopterer ny palett
    linkHover: '#eaa55c', // avledet
    onPrimary: '#2c2418',
    secondary: '#d9b189',
    onSecondary: '#000000', // avledet: Vuetifys tidligere auto-verdi
    info: '#e0913c',
    onInfo: '#000000', // avledet: svart gir 8,3:1 (hvit 2,5:1)
    attention: '#d9ad55',
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    frame: '#e0913c', // avledet: = primary til produktet får egen rammefarge
    onFrame: '#2c2418', // avledet
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
    mutedSoft: '#2a2219', // avledet: = surfaceSoft til produktet adopterer ny palett
    onMutedSoft: '#f1e9dd', // avledet
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
