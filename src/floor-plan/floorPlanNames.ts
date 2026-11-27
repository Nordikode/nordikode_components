/// <reference types="vite/client" />
import type { FloorPlanObjectCategory, FloorPlanOpeningKind, FloorPlanRoomCategory } from './model'
import { textsByLocale, textsFor } from './textFiles'

/**
 * What the things in a plan are called (SIGN-2041): furniture, openings and
 * room types, in every language the package has — ONE source for every app
 * that draws or edits rooms. The drawing reads the names aloud, and the apps
 * use them wherever they name an element («Door in Kitchen»).
 *
 * The texts are in three sets with a file per language each
 * (`texts/names`, `texts/view3d`, `texts/editor`), so a page that only shows
 * a drawing does not carry the editor's texts.
 */
export interface FloorPlanNames {
  /** An object of a category the code does not know. */
  furniture: string
  objects: Record<FloorPlanObjectCategory, string>
  openingKinds: Record<FloorPlanOpeningKind, string>
  roomKinds: Record<FloorPlanRoomCategory, string>
  /** Per object category: the forms it comes in (`floorPlanFurniture.json`). */
  objectVariants: Record<string, Record<string, string>>
}

const names = textsByLocale<FloorPlanNames>(import.meta.glob('./texts/names/*.json', { eager: true, import: 'default' }))

/** The names in the user's language (`no`, `sv`, `pt-BR`), with the source language as the reserve. */
export const floorPlanNames = (locale?: string | null): FloorPlanNames => textsFor(names, locale)
