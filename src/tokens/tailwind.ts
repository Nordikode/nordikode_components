import { defaultStaticTokens, type NkStaticTokens } from './css'
import type { NkProductTheme, NkScheme } from './types'

// Tailwind v4-flatene (nettsiden) leser designsystemet gjennom `@theme`-
// variabler med Tailwinds navnekonvensjon (`--color-*`, `--radius-*`,
// `--font-*`). Verdiene er NkScheme — samme kilde som --nk-*-variablene og
// Vuetify-temaene — så paletten kan aldri sprike mellom nettsiden og appene.
//
// Rollenavnene er de nettsiden allerede bruker (SIGN-264): `surface` er
// SIDEN (NkScheme.page), `surface-raised` er kortet (NkScheme.surface),
// `action` er handlingsfargen og `action-ink` er lenkefargen.

/** Tailwind-`@theme`-fargevariabler for ett scheme. */
export function tailwindThemeVariables(scheme: NkScheme): Record<string, string> {
  return {
    // Flater og tekst
    '--color-surface': scheme.page,
    '--color-surface-alt': scheme.surfaceSoft,
    '--color-surface-raised': scheme.surface,
    '--color-surface-inverse': scheme.surfaceInverse,
    '--color-ink': scheme.textPrimary,
    '--color-ink-secondary': scheme.textSecondary,
    '--color-ink-title': scheme.textTitle,
    '--color-ink-inverse': scheme.onSurfaceInverse,
    '--color-ink-inverse-muted': scheme.onSurfaceInverseMuted,
    '--color-line': scheme.surfaceBorder,
    // Handling (petrol): fyll, hover/press, tekst-varianten og den myke flaten
    '--color-action': scheme.primary,
    '--color-action-hover': scheme.primaryHover,
    '--color-action-press': scheme.primaryPress,
    '--color-on-action': scheme.onPrimary,
    '--color-action-ink': scheme.link,
    '--color-action-ink-hover': scheme.linkHover,
    '--color-action-surface': scheme.primarySoft,
    '--color-action-surface-ink': scheme.onPrimarySoft,
    // Rammen/maskinen (fjord) og AI
    '--color-info-surface': scheme.infoSoft,
    '--color-info-ink': scheme.onInfoSoft,
    '--color-ai-surface': scheme.aiSoft,
    '--color-ai-ink': scheme.onAiSoft,
    // Status som tint + forgrunn
    '--color-ok-surface': scheme.successSoft,
    '--color-ok-ink': scheme.onSuccessSoft,
    '--color-inflight-surface': scheme.inflightSoft,
    '--color-inflight-ink': scheme.onInflightSoft,
    '--color-muted-surface': scheme.mutedSoft,
    '--color-muted-ink': scheme.onMutedSoft,
    '--color-warn-surface': scheme.warningSoft,
    '--color-warn-ink': scheme.onWarningSoft,
    '--color-error-surface': scheme.errorSoft,
    '--color-error-ink': scheme.onErrorSoft,
    // Status som fyll (badges, ikoner)
    '--color-success': scheme.success,
    '--color-on-success': scheme.onSuccess,
    '--color-warning': scheme.warning,
    '--color-on-warning': scheme.onWarning,
    '--color-error': scheme.error,
    '--color-on-error': scheme.onError,
    '--color-attention': scheme.attention,
    '--color-on-attention': scheme.onAttention,
    '--color-frame': scheme.frame,
    '--color-on-frame': scheme.onFrame,
  }
}

/** Modus-uavhengige `@theme`-variabler (radius, font) fra base-tokens. */
export function tailwindStaticVariables(statics: NkStaticTokens = defaultStaticTokens()): Record<string, string> {
  return {
    '--radius-compact': statics.radius.sm,
    '--radius-panel': statics.radius.lg,
    '--radius-pill': statics.radius.pill,
    '--font-nk': statics.fontFamily,
  }
}

function block(selector: string, vars: Record<string, string>, indent = ''): string {
  const lines = Object.entries(vars).map(([name, value]) => `${indent}  ${name}: ${value};`)
  return `${indent}${selector} {\n${lines.join('\n')}\n${indent}}`
}

/**
 * Ferdig CSS for en Tailwind v4-flate: `@theme` med light + statiske
 * variabler, og `.dark`-overstyringer i base-laget (klassen settes av den
 * delte useTheme i @nordikode/components/web). Skrives til en fil appen
 * `@import`-er før sine egne `@theme`-tillegg.
 */
export function tailwindThemeCss(theme: NkProductTheme, statics: NkStaticTokens = defaultStaticTokens()): string {
  const light = { ...tailwindStaticVariables(statics), ...tailwindThemeVariables(theme.light) }
  const dark = tailwindThemeVariables(theme.dark)
  return [
    `/* Generert fra @nordikode/components tokens — produkt: ${theme.product}. Ikke rediger for hånd. */`,
    block('@theme', light),
    `@layer base {\n${block('.dark', dark, '  ')}\n}`,
  ].join('\n\n')
}
