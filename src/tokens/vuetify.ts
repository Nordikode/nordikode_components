import type { ThemeDefinition } from 'vuetify'
import type { NkProductTheme, NkScheme } from './types'

/**
 * Bygger én Vuetify-temadefinisjon fra et NkScheme. Alle produkter får samme
 * struktur — inkludert surface-rail/surface-soft og variables-blokken som
 * tidligere bare fantes i sign/time.
 */
export function toVuetifyTheme(scheme: NkScheme, dark: boolean): ThemeDefinition {
  return {
    dark,
    colors: {
      background: scheme.page,
      surface: scheme.surface,
      'surface-rail': scheme.surfaceRail,
      'surface-soft': scheme.surfaceSoft,
      'surface-inverse': scheme.surfaceInverse,
      'surface-panel': scheme.surfacePanel,
      primary: scheme.primary,
      secondary: scheme.secondary,
      'on-secondary': scheme.onSecondary,
      info: scheme.info,
      'on-info': scheme.onInfo,
      success: scheme.success,
      'on-success': scheme.onSuccess,
      warning: scheme.warning,
      'on-warning': scheme.onWarning,
      error: scheme.error,
      'on-error': scheme.onError,
      'on-background': scheme.textPrimary,
      'on-surface': scheme.textPrimary,
      'on-surface-rail': scheme.textPrimary,
      'on-surface-soft': scheme.textPrimary,
      'on-surface-inverse': scheme.onSurfaceInverse,
      'on-surface-panel': scheme.onSurfacePanel,
      'on-primary': scheme.onPrimary,
      frame: scheme.frame,
      'on-frame': scheme.onFrame,
      attention: scheme.attention,
      'on-attention': scheme.onAttention,
    },
    variables: {
      'border-color': scheme.borderColor,
      'border-opacity': scheme.borderOpacity,
      'medium-emphasis-opacity': scheme.mediumEmphasisOpacity,
    },
  }
}

/**
 * Ferdig `themes`-objekt for createVuetify: temanavnene appene allerede
 * bruker, med `Dark`-suffiks for mørk modus.
 *
 *   theme: {
 *     defaultTheme: signTheme.vuetifyThemeName,
 *     themes: buildVuetifyThemes(signTheme),
 *   }
 */
export function buildVuetifyThemes(theme: NkProductTheme): Record<string, ThemeDefinition> {
  return {
    [theme.vuetifyThemeName]: toVuetifyTheme(theme.light, false),
    [`${theme.vuetifyThemeName}Dark`]: toVuetifyTheme(theme.dark, true),
  }
}

/** Standardverdiene for ett Vuetify-komponentnavn i `createVuetify({ defaults })`. */
export type NkVuetifyComponentDefaults = Record<string, unknown>

/**
 * Nettleserens autoforslag er av på alle felt (SIGN-1907). Forslagene (tidligere
 * verdier, egen e-post, egen adresse) stemmer nesten aldri i en fagapp — feltet
 * gjelder som regel en kunde, en vare eller et søk — og et nytt felt skal ikke
 * få dem før noen husker å slå dem av. Et felt som gjelder brukeren selv
 * (egen e-post, eget telefonnummer, innlogging) setter `autocomplete` eksplisitt
 * og vinner over standarden.
 */
export const NK_FIELD_AUTOCOMPLETE = 'off'

const fieldLook: NkVuetifyComponentDefaults = {
  bgColor: 'transparent',
  color: 'primary',
  density: 'comfortable',
  hideDetails: 'auto',
  variant: 'outlined',
}

/** Feltene alle appene bruker: samme utseende og autoforslag av. */
const styledFields = ['VTextField', 'VTextarea', 'VSelect', 'VAutocomplete', 'VCombobox'] as const

/**
 * Øvrige Vuetify-felt med tekstinntasting. De har ikke noe felles utseende
 * ennå, men skal heller ikke få autoforslag den dagen en app tar dem i bruk.
 */
const plainFields = ['VNumberInput', 'VDateInput', 'VMaskInput', 'VColorInput'] as const

/**
 * Felt-standardene for `createVuetify({ defaults })` — de samme i alle
 * innloggede apper. Hver felttype har sin egen oppføring, så ingen av dem
 * avhenger av hvordan Vuetify bygger feltet innvendig (`VTextarea` arver for
 * eksempel ikke fra `VTextField`).
 *
 *   defaults: {
 *     ...nkFieldDefaults(),
 *     VBtn: { color: 'primary', variant: 'flat' },
 *   }
 */
export function nkFieldDefaults(): Record<string, NkVuetifyComponentDefaults> {
  const defaults: Record<string, NkVuetifyComponentDefaults> = {}

  for (const name of styledFields) {
    defaults[name] = { ...fieldLook, autocomplete: NK_FIELD_AUTOCOMPLETE }
  }

  for (const name of plainFields) {
    defaults[name] = { autocomplete: NK_FIELD_AUTOCOMPLETE }
  }

  return defaults
}
