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

export const nkFontFamily = "'Inter', 'Segoe UI', sans-serif"

/** Lastes i appens index.html; alle apper skal bruke samme href. */
export const nkFontHref =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'

/** Felles statusfarger — light. */
export const nkStatusLight = {
  success: '#1f8a55',
  onSuccess: '#ffffff',
  warning: '#c99a2e',
  onWarning: '#ffffff',
  error: '#c0504d',
  onError: '#ffffff',
} as const

/** Felles statusfarger — dark (var allerede identiske i alle fire apper). */
export const nkStatusDark = {
  success: '#4cb583',
  onSuccess: '#ffffff',
  warning: '#d9ad55',
  onWarning: '#000000',
  error: '#d97b78',
  onError: '#ffffff',
} as const

/** Felles Vuetify-variabler. */
export const nkOpacity = {
  borderLight: 0.1,
  borderDark: 0.14,
  mediumEmphasisLight: 0.62,
  mediumEmphasisDark: 0.7,
} as const
