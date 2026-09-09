export * from './types'
export * from './base'
export * from './vuetify'
export * from './css'
export * from './tailwind'
export { documentScheme } from './document'
export { signTheme } from './products/sign'
export { timeTheme } from './products/time'
export { backofficeTheme } from './products/backoffice'

import { backofficeTheme } from './products/backoffice'
import { signTheme } from './products/sign'
import { timeTheme } from './products/time'
import type { NkProductTheme } from './types'

/** Alle produkttemaer, nøklet på produkt-id. */
export const nkProductThemes: Record<string, NkProductTheme> = {
  sign: signTheme,
  time: timeTheme,
  backoffice: backofficeTheme,
}
