// Typene for Nordikode design-tokens.
//
// Én NkScheme per fargemodus, én NkProductTheme per produkt. Strukturen er
// bevisst identisk for alle produkter (fase 1-beslutning) — appene skal aldri
// mer definere temaer med ulikt sett nøkler.

export interface NkScheme {
  /** Sidebakgrunn (den grå/tonede flaten bak kortene). */
  page: string
  /** Kort/flate-bakgrunn (typisk hvit i light). */
  surface: string
  surfaceSoft: string
  surfaceSoftAccent: string
  surfaceRail: string
  /** Gradientender for venstre-railen. */
  railStart: string
  railEnd: string
  railIcon: string
  railIconStrong: string
  /** Ferdig rgba-kantfarge for flater. */
  surfaceBorder: string
  surfaceGlass: string
  surfaceSubtle: string

  /** Invers «spine»-flate: mørkt panel i light (som railen), løftet flate i dark. */
  surfaceInverse: string
  onSurfaceInverse: string
  /** Dempet tekst (labels) på invers flate. */
  onSurfaceInverseMuted: string
  /** Positiv aksent (økonomi o.l.) på invers flate. */
  onSurfaceInverseAccent: string

  textPrimary: string
  textSecondary: string
  /** Andre blekk: overskrifter og titler (plum i Sign) — løpende tekst står i textPrimary. */
  textTitle: string

  primary: string
  primaryHover: string
  /** Press-trinn for primærhandling (petrol-700 i Sign) — mørkere enn hover. */
  primaryPress: string
  onPrimary: string
  /** Lenkefarge i løpende tekst — mørkere enn knappefyllet for kontrast på lyse flater. */
  link: string
  linkHover: string
  secondary: string
  onSecondary: string
  info: string
  onInfo: string
  /** Gul oppmerksomhetsfarge (badge/varsling), ikke det samme som warning. */
  attention: string
  onAttention: string
  /** Rammen (løftet railfarge i Sign): aktiv rail-knapp og andre hele markører — aldri knapp, aldri tekst. */
  frame: string
  onFrame: string

  success: string
  onSuccess: string
  warning: string
  onWarning: string
  error: string
  onError: string

  /** Myke flater (tonal-chips o.l.): bakgrunn + tekst per rolle. */
  primarySoft: string
  onPrimarySoft: string
  /** Info-flate (fjord-tint i Sign). */
  infoSoft: string
  onInfoSoft: string
  /** Dedikert AI-flate (fjord i Sign, SIGN-146) — skiller AI-innhold semantisk fra generell info. */
  aiSoft: string
  onAiSoft: string
  successSoft: string
  onSuccessSoft: string
  /** Underveis-status (kopper i Sign): «tilbud sendt» o.l. Kun som tint — aldri knapp. */
  inflightSoft: string
  onInflightSoft: string
  /** Dempet flate (mauve-tint i Sign): kategorier, tagger, utkast. */
  mutedSoft: string
  onMutedSoft: string
  warningSoft: string
  onWarningSoft: string
  errorSoft: string
  onErrorSoft: string

  shadowSoft: string
  shadowStrong: string

  /** Vuetify theme.variables. */
  borderColor: string
  borderOpacity: number
  mediumEmphasisOpacity: number
}

export interface NkProductTheme {
  /** Kort produkt-id: 'sign' | 'time' | 'backoffice' | … */
  product: string
  /** Vuetify-temanavnet appen allerede bruker, f.eks. 'NordikodeSign'. */
  vuetifyThemeName: string
  light: NkScheme
  dark: NkScheme
}

/**
 * Kundevendte dokumenter (tilbud, ordrebekreftelse …) er «papir»: alltid lyse,
 * uavhengig av appens fargemodus, og identiske i web, print og PDF. Derfor er
 * dette et eget, lys-bare tokensett (`--nk-doc-*`) og ikke felter i NkScheme —
 * NkScheme bytter til mørk modus, papiret gjør det aldri (SIGN-610).
 */
export interface NkDocumentScheme {
  /** Arket (hvitt). */
  paper: string
  /** Tonet felt på arket: sammendragskort, glyph-brikker, signaturfelt. */
  paperSoft: string
  /** Hårlinje mellom seksjoner og rundt kort. */
  border: string
  /** Svakere linje mellom tabellrader. */
  borderSoft: string
  /** Blekk: overskrifter, navn, summer og løpende tekst. */
  ink: string
  /** Lettere blekk for brødtekst-avsnitt (beskrivelser, betingelser). */
  inkSoft: string
  /** Dempet blekk: etiketter, metadata, bunntekst, signaturlinje. */
  inkMuted: string
  /** Sidetitler (andre blekk — plum i Sign). */
  title: string
  /** Mørkt bånd på arket: forsidehodet og totalsummen. */
  band: string
  onBand: string
  onBandMuted: string
  /** Handling på arket (berry): redigeringsmarkering, knapper i redigering. */
  accent: string
  onAccent: string
  accentSoft: string
  onAccentSoft: string
  /** Kant rundt myk handlingsflate. */
  accentBorder: string
  /** Venter/forbehold (gold). */
  attention: string
  onAttention: string
  attentionSoft: string
  onAttentionSoft: string
  attentionBorder: string
  /** Fullført (oliv/lime): akseptert, signert. */
  success: string
  onSuccess: string
  successSoft: string
  onSuccessSoft: string
  /** Arkets skygge mot appens sidebakgrunn. */
  shadow: string
}
