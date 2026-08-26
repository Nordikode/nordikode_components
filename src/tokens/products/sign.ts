import { nkOpacity } from '../base'
import type { NkProductTheme } from '../types'

// SIGN-139: ny palett fra designsystemet (Claude Design «Nordikode Design
// System», 2026-08-24). Light er hentet uendret fra tokens/colors.css og
// dark fra tokens/dark.css; verdier merket «avledet» fantes ikke der og er
// utledet mekanisk.
//
// Palettens regel: én farge har én jobb.
//   petrol  → handling (knapper, aktiv fane, lenker, fokus)
//   fjord   → rammen og maskinen (rail, AI-flater, info)
//   nordlys → fullført (kun tint)
//   varsel/feil → status
// Statusfargene overstyres her per Sign (basepaletten nkStatusLight/Dark
// beholdes av de andre produktene til de adopterer den nye paletten).
export const signTheme: NkProductTheme = {
  product: 'sign',
  vuetifyThemeName: 'NordikodeSign',
  light: {
    page: '#eff1f2', // snø-100
    surface: '#ffffff',
    surfaceSoft: '#f5f7f8', // snø-50
    surfaceSoftAccent: '#e0f5f2', // petrol-100
    surfaceRail: '#0d1c26', // fjord-900 — mørk rail («the spine»)
    railStart: '#0d1c26', // fjord-900, flat — designet har ingen gradient
    railEnd: '#0d1c26',
    railIcon: 'rgba(246, 242, 234, 0.55)',
    railIconStrong: '#f6f2ea',
    surfaceBorder: 'rgba(13, 28, 38, 0.12)', // avledet: ≈ snø-300-hairline over hvit
    surfaceGlass: 'rgba(255, 255, 255, 0.72)', // avledet
    surfaceSubtle: 'rgba(255, 255, 255, 0.62)', // avledet
    surfaceInverse: '#0d1c26', // fjord-900 — samme mørke flate som railen («the spine»)
    onSurfaceInverse: '#f6f2ea', // = railIconStrong — 15,5:1 på inverse
    onSurfaceInverseMuted: '#9aa7ad', // avledet: dempet fjord-tone — 7,0:1 på inverse
    onSurfaceInverseAccent: '#7fe0ab', // nordlys (status-ok-fg fra dark) — 10,9:1 på inverse
    textPrimary: '#241e18', // tjære-800
    textSecondary: '#6b6055', // stein-500
    primary: '#0b8476', // petrol-500 — 4,59:1 mot hvit
    primaryHover: '#097568', // petrol-600
    onPrimary: '#ffffff',
    secondary: '#274c5e', // fjord-500
    onSecondary: '#ffffff',
    info: '#274c5e', // fjord-500
    onInfo: '#ffffff',
    attention: '#d99b2b', // varsel-500
    onAttention: '#14100d', // tjære-900
    success: '#0e633c', // nordlys-700
    onSuccess: '#ffffff',
    warning: '#8a5e0f', // varsel-700
    onWarning: '#ffffff',
    error: '#b4392b', // feil-500
    onError: '#ffffff',
    primarySoft: '#e0f5f2', // petrol-100
    onPrimarySoft: '#08675c', // petrol-700
    infoSoft: '#e7edf1', // fjord-tint — AI-flater (SIGN-174); 7,8:1 mot onInfoSoft
    onInfoSoft: '#274c5e', // fjord-500
    successSoft: '#e2faec', // nordlys-100
    onSuccessSoft: '#0e633c', // nordlys-700
    warningSoft: '#fbeed2', // varsel-100
    onWarningSoft: '#8a5e0f', // varsel-700
    errorSoft: '#f8e2de', // feil-100
    onErrorSoft: '#96301f', // feil-600
    shadowSoft: 'rgba(13, 28, 38, 0.14)', // avledet: fjord-tonet
    shadowStrong: 'rgba(13, 28, 38, 0.2)', // avledet
    borderColor: '#14100d', // tjære-900
    borderOpacity: nkOpacity.borderLight,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisLight,
  },
  // Dark er designet i Claude Design (tokens/dark.css, 2026-08-24): «tjære,
  // blåkald» — nesten-svart side med blå understrøm, ikke invertert light.
  // Reglene derfra: teksten er aldri ren hvit; petrol-500 beholdes uendret som
  // fyll (hover/press går MØRKERE, så hvit etikett aldri faller under AA);
  // mørke flater forblir mørke i begge moduser (railen), så ikonene der er
  // like lyse som i light. Status = dyp tint + lys forgrunn, målt ≥ 7,2:1.
  dark: {
    page: '#07090c', // sky-page
    surface: '#111519', // sky-card
    surfaceSoft: '#0a0d10', // sky-sunken
    surfaceSoftAccent: '#0d2725', // surface-selected — petrolfarget dyp fylling
    surfaceRail: '#030507', // surface-dark-deep
    railStart: '#030507',
    railEnd: '#030507',
    railIcon: 'rgba(246, 242, 234, 0.55)', // som light — railen er mørk i begge
    railIconStrong: '#f6f2ea',
    surfaceBorder: 'rgba(255, 255, 255, 0.09)', // border-hairline (#ffffff16)
    surfaceGlass: 'rgba(17, 21, 25, 0.72)', // avledet: kortflaten som glass
    surfaceSubtle: 'rgba(17, 21, 25, 0.62)', // avledet
    surfaceInverse: '#16283a', // avledet: fjord-tonet løftet flate — skiller seg fra kortflaten
    onSurfaceInverse: '#cbd3d8', // = textPrimary — 9,9:1 på inverse
    onSurfaceInverseMuted: '#87919a', // = textSecondary — 4,7:1 på inverse
    onSurfaceInverseAccent: '#7fe0ab', // = onSuccessSoft — 9,4:1 på inverse
    textPrimary: '#cbd3d8', // text-body — 12,0:1 på kort
    textSecondary: '#87919a', // text-muted — 5,6:1
    primary: '#0b8476', // petrol-500 — samme fyll som light, 4,59:1 med hvit
    primaryHover: '#0a7a6d', // mørkere, ikke lysere — 5,23:1 med hvit
    onPrimary: '#ffffff',
    secondary: '#9bc2d4', // status-info-fg — den kalde maskintonen
    onSecondary: '#0a171e', // avledet: select-text
    info: '#9bc2d4',
    onInfo: '#0a171e', // avledet
    attention: '#e8b863', // status-warn-fg
    onAttention: '#14100d',
    success: '#7fe0ab', // status-ok-fg som fyll, dyp tint som etikett
    onSuccess: '#123a2a',
    warning: '#e8b863',
    onWarning: '#3a2a16',
    error: '#f2a093', // status-error-fg
    onError: '#3a1c17',
    primarySoft: '#0d2725', // surface-selected
    onPrimarySoft: '#5cc0b4', // text-link — 7,2:1 på kort
    infoSoft: '#101b26', // fjord-tint mørk — svakt løftet, blåkald (SIGN-174)
    onInfoSoft: '#9bc2d4', // status-info-fg — 9,2:1 på infoSoft
    successSoft: '#123a2a', // status-ok-bg
    onSuccessSoft: '#7fe0ab',
    warningSoft: '#3a2a16', // status-warn-bg
    onWarningSoft: '#e8b863',
    errorSoft: '#3a1c17', // status-error-bg
    onErrorSoft: '#f2a093',
    shadowSoft: 'rgba(0, 0, 0, 0.45)', // shadow-2 — shadow-1 er none i dark
    shadowStrong: 'rgba(0, 0, 0, 0.6)', // shadow-3
    borderColor: '#ffffff',
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
