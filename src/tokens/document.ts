import { signTheme } from './products/sign'
import type { NkDocumentScheme } from './types'

// SIGN-610 (2026-09-09): tokens for kundevendte dokumenter («papir»).
//
// Dokumentet er lyst i begge fargemoduser og skal se likt ut i web, print og
// PDF. Rollene bygger på Sign-paletten fra SIGN-604 (tar som blekk og bånd,
// plum som tittel, berry som handling, gold som venter, lime/oliv som
// fullført) og leser verdiene fra `signTheme.light` der rollen finnes der —
// endres paletten, følger papiret med. Verdier merket «avledet» er tinter
// regnet som palettfargen blandet over arket (prosent i kommentaren).
//
// Kontrasten for alle tekst/flate-par står i Storybook «Design system/
// Tilgjengelighet» (alle ≥ 4,5:1).
const palette = signTheme.light

export const documentScheme: NkDocumentScheme = {
  paper: palette.surface, // #ffffff
  paperSoft: palette.surfaceSoft, // #f5f5f7
  border: '#e2e4e5', // avledet: tar 12 % over arket
  borderSoft: '#f0f1f2', // avledet: tar 6 % over arket
  ink: palette.textPrimary, // tar — 17,3:1 på arket
  inkSoft: '#3d4951', // avledet: tar 80 % over arket — 9,3:1
  inkMuted: palette.textSecondary, // 5,6:1 på arket, 5,2:1 på paperSoft
  title: palette.textTitle, // plum — 17,1:1
  band: palette.surfaceInverse, // tar
  onBand: palette.onSurfaceInverse, // 15,5:1 på båndet
  onBandMuted: palette.onSurfaceInverseMuted, // 7,0:1 på båndet
  accent: palette.primary, // berry — 5,3:1 på arket
  onAccent: palette.onPrimary,
  accentSoft: palette.primarySoft, // berry 16 %
  onAccentSoft: palette.onPrimarySoft, // 6,7:1 på accentSoft
  accentBorder: '#e6c9d4', // avledet: berry 30 % over arket
  attention: palette.attention, // gold — tar-etikett 7,4:1
  onAttention: palette.onAttention,
  attentionSoft: palette.warningSoft, // gold 34 %
  onAttentionSoft: palette.onWarningSoft, // 6,6:1 på attentionSoft
  attentionBorder: '#e3cd88', // avledet: gold 55 % over arket
  success: palette.success, // oliv — hvit etikett 5,3:1
  onSuccess: palette.onSuccess,
  successSoft: palette.successSoft, // lime 30 %
  onSuccessSoft: palette.onSuccessSoft, // 5,4:1 på successSoft
  shadow: palette.shadowSoft, // tar-tonet
}
