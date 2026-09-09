import { nkOpacity } from '../base'
import type { NkProductTheme } from '../types'

// SIGN-604 (2026-09-09): ny palett vedtatt av teamet etter utforskingen i
// SIGN-583 (lab + forslagsside med skjermbilder og målt kontrast). Fargene
// har engelske navn:
//   tar         #0d1c26  blekk (løpende tekst) og mørk flate (rail, bånd, løftet panel)
//   plum        #2f1220  andre blekk: overskrifter og titler
//   berry       #aa4c6e  handling i lys modus (knapper, lenker, aktiv fane)
//   light berry #dc7499  merket (Sign-logoen) og handling i mørk modus
//   periwinkle  #90afed  rammen og maskinen: hel på aktiv rail-knapp, ellers som lys tint
//   lime        #bfd75b  fullført-familien (vunnet, bud mottatt, fortjeneste)
//   gold        #cca427  venter på noen (venter på kundesvar, ny sak, meldingsvarsler)
//   mauve       #b19eb4  dempet (kategorier, tagger, utkast)
//
// Palettens regel er fortsatt én farge, én jobb. Tinter er regnet ut som
// palettfargen blandet over flaten (prosent i kommentaren) og alle tekst/flate-
// par er målt til ≥ 4,5:1 i kjørende app (kontrastrevisjonen i SIGN-583).
// Verdier merket «avledet» finnes ikke som egen palettfarge.
export const signTheme: NkProductTheme = {
  product: 'sign',
  vuetifyThemeName: 'NordikodeSign',
  light: {
    page: '#f3f3f5', // nøytral kald side («hvit» papir fra laben)
    surface: '#ffffff',
    surfaceSoft: '#f5f5f7',
    surfaceSoftAccent: '#e9effb', // periwinkle 20 %: valgt rad, aktivt filter — berry-tekst 4,6:1
    surfaceRail: '#0d1c26', // tar — flat rail, ingen gradient
    railStart: '#0d1c26',
    railEnd: '#0d1c26',
    railIcon: 'rgba(246, 242, 234, 0.55)',
    railIconStrong: '#f6f2ea',
    surfaceBorder: 'rgba(13, 28, 38, 0.12)', // avledet: tar-hairline over hvit
    surfaceGlass: 'rgba(255, 255, 255, 0.72)', // avledet
    surfaceSubtle: 'rgba(255, 255, 255, 0.62)', // avledet
    surfaceInverse: '#0d1c26', // tar — samme mørke flate som railen
    onSurfaceInverse: '#f6f2ea', // 15,5:1 på inverse
    onSurfaceInverseMuted: '#9aa7ad', // avledet, 7,0:1 på inverse
    onSurfaceInverseAccent: '#bfd75b', // lime — 10,8:1 på inverse
    textPrimary: '#0d1c26', // tar
    textSecondary: '#5f6970', // avledet: tar 66 % over hvit — 5,6:1
    textTitle: '#2f1220', // plum — 17:1
    primary: '#aa4c6e', // berry — hvit etikett 5,3:1
    primaryHover: '#92415f', // avledet: berry mørknet — 6,7:1
    primaryPress: '#7e3852', // avledet
    onPrimary: '#ffffff',
    link: '#aa4c6e', // berry — 5,3:1 på hvit, 4,8:1 på page
    linkHover: '#92415f',
    secondary: '#35569f', // avledet: mørk periwinkle som tekst/fyll — 7,0:1 på hvit
    onSecondary: '#ffffff',
    info: '#35569f', // avledet, som secondary
    onInfo: '#ffffff',
    attention: '#cca427', // gold — tar-etikett 7,4:1
    onAttention: '#0d1c26',
    frame: '#90afed', // periwinkle — aktiv rail-knapp, tar-ikon 7,9:1
    onFrame: '#0d1c26',
    success: '#5b7423', // avledet: mørk lime (oliv) — hvit etikett 5,3:1
    onSuccess: '#ffffff',
    warning: '#8a5e0f', // varsel-700 beholdt: gold tåler ikke hvit etikett
    onWarning: '#ffffff',
    error: '#b4392b', // feil-500 beholdt
    onError: '#ffffff',
    primarySoft: '#f1e2e8', // berry 16 %
    onPrimarySoft: '#7a374f', // avledet — 6,8:1 på primarySoft
    infoSoft: '#e2eafa', // periwinkle 26 %
    onInfoSoft: '#35569f', // 6,1:1 på infoSoft
    aiSoft: '#e2eafa', // maskinen = periwinkle-tint (samme flate som info, egen rolle)
    onAiSoft: '#35569f',
    successSoft: '#ecf3ce', // lime 30 %
    onSuccessSoft: '#4f6a1f', // avledet — 5,4:1 på successSoft
    inflightSoft: '#f3e6d8', // kopper-tint beholdt (underveis)
    onInflightSoft: '#7c5322', // 5,5:1
    mutedSoft: '#efeaf0', // mauve 30 %
    onMutedSoft: '#0d1c26', // tar — 15:1
    warningSoft: '#eee0b6', // gold 34 %
    onWarningSoft: '#504c26', // avledet: gold 35 % mot tar — 6,7:1
    errorSoft: '#f8e2de', // feil-100 beholdt
    onErrorSoft: '#96301f',
    shadowSoft: 'rgba(13, 28, 38, 0.14)', // avledet: tar-tonet
    shadowStrong: 'rgba(13, 28, 38, 0.2)', // avledet
    borderColor: '#0d1c26',
    borderOpacity: nkOpacity.borderLight,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisLight,
  },
  // Mørk modus (SIGN-604): nesten svarte flater med tar-understrøm, ikke invertert
  // lys. Markeringsflater er grå-svart, ikke blå. Berry (#aa4c6e) som tekst målte
  // 3,1–3,8:1 på nesten svart, så handling er light berry med tar-etikett; hover
  // går lysere fordi etiketten er mørk. Teksten er aldri ren hvit.
  dark: {
    page: '#050708',
    surface: '#0e1216',
    surfaceSoft: '#080b0e',
    surfaceSoftAccent: '#1b2026', // grå-svart markering: valgt rad, aktivt filter
    surfaceRail: '#020304',
    railStart: '#020304',
    railEnd: '#020304',
    railIcon: 'rgba(246, 242, 234, 0.55)', // som light — railen er mørk i begge
    railIconStrong: '#f6f2ea',
    surfaceBorder: 'rgba(255, 255, 255, 0.09)',
    surfaceGlass: 'rgba(14, 18, 22, 0.72)', // avledet
    surfaceSubtle: 'rgba(14, 18, 22, 0.62)', // avledet
    surfaceInverse: '#161d25', // løftet panel (Tilbudssammendrag)
    onSurfaceInverse: '#e6e9ee',
    onSurfaceInverseMuted: '#98a2ab',
    onSurfaceInverseAccent: '#bfd75b', // lime
    textPrimary: '#e6e9ee',
    textSecondary: '#98a2ab', // 5,6:1 på kort
    textTitle: '#e9d3db', // plum lysnet — overskrifter på mørkt
    primary: '#dc7499', // light berry — tar-etikett 5,8:1; som tekst 6,2:1 på kort
    primaryHover: '#e38bab', // lysere: etiketten er mørk
    primaryPress: '#c9668a',
    onPrimary: '#0d1c26',
    link: '#dc7499', // light berry — 6,2:1 på kort, 5,6:1 på markering
    linkHover: '#e795b3',
    secondary: '#90afed', // periwinkle — 7,9:1 på tar
    onSecondary: '#0d1c26',
    info: '#90afed',
    onInfo: '#0d1c26',
    attention: '#cca427', // gold
    onAttention: '#0d1c26',
    frame: '#90afed', // periwinkle — aktiv rail-knapp
    onFrame: '#0d1c26',
    success: '#bfd75b', // lime som fyll, tar-etikett 10,8:1
    onSuccess: '#0d1c26',
    warning: '#cca427', // gold som fyll, tar-etikett 7,4:1
    onWarning: '#0d1c26',
    error: '#f2a093', // beholdt
    onError: '#3a1c17',
    primarySoft: '#3a1f2b', // berry dyp
    onPrimarySoft: '#e8b4c8', // 8,9:1
    infoSoft: '#1b2026', // grå-svart flate, periwinkle tekst
    onInfoSoft: '#90afed',
    aiSoft: '#1b2026',
    onAiSoft: '#a9c1f2',
    successSoft: '#26300f', // lime dyp
    onSuccessSoft: '#c9dd75',
    inflightSoft: '#33260f', // kopper dyp beholdt
    onInflightSoft: '#dfb073',
    mutedSoft: '#2a2430', // mauve dyp
    onMutedSoft: '#e6e9ee',
    warningSoft: '#332a10', // gold dyp
    onWarningSoft: '#dfc056',
    errorSoft: '#3a1c17', // beholdt
    onErrorSoft: '#f2a093',
    shadowSoft: 'rgba(0, 0, 0, 0.55)',
    shadowStrong: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#ffffff',
    borderOpacity: nkOpacity.borderDark,
    mediumEmphasisOpacity: nkOpacity.mediumEmphasisDark,
  },
}
