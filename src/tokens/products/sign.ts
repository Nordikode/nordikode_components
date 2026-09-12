import { nkOpacity } from '../base'
import type { NkProductTheme } from '../types'

// SIGN-604 (2026-09-09): ny palett vedtatt av teamet etter utforskingen i
// SIGN-583 (lab + forslagsside med skjermbilder og målt kontrast). Fargene
// har engelske navn:
//   tar         #0d1c26  blekk (løpende tekst) og mørk flate (rail, bånd, løftet panel)
//   plum        #2f1220  andre blekk: overskrifter og titler
//   berry       #aa4c6e  handling i lys modus (knapper, lenker, aktiv fane)
//   light berry #dc7499  merket (Sign-logoen) og handling i mørk modus
//   (periwinkle #90afed er Nordikodes blå og brukes ikke i Sign — SIGN-750)
//   lime        #bfd75b  fullført-familien (vunnet, bud mottatt, fortjeneste)
//   gold        #cca427  venter på noen (venter på kundesvar, ny sak, meldingsvarsler)
//   mauve       #b19eb4  dempet (kategorier, tagger, utkast)
//
// Palettens regel er fortsatt én farge, én jobb. Tinter er regnet ut som
// palettfargen blandet over flaten (prosent i kommentaren) og alle tekst/flate-
// par er målt til ≥ 4,5:1 i kjørende app (kontrastrevisjonen i SIGN-583).
// Verdier merket «avledet» finnes ikke som egen palettfarge.
//
// SIGN-679 (2026-09-10): blått er Nordikodes farge (logoen, platformTheme), så
// Sign eier berry alene; `info` er nøytral grå med dempet tint.
//
// SIGN-750 (2026-09-12): periwinkle er helt ute av Sign. AI-tinten (aiSoft,
// «maskinen snakker») er den samme kalde tar-tinten som markeringen
// (surfaceSoftAccent) med tar-tekst; det som skiller maskinens flater fra en
// valgt rad er «AI»-merket, ikke fargen. Blått finnes bare i platformTheme.
//
// SIGN-690 (2026-09-10, laben «Berry-dose og markering»): berry kun på handling.
// Knapper og lenker er berry; alt som bare viser noe er nøytralt: rammen (aktiv
// rail-knapp) er tar løftet med hvit 20 %, `secondary` (avatarer, firmabrikker)
// er mauve-tinten med tar-initial, og markeringsflaten (valgt rad, aktivt
// filter) er en kald tar-tint som leser som tar, ikke grå — den kaldeste som
// fortsatt holder 4,5:1 mot berry-lenker.
export const signTheme: NkProductTheme = {
  product: 'sign',
  vuetifyThemeName: 'NordikodeSign',
  light: {
    page: '#f3f3f5', // nøytral kald side («hvit» papir fra laben)
    surface: '#ffffff',
    surfaceSoft: '#f5f5f7',
    surfaceSoftAccent: '#e6eef6', // avledet: kald tar-tint (tars fargetone) — markering (valgt rad, aktivt filter); lenke 4,5:1, sekundærtekst 4,8:1, tar 14,8:1
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
    secondary: '#efeaf0', // = mutedSoft (mauve 30 %) — nøytrale avatarer og firmabrikker; tar-initial 14,6:1. Dekorative ikoner bruker textSecondary, ikke denne
    onSecondary: '#0d1c26',
    info: '#5f6970', // avledet: tar 66 % (= textSecondary) — nøytral informasjon, hvit etikett 5,6:1
    onInfo: '#ffffff',
    attention: '#cca427', // gold — tar-etikett 7,4:1
    onAttention: '#0d1c26',
    frame: '#3d4951', // avledet: hvit 20 % over tar — aktiv rail-knapp, 1,9:1 mot railen; lys ikon 8,3:1
    onFrame: '#f6f2ea',
    success: '#5b7423', // avledet: mørk lime (oliv) — hvit etikett 5,3:1
    onSuccess: '#ffffff',
    warning: '#8a5e0f', // varsel-700 beholdt: gold tåler ikke hvit etikett
    onWarning: '#ffffff',
    error: '#b4392b', // feil-500 beholdt
    onError: '#ffffff',
    primarySoft: '#f1e2e8', // berry 16 %
    onPrimarySoft: '#7a374f', // avledet — 6,8:1 på primarySoft
    infoSoft: '#efeaf0', // = mutedSoft: info er nøytral, ikke maskinen
    onInfoSoft: '#3d4951', // avledet: tar 80 % — 7,8:1 på infoSoft
    aiSoft: '#e6eef6', // maskinen = kald tar-tint (= surfaceSoftAccent) — ingen periwinkle i Sign (SIGN-750)
    onAiSoft: '#3d4951', // avledet: tar 80 % — 7,9:1 på aiSoft
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
    surfaceSoftAccent: '#1a222b', // kald grå-svart markering: valgt rad, aktivt filter — tekst 13,2:1, light berry 5,3:1
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
    secondary: '#2a2430', // = mutedSoft (mørk) — nøytrale avatarer og firmabrikker; lys initial 12,4:1
    onSecondary: '#e6e9ee',
    info: '#98a2ab', // avledet: = textSecondary (mørk) — nøytral, tar-etikett 6,7:1
    onInfo: '#0d1c26',
    attention: '#cca427', // gold
    onAttention: '#0d1c26',
    frame: '#2a333b', // avledet: løftet tar — aktiv rail-knapp, 1,6:1 mot mørk rail; lys ikon 11,5:1
    onFrame: '#f6f2ea',
    success: '#bfd75b', // lime som fyll, tar-etikett 10,8:1
    onSuccess: '#0d1c26',
    warning: '#cca427', // gold som fyll, tar-etikett 7,4:1
    onWarning: '#0d1c26',
    error: '#f2a093', // beholdt
    onError: '#3a1c17',
    primarySoft: '#3a1f2b', // berry dyp
    onPrimarySoft: '#e8b4c8', // 8,9:1
    infoSoft: '#2a2430', // = mutedSoft (mørk): info er nøytral
    onInfoSoft: '#e6e9ee', // 12,4:1
    aiSoft: '#1a222b', // maskinen: kald grå-svart flate (= surfaceSoftAccent) — ingen periwinkle i Sign (SIGN-750)
    onAiSoft: '#e6e9ee', // = textPrimary (mørk) — 13,2:1 på aiSoft
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
