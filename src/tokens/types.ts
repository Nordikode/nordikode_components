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
