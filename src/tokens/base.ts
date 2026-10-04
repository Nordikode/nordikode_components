// Base-tokens som er felles for hele Nordikode, uavhengig av produkt.
//
// Fase 1-beslutninger (design-audit 2026-08-18):
// - Felles statuspalett i light: Sign/Time-verdiene, som allerede matcher det
//   samlede dark-settet. Portal/backoffice hadde egne (#2f7d5d/#b07a2f/#b54a4a)
//   og flyttes hit ved adopsjon.
// - Fontstrategi: Inter overalt. Manrope var deklarert i portal/backoffice men
//   ble aldri lastet noe sted; den er tatt ut av stacken.
// - Radius-skalaen beholder sm === md (begge 8px) for å ikke endre dagens
//   utseende; om skalaen skal få et reelt sm-steg er en designbeslutning som
//   tas i theme lab (fase 3).

export const nkRadius = {
  sm: '8px',
  md: '8px',
  lg: '16px',
  pill: '999px',
} as const

export const nkSpaceUnit = '8px'

/** Semantisk spacing — dagens de facto-verdier i appene (pa-6, ga-3 …). */
export const nkSpacing = {
  /** Innvendig polstring i kort/paneler. */
  cardPadding: '24px',
  /** Vertikal avstand mellom kort/seksjoner. */
  sectionGap: '24px',
  /** Avstand mellom elementer på rad (knapper, chips). */
  inlineGap: '12px',
  /**
   * Plass reservert nederst til høyre til en flytende handling (FAB,
   * assistentfigur som Nordi): bunnhandlinger til høyre (send, lagre) får
   * denne som padding/margin så de aldri havner under figuren (SIGN-466).
   * 64px figur + 24px kantmargin (8 + 3 × space-unit) — avledet av dagens
   * figurstørrelse, ikke en designbeslutning i seg selv.
   */
  fabReserve: '88px',
} as const

export const nkFontFamily = "'Inter', 'Segoe UI', sans-serif"

/**
 * Monospace for tekst som leses tegn for tegn: ID-er, IP-adresser, koder,
 * nøkler, JSON (SIGN-1193). Systemets egne fonter — ingen webfont, ingen
 * nedlasting: SF Mono på Apple, Consolas på Windows, Liberation Mono på Linux.
 */
// avledet: samme stack som developer-appen allerede brukte (`--dev-font-mono`);
// de håndskrevne listene i backoffice, Sign og account var delmengder av den.
// Fontvalget er et designvedtak (UX) og venter på godkjenning i SIGN-1193.
export const nkFontMono =
  "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"

/**
 * Typografi-skala. rootSize er den globale bryteren (html font-size) — alle
 * rem-baserte størrelser (inkl. Vuetify-klassene) skalerer med den. Rollene
 * er i rem og matcher dagens de facto-bruk i appene.
 */
export const nkTypography = {
  rootSize: '16px',
  heading: '1.5rem',
  body: '1rem',
  label: '0.78rem',
  button: '0.875rem',
} as const

/** Lastes i appens index.html; alle apper skal bruke samme href. */
export const nkFontHref =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

/**
 * Felles statusfarger — light (Time og backoffice).
 *
 * Fargene brukes både som tekst og som fyll med hvit etikett, så de må holde
 * 4,5:1 begge veier (SIGN-1198). De opprinnelige tonene (#1f8a55, #c99a2e,
 * #c0504d) målte 4,4 / 2,6 / 4,7:1 mot hvitt. Verdiene er de samme som
 * statusteksten fikk i SIGN-1158.
 */
export const nkStatusLight = {
  success: '#176840', // avledet: #1f8a55 mørknet 25 % mot svart — 6,8:1 mot hvitt, 6,4:1 på backoffice-siden
  onSuccess: '#ffffff',
  warning: '#795c1c', // avledet: #c99a2e mørknet 40 % mot svart — 6,3:1 mot hvitt, 5,9:1 på backoffice-siden
  onWarning: '#ffffff',
  error: '#9a403e', // avledet: #c0504d mørknet 20 % mot svart — 6,6:1 mot hvitt, 6,2:1 på backoffice-siden
  onError: '#ffffff',
} as const

/**
 * Felles statusfarger — dark (var allerede identiske i alle fire apper).
 * Etiketten på fylt farge er svart: hvit målte 2,6:1 på grønn og 3,0:1 på
 * rød (SIGN-1198).
 */
export const nkStatusDark = {
  success: '#4cb583',
  onSuccess: '#000000', // avledet: svart gir 8,2:1 (hvit 2,6:1)
  warning: '#d9ad55',
  onWarning: '#000000',
  error: '#d97b78',
  onError: '#000000', // avledet: svart gir 7,1:1 (hvit 3,0:1)
} as const

/** Felles Vuetify-variabler. */
export const nkOpacity = {
  borderLight: 0.1,
  borderDark: 0.14,
  mediumEmphasisLight: 0.62,
  mediumEmphasisDark: 0.7,
} as const
