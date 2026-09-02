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

  primary: string
  primaryHover: string
  onPrimary: string
  secondary: string
  onSecondary: string
  info: string
  onInfo: string
  /** Gul oppmerksomhetsfarge (badge/varsling), ikke det samme som warning. */
  attention: string
  onAttention: string

  success: string
  onSuccess: string
  warning: string
  onWarning: string
  error: string
  onError: string

  /** Myke flater (tonal-chips o.l.): bakgrunn + tekst per rolle. */
  primarySoft: string
  onPrimarySoft: string
  /** Info-/AI-flate (fjord-tint i Sign): rolig tint for maskin-/AI-innhold. */
  infoSoft: string
  onInfoSoft: string
  successSoft: string
  onSuccessSoft: string
  /** Underveis-status (kopper i Sign): «tilbud sendt» o.l. Kun som tint — aldri knapp. */
  inflightSoft: string
  onInflightSoft: string
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
  /** Kort produkt-id: 'sign' | 'time' | 'portal' | 'backoffice' | … */
  product: string
  /** Vuetify-temanavnet appen allerede bruker, f.eks. 'NordikodeSign'. */
  vuetifyThemeName: string
  light: NkScheme
  dark: NkScheme
}
