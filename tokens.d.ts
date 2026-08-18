// Håndvedlikeholdte deklarasjoner for `@nordikode/components/tokens`
// (samme mønster som index.d.ts). Hold i sync med src/tokens/.
import type { ThemeDefinition } from 'vuetify'

export interface NkScheme {
  page: string
  surface: string
  surfaceSoft: string
  surfaceSoftAccent: string
  surfaceRail: string
  railStart: string
  railEnd: string
  railIcon: string
  railIconStrong: string
  surfaceBorder: string
  surfaceGlass: string
  surfaceSubtle: string
  textPrimary: string
  textSecondary: string
  primary: string
  primaryHover: string
  onPrimary: string
  secondary: string
  info: string
  attention: string
  success: string
  warning: string
  error: string
  shadowSoft: string
  shadowStrong: string
  borderColor: string
  borderOpacity: number
  mediumEmphasisOpacity: number
}

export interface NkProductTheme {
  product: string
  vuetifyThemeName: string
  light: NkScheme
  dark: NkScheme
}

export declare const nkRadius: { readonly sm: string; readonly md: string; readonly lg: string; readonly pill: string }
export declare const nkSpaceUnit: string
export declare const nkFontFamily: string
export declare const nkFontHref: string
export declare const nkStatusLight: { readonly success: string; readonly warning: string; readonly error: string }
export declare const nkStatusDark: { readonly success: string; readonly warning: string; readonly error: string }
export declare const nkOpacity: {
  readonly borderLight: number
  readonly borderDark: number
  readonly mediumEmphasisLight: number
  readonly mediumEmphasisDark: number
}

export declare function toVuetifyTheme(scheme: NkScheme, dark: boolean): ThemeDefinition
export declare function buildVuetifyThemes(theme: NkProductTheme): Record<string, ThemeDefinition>
export declare function cssVariables(scheme: NkScheme): Record<string, string>
export interface NkStaticTokens {
  radius: { sm: string; md: string; lg: string; pill: string }
  spaceUnit: string
  fontFamily: string
}
export declare function defaultStaticTokens(): NkStaticTokens
export declare function cssStaticVariables(statics?: NkStaticTokens): Record<string, string>
export declare function productCss(theme: NkProductTheme, statics?: NkStaticTokens): string

export declare const signTheme: NkProductTheme
export declare const timeTheme: NkProductTheme
export declare const portalTheme: NkProductTheme
export declare const backofficeTheme: NkProductTheme
export declare const nkProductThemes: Record<string, NkProductTheme>
