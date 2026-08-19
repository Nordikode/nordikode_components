import { nkFontFamily, nkRadius, nkSpaceUnit, nkSpacing } from './base'
import type { NkProductTheme, NkScheme } from './types'

// Kanoniske CSS-variabelnavn.
//
// NB — navneendring fra appenes gamle style.css (fase 1-beslutning):
// gamle `--nk-bg-base` betydde kortflate i sign/time men sidebakgrunn i
// portal/backoffice. De utvetydige avløserne er:
//   --nk-surface  (kort/flate; gamle --nk-bg-base i sign/time)
//   --nk-page     (sidebakgrunn; gamle --nk-bg-page i sign/time og
//                  gamle --nk-bg-base i portal/backoffice)
// Ingen legacy-alias genereres — appene bytter navn ved adopsjon (fase 3/5).

/** CSS-variabler for ett scheme (uten radius/spacing, som er modus-uavhengige). */
export function cssVariables(scheme: NkScheme): Record<string, string> {
  return {
    '--nk-page': scheme.page,
    '--nk-surface': scheme.surface,
    '--nk-surface-soft': scheme.surfaceSoft,
    '--nk-surface-soft-accent': scheme.surfaceSoftAccent,
    '--nk-surface-rail': scheme.surfaceRail,
    '--nk-rail-start': scheme.railStart,
    '--nk-rail-end': scheme.railEnd,
    '--nk-rail-icon': scheme.railIcon,
    '--nk-rail-icon-strong': scheme.railIconStrong,
    '--nk-surface-border': scheme.surfaceBorder,
    '--nk-surface-glass': scheme.surfaceGlass,
    '--nk-surface-subtle': scheme.surfaceSubtle,
    '--nk-text-primary': scheme.textPrimary,
    '--nk-text-secondary': scheme.textSecondary,
    '--nk-action-primary': scheme.primary,
    '--nk-action-primary-hover': scheme.primaryHover,
    '--nk-on-action-primary': scheme.onPrimary,
    '--nk-on-secondary': scheme.onSecondary,
    '--nk-on-info': scheme.onInfo,
    '--nk-attention': scheme.attention,
    '--nk-on-attention': scheme.onAttention,
    '--nk-success': scheme.success,
    '--nk-on-success': scheme.onSuccess,
    '--nk-warning': scheme.warning,
    '--nk-on-warning': scheme.onWarning,
    '--nk-error': scheme.error,
    '--nk-on-error': scheme.onError,
    '--nk-shadow-soft': scheme.shadowSoft,
    '--nk-shadow-strong': scheme.shadowStrong,
  }
}

/** Modus-uavhengige base-tokens (radius, spacing, font) — felles for alle produkter. */
export interface NkStaticTokens {
  radius: { sm: string; md: string; lg: string; pill: string }
  spaceUnit: string
  spacing: { cardPadding: string; sectionGap: string; inlineGap: string }
  fontFamily: string
}

/** Dagens base-verdier som redigerbart objekt (f.eks. for theme lab). */
export function defaultStaticTokens(): NkStaticTokens {
  return {
    radius: { ...nkRadius },
    spaceUnit: nkSpaceUnit,
    spacing: { ...nkSpacing },
    fontFamily: nkFontFamily,
  }
}

/** Modus-uavhengige variabler (radius, spacing, font). */
export function cssStaticVariables(statics: NkStaticTokens = defaultStaticTokens()): Record<string, string> {
  return {
    '--nk-radius-sm': statics.radius.sm,
    '--nk-radius-md': statics.radius.md,
    '--nk-radius-lg': statics.radius.lg,
    '--nk-radius-pill': statics.radius.pill,
    '--nk-space-unit': statics.spaceUnit,
    '--nk-pad-card': statics.spacing.cardPadding,
    '--nk-gap-section': statics.spacing.sectionGap,
    '--nk-gap-inline': statics.spacing.inlineGap,
    '--nk-font-family': statics.fontFamily,
  }
}

function block(selector: string, vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([name, value]) => `  ${name}: ${value};`)
  return `${selector} {\n${lines.join('\n')}\n}`
}

/**
 * Genererer hele CSS-blokken en app trenger i sin style.css:
 * `:root` med light + statiske tokens, og `:root.nk-dark` med mørke
 * motstykker (klassen settes av themePreference i app-core).
 */
export function productCss(theme: NkProductTheme, statics: NkStaticTokens = defaultStaticTokens()): string {
  const light = { ...cssStaticVariables(statics), ...cssVariables(theme.light) }
  const dark = cssVariables(theme.dark)
  return [
    `/* Generert fra @nordikode/components tokens — produkt: ${theme.product}. Ikke rediger for hånd. */`,
    block(':root', light),
    block(':root.nk-dark', dark),
  ].join('\n\n')
}
