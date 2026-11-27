/// <reference types="vite/client" />
import { textsByLocale, textsFor } from './textFiles'

/** The texts of the 3D view (`FloorPlan3dView`, SIGN-1981) — one file per language in `texts/view3d`. */
export interface FloorPlan3dTexts {
  reset: string
  hint: string
  keyboardHint: string
  loading: string
  loadError: string
  unavailable: string
  retry: string
}

const texts = textsByLocale<FloorPlan3dTexts>(import.meta.glob('./texts/view3d/*.json', { eager: true, import: 'default' }))

/** The texts in the user's language, with the source language as the reserve. */
export const floorPlan3dTexts = (locale?: string | null): FloorPlan3dTexts => textsFor(texts, locale)
