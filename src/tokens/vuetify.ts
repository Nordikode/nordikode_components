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
      'on-primary': scheme.onPrimary,
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
