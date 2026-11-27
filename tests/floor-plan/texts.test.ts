import { describe, expect, it } from 'vitest'
import { FLOOR_PLAN_TONES } from '../../src/floor-plan/floorPlanColors'
import { floorPlanEditorTexts, newFloorPlanRoomName } from '../../src/floor-plan/floorPlanEditorTexts'
import { objectVariantsFor } from '../../src/floor-plan/floorPlanFurniture'
import { floorPlanNames } from '../../src/floor-plan/floorPlanNames'
import { floorPlan3dTexts } from '../../src/floor-plan/floorPlan3dTexts'
import { FLOOR_PLAN_OBJECT_CATEGORIES, FLOOR_PLAN_OPENING_KINDS, FLOOR_PLAN_ROOM_CATEGORIES } from '../../src/floor-plan/model'
import { fillFloorPlanText } from '../../src/floor-plan/textFiles'

// The texts of the floor plan components (SIGN-2041) live in the package, one
// file per language in each of three sets. The files are the list of
// languages — no language code is written here, except the source language.
// What is guarded: every language has every text, with the same placeholders
// as the source, and every type the code owns has a name in every language.

type Texts = { [key: string]: string | Texts }

const fileSets: Record<string, Record<string, Texts>> = {
  names: import.meta.glob<Texts>('../../src/floor-plan/texts/names/*.json', { eager: true, import: 'default' }),
  view3d: import.meta.glob<Texts>('../../src/floor-plan/texts/view3d/*.json', { eager: true, import: 'default' }),
  editor: import.meta.glob<Texts>('../../src/floor-plan/texts/editor/*.json', { eager: true, import: 'default' }),
}

const SOURCE = 'en'

const code = (path: string): string => path.slice(path.lastIndexOf('/') + 1, -'.json'.length)

/** The languages of a set, with their texts. */
const languages = (set: string): [string, Texts][] => Object.entries(fileSets[set]).map(([path, texts]) => [code(path), texts])

const sourceOf = (set: string): Texts => languages(set).find(([locale]) => locale === SOURCE)![1]

/** Every text of a file, by its dotted key. */
const flatten = (texts: Texts, prefix = ''): Record<string, string> =>
  Object.entries(texts).reduce<Record<string, string>>(
    (all, [key, value]) => (typeof value === 'string' ? { ...all, [prefix + key]: value } : { ...all, ...flatten(value, `${prefix}${key}.`) }),
    {},
  )

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

describe('the texts of the floor plan components (SIGN-2041)', () => {
  it('has the same languages in every set, and more than the source language', () => {
    const codes = (set: string): string[] => languages(set).map(([locale]) => locale).sort()

    expect(codes('names').length).toBeGreaterThan(1)
    expect(codes('names')).toContain(SOURCE)
    expect(codes('view3d')).toEqual(codes('names'))
    expect(codes('editor')).toEqual(codes('names'))
  })

  it('has every text in every language, with the same placeholders as the source and never empty', () => {
    for (const set of Object.keys(fileSets)) {
      const source = flatten(sourceOf(set))

      for (const [locale, texts] of languages(set)) {
        const own = flatten(texts)

        expect(Object.keys(own).sort(), `${set}/${locale}`).toEqual(Object.keys(source).sort())

        for (const [key, text] of Object.entries(own)) {
          expect(text.trim(), `${set}/${locale}: ${key}`).not.toBe('')
          expect(placeholders(text), `${set}/${locale}: ${key}`).toEqual(placeholders(source[key]))
        }
      }
    }
  })

  it('names every tone, room type, opening type, object type and object variant the code owns, in every language', () => {
    for (const [locale] of languages('names')) {
      const names = floorPlanNames(locale)
      const editor = floorPlanEditorTexts(locale)

      expect(Object.keys(editor.tones).sort(), locale).toEqual(FLOOR_PLAN_TONES.map((tone) => tone.key).sort())
      expect(Object.keys(names.roomKinds).sort(), locale).toEqual([...FLOOR_PLAN_ROOM_CATEGORIES].sort())
      expect(Object.keys(names.openingKinds).sort(), locale).toEqual([...FLOOR_PLAN_OPENING_KINDS].sort())
      expect(Object.keys(names.objects).sort(), locale).toEqual([...FLOOR_PLAN_OBJECT_CATEGORIES].sort())

      // The variants are data (the furniture file, and the column's two forms): each has a name.
      const withVariants = FLOOR_PLAN_OBJECT_CATEGORIES.filter((category) => objectVariantsFor(category).length > 0)

      expect(Object.keys(names.objectVariants).sort(), locale).toEqual([...withVariants].sort())

      for (const category of withVariants) {
        expect(Object.keys(names.objectVariants[category]).sort(), `${locale}: ${category}`).toEqual([...objectVariantsFor(category)].sort())
      }
    }
  })

  it('gives the language asked for, the main language of a regional tag, and the source language for one without a file', () => {
    for (const [locale, texts] of languages('view3d')) {
      expect(floorPlan3dTexts(locale), locale).toEqual(texts)
      expect(floorPlan3dTexts(locale.toUpperCase()), locale).toEqual(texts)
      expect(floorPlan3dTexts(`${locale}-XX`), locale).toEqual(texts)
    }

    expect(floorPlan3dTexts('zz')).toEqual(sourceOf('view3d'))
    expect(floorPlanNames(null)).toEqual(sourceOf('names'))
    expect(floorPlanEditorTexts(undefined)).toEqual(sourceOf('editor'))
  })

  it('fills the placeholders of a text and leaves one without a value as it is', () => {
    expect(fillFloorPlanText('{room} · Wall {number} · {length}', { room: 'Kjøkken', number: 2, length: '3,60 m' })).toBe('Kjøkken · Wall 2 · 3,60 m')
    expect(fillFloorPlanText('Height at {end}', {})).toBe('Height at {end}')
    expect(fillFloorPlanText('{a}{a}', { a: 0 })).toBe('00')
  })

  it('suggests a name for a new room: the word for room and the number it becomes in the plan', () => {
    const room = floorPlanEditorTexts(SOURCE).split.newRoomName

    expect(newFloorPlanRoomName({ rooms: [] }, SOURCE)).toBe(fillFloorPlanText(room, { number: 1 }))
    expect(newFloorPlanRoomName(null, SOURCE)).toBe(fillFloorPlanText(room, { number: 1 }))

    for (const [locale] of languages('editor')) {
      expect(newFloorPlanRoomName({ rooms: [] }, locale), locale).toMatch(/1/)
    }
  })
})
