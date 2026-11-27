/// <reference types="vite/client" />
import type { FloorPlanDocument } from './model'
import { fillFloorPlanText, textsByLocale, textsFor } from './textFiles'

/**
 * The texts of the room editor (SIGN-1980): the toolbar and the fields for
 * what is selected — one file per language in `texts/editor`. A text with a
 * placeholder (`{room}`, `{number}`) is filled with `fillFloorPlanText`.
 * Lengths are formatted with `formatLength` on the user's locale before they
 * are put in — a text never holds a unit.
 */
export interface FloorPlanEditorTexts {
  /** `{step}`: how far one press on an arrow key moves the selection. */
  keyboardHint: string
  toolbar: string
  undo: string
  redo: string
  add: string
  onSelectedWall: string
  selectWallFirst: string
  selectRoomFirst: string
  removeAllFurniture: string
  removeRoomFurniture: string
  deleteRoom: string
  lastRoom: string
  noColor: string
  customColor: string
  delete: string
  cancel: string
  inspector: {
    title: string
    pick: string
    nothing: string
    nothingBody: string
    wall: string
    corner: string
    /** `{room}`, `{number}`, `{length}`. */
    wallItem: string
    /** `{room}`, `{number}`. */
    cornerItem: string
    /** `{room}`, `{part}`. */
    partItem: string
    cornerHint: string
    name: string
    kind: string
    noKind: string
    ceilingHeight: string
    floorColor: string
    wallColor: string
    ceilingColor: string
    wallOwnColor: string
    length: string
    width: string
    depth: string
    height: string
    sill: string
    distance: string
    turn: string
    variant: string
    noVariant: string
    elevation: string
    face: string
    faceHint: string
    wallTooShort: string
    slopedTop: string
    slopedHint: string
    /** `{end}`: the wall's end, A or B. */
    heightAt: string
    /** `{number}`. */
    bend: string
    distanceFromA: string
    addBend: string
    /** `{number}`. */
    removeBend: string
    /** `{range}`: the lowest and highest ceiling height, formatted. */
    slopedCeiling: string
  }
  door: {
    hinges: string
    left: string
    right: string
    opens: string
    inward: string
    outward: string
    /** `{room}`. */
    seenFrom: string
  }
  split: {
    action: string
    first: string
    second: string
    from: string
    to: string
    confirm: string
    refused: string
    /** `{number}`: the name a new room gets. */
    newRoomName: string
    /** `{number}`. */
    cornerSpot: string
    /** `{from}`, `{to}`, `{length}`. */
    edgeSpot: string
  }
  merge: {
    action: string
  }
  /** The names of the ready-made tones (`FLOOR_PLAN_TONES`), by key. */
  tones: Record<string, string>
}

const texts = textsByLocale<FloorPlanEditorTexts>(import.meta.glob('./texts/editor/*.json', { eager: true, import: 'default' }))

/** The texts in the user's language, with the source language as the reserve. */
export const floorPlanEditorTexts = (locale?: string | null): FloorPlanEditorTexts => textsFor(texts, locale)

/**
 * The name a new room gets when a room is split (SIGN-1982): «Room» and the
 * number the room becomes in the plan, in the user's language. The name is a
 * suggestion — it is changed in the field afterwards.
 */
export const newFloorPlanRoomName = (plan: FloorPlanDocument | null, locale?: string | null): string =>
  fillFloorPlanText(floorPlanEditorTexts(locale).split.newRoomName, { number: (plan?.rooms.length ?? 0) + 1 })
