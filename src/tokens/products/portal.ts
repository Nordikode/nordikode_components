import { nkOpacity, nkStatusDark, nkStatusLight } from '../base'
import type { NkProductTheme } from '../types'

// Verdier hentet fra portal (plugins/vuetify.ts + style.css) 2026-08-18.
//
// To bevisste avvik fra dagens app (fase 1-beslutninger):
// - textPrimary: appens CSS-token sa #102a36 mens Vuetify-temaet sa #19323f
//   for samme rolle. Samlet på Vuetify-verdien.
// - success/warning/error (light): flyttet til felles Nordikode-statuspalett;
//   portal hadde #2f7d5d/#b07a2f/#b54a4a.
//
// Portalens admin-tema (NordikodeAdmin, teal) er IKKE tokenisert ennå — det
// mangler for mange kildeverdier til å avlede uten designvurdering.
export const portalTheme: NkProductTheme = {
  product: 'portal',
  vuetifyThemeName: 'Nordikode',
  light: {
    page: '#f6f8f9',
    surface: '#ffffff',
    surfaceSoft: '#dfecef',
    surfaceSoftAccent: '#dfeaf0',
    surfaceRail: '#dfecef', // avledet: = surfaceSoft (portal hadde ingen rail-flate)
    railStart: '#dfecef', // avledet
    railEnd: '#dfeaf0', // avledet
    railIcon: '#6f8591', // avledet: = secondary
    railIconStrong: '#19323f', // avledet: = textPrimary
    surfaceBorder: 'rgba(84, 109, 121, 0.18)',
    surfaceGlass: 'rgba(255, 255, 255, 0.72)',
    surfaceSubtle: 'rgba(255, 255, 255, 0.62)',
    surfaceInverse: '#18262d', // avledet: = dark.surface (mørkt panel i light)
    onSurfaceInverse: '#dfeaef', // avledet: = dark.textPrimary — 12,7:1 på inverse
    onSurfaceInverseMuted: '#9db3bc', // avledet: = dark.textSecondary — 7,1:1
    onSurfaceInverseAccent: '#4cb583', // avledet: = dark.onSuccessSoft — 6,1:1
    textPrimary: '#19323f',
    textSecondary: '#4d6570',
    primary: '#2a6072',
    primaryHover: '#1f4f60',
    onPrimary: '#ffffff',
    secondary: '#6f8591',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#46606b',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#c99a2e', // avledet: = felles warning (portal hadde ingen attention)
    onAttention: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusLight,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#e5ecee',
    onPrimarySoft: '#2a6072',
    successSoft: '#e4f1eb',
    onSuccessSoft: '#1f8a55',
    warningSoft: '#f9f3e6',
    onWarningSoft: '#c99a2e',
    errorSoft: '#f7eaea',
    onErrorSoft: '#c0504d',
    shadowSoft: 'rgba(25, 50, 63, 0.14)',
    shadowStrong: 'rgba(25, 50, 63, 0.2)',
    borderColor: '#19323f', // avledet (portal hadde ingen variables-blokk)
    borderOpacity: nkOpacity.borderLight,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisLight,
  },
  dark: {
    page: '#101b20',
    surface: '#18262d',
    surfaceSoft: '#16262c',
    surfaceSoftAccent: '#152730',
    surfaceRail: '#16262c', // avledet
    railStart: '#16262c', // avledet
    railEnd: '#152730', // avledet
    railIcon: '#8fa5ae', // avledet: = secondary
    railIconStrong: '#dfeaef', // avledet: = textPrimary
    surfaceBorder: 'rgba(194, 214, 222, 0.16)',
    surfaceGlass: 'rgba(24, 38, 45, 0.72)',
    surfaceSubtle: 'rgba(24, 38, 45, 0.62)',
    surfaceInverse: '#152730', // avledet: = surfaceSoftAccent (løftet flate)
    onSurfaceInverse: '#dfeaef', // avledet: = textPrimary — 12,6:1 på inverse
    onSurfaceInverseMuted: '#9db3bc', // avledet: = textSecondary — 7,0:1
    onSurfaceInverseAccent: '#4cb583', // avledet: = onSuccessSoft — 6,0:1
    textPrimary: '#dfeaef',
    textSecondary: '#9db3bc',
    primary: '#6db3c7',
    primaryHover: '#86c3d4',
    onPrimary: '#0e2229',
    secondary: '#8fa5ae',
    onSecondary: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    info: '#7fa8b8',
    onInfo: '#ffffff', // avledet: Vuetifys tidligere auto-verdi
    attention: '#d9ad55', // avledet: = felles warning (dark)
    onAttention: '#000000', // avledet: Vuetifys tidligere auto-verdi
    ...nkStatusDark,
    // Myke flater — avledet: eksakt blend-ekvivalent av Vuetifys tonal-
    // rendering (farge på 12 % over kortflaten), så utseendet er uendret.
    primarySoft: '#22373f',
    onPrimarySoft: '#6db3c7',
    successSoft: '#1e3737',
    onSuccessSoft: '#4cb583',
    warningSoft: '#2f3632',
    onWarningSoft: '#d9ad55',
    errorSoft: '#2f3036',
    onErrorSoft: '#d97b78', // portal dark hadde #55a884/#cf9c53/#d17c7c — samlet på felles
    shadowSoft: 'rgba(0, 0, 0, 0.35)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',
    borderColor: '#dfeaef', // avledet
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
