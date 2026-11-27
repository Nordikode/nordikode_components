import { describe, expect, it } from 'vitest'
import {
  FLOOR_PLAN_FURNITURE_CATEGORIES,
  FLOOR_PLAN_OBJECT_CATEGORIES,
  FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES,
  isStructuralObjectCategory,
  toFloorPlanObjectCategory,
} from '../../src/floor-plan/model'
import { ADDED_TINT, DEFAULT_3D_MARK_TONES, DEFAULT_3D_TONES, GHOST_OPACITY, buildFloorPlan3d, hexToRgb, objectHeight } from '../../src/floor-plan/floorPlan3d'
import { BEAM_DEFAULT_HEIGHT, OBJECT_DEFAULT_SIZES, addObject, hasFurniture, hitTest, removeAllObjects, removeAllObjectsInPlan } from '../../src/floor-plan/floorPlanEditing'
import { furniturePlan, furnitureSolid, hasFurnitureSymbol, objectVariantsFor, toFloorPlanObjectVariant } from '../../src/floor-plan/floorPlanFurniture'
import { sketchMarks3d } from '../../src/floor-plan/sketchMarks'
import { bathroom, floorPlan, kitchen } from './support/floorPlanFixture'
import { sketch } from './support/sketchFixture'

// Structural objects (SIGN-2014, contract 1.6): a column and a beam are part
// of the building, not furniture. They are object categories like the
// others, drawn by code (the shared symbol file is not touched), and «remove
// all furniture» never removes them.

describe('structural object categories', () => {
  it('are object categories of their own, apart from the furniture', () => {
    expect(FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES).toEqual(['column', 'beam'])
    expect(FLOOR_PLAN_OBJECT_CATEGORIES).toEqual([...FLOOR_PLAN_FURNITURE_CATEGORIES, 'column', 'beam'])
    expect(toFloorPlanObjectCategory('column')).toBe('column')
    expect(toFloorPlanObjectCategory('beam')).toBe('beam')
  })

  it('are recognised by the type field, never by a name', () => {
    expect(isStructuralObjectCategory('column')).toBe(true)
    expect(isStructuralObjectCategory('beam')).toBe(true)
    expect(isStructuralObjectCategory('storage')).toBe(false)
    expect(isStructuralObjectCategory('Column')).toBe(false)
    expect(isStructuralObjectCategory(null)).toBe(false)

    for (const category of FLOOR_PLAN_FURNITURE_CATEGORIES) {
      expect(isStructuralObjectCategory(category), category).toBe(false)
    }
  })

  it('have the default sizes of the contract', () => {
    expect(OBJECT_DEFAULT_SIZES.column).toEqual({ width: 0.2, depth: 0.2 })
    expect(OBJECT_DEFAULT_SIZES.beam).toEqual({ width: 0.2, depth: 1 })
    expect(objectHeight({ category: 'column', height: null })).toBe(2.4)
    expect(objectHeight({ category: 'beam', height: null })).toBe(0.25)
  })

  it('a new column is as tall as the room, and a new beam hangs under the ceiling', () => {
    const withColumn = addObject(kitchen(), 'column', 'c1')
    const column = withColumn.objects.find((object) => object.id === 'c1')

    expect(column).toMatchObject({ category: 'column', width: 0.2, depth: 0.2, height: 2.4, elevation: null })

    const beam = addObject(kitchen(), 'beam', 'b1').objects.find((object) => object.id === 'b1')

    expect(beam).toMatchObject({ category: 'beam', width: 0.2, depth: 1, height: BEAM_DEFAULT_HEIGHT, elevation: 2.15 })
  })

  it('without a ceiling height the column and the beam leave the height to the 3D view', () => {
    const room = kitchen({ walls: kitchen().walls.map((wall) => ({ ...wall, height: null })) })

    expect(addObject(room, 'column', 'c1').objects.at(-1)).toMatchObject({ height: null, elevation: null })
    expect(addObject(room, 'beam', 'b1').objects.at(-1)).toMatchObject({ height: null, elevation: null })
  })
})

describe('«remove all furniture» keeps what is part of the building', () => {
  const column = { id: 'c1', category: 'column', center: { x: 3, y: 1 }, width: 0.2, depth: 0.2, rotation: 0, height: 2.4, variant: null, elevation: null }
  const beam = { id: 'b1', category: 'beam', center: { x: 4, y: 1 }, width: 0.2, depth: 2, rotation: 0, height: 0.25, variant: null, elevation: 2.15 }

  it('removes the furniture and leaves columns and beams', () => {
    const room = kitchen({ objects: [...kitchen().objects, column, beam] })
    const cleared = removeAllObjects(room)

    expect(cleared.objects.map((object) => object.id)).toEqual(['c1', 'b1'])
    expect(hasFurniture(room)).toBe(true)
    expect(hasFurniture(cleared)).toBe(false)
  })

  it('a room with only columns and beams is left as it is — the same object back', () => {
    const room = kitchen({ objects: [column, beam] })

    expect(removeAllObjects(room)).toBe(room)

    const plan = floorPlan({ rooms: [room] })

    expect(removeAllObjectsInPlan(plan)).toBe(plan)
  })

  it('in a whole plan: every room loses its furniture and keeps its structure', () => {
    const plan = floorPlan({ rooms: [bathroom(), kitchen({ objects: [...kitchen().objects, column] })] })
    const cleared = removeAllObjectsInPlan(plan)

    expect(cleared.rooms.map((room) => room.objects.map((object) => object.id))).toEqual([[], ['c1']])
  })
})

describe('structural objects are drawn by code', () => {
  it('have no symbol in the shared data file', () => {
    expect(hasFurnitureSymbol('column')).toBe(false)
    expect(hasFurnitureSymbol('beam')).toBe(false)
  })

  it('a column has the variants square and round; a beam has none', () => {
    expect(objectVariantsFor('column')).toEqual(['square', 'round'])
    expect(objectVariantsFor('beam')).toEqual([])
    expect(toFloorPlanObjectVariant('column', 'round')).toBe('round')
    expect(toFloorPlanObjectVariant('beam', 'round')).toBeNull()
  })

  it('seen from above a column is a filled square — or a filled circle when it is round', () => {
    expect(furniturePlan({ category: 'column', width: 0.2, depth: 0.2 })).toEqual([
      { kind: 'rect', x: -0.1, y: -0.1, width: 0.2, height: 0.2, radius: 0, fill: 'solid', stroke: 'outline' },
    ])
    expect(furniturePlan({ category: 'column', variant: 'square', width: 0.3, depth: 0.2 })).toEqual([
      { kind: 'rect', x: -0.15, y: -0.1, width: 0.3, height: 0.2, radius: 0, fill: 'solid', stroke: 'outline' },
    ])
    expect(furniturePlan({ category: 'column', variant: 'round', width: 0.3, depth: 0.3 })).toEqual([
      { kind: 'ellipse', cx: 0, cy: 0, rx: 0.15, ry: 0.15, fill: 'solid', stroke: 'outline' },
    ])
  })

  it('seen from above a beam is a dashed rectangle without a fill: it hangs above the floor', () => {
    expect(furniturePlan({ category: 'beam', width: 0.2, depth: 3 })).toEqual([
      { kind: 'rect', x: -0.1, y: -1.5, width: 0.2, height: 3, radius: 0, fill: 'none', stroke: 'dashed' },
    ])
  })

  it('in 3D a column is one box in its whole height, a round one a cylinder, and a beam one box', () => {
    expect(furnitureSolid({ category: 'column', width: 0.2, depth: 0.2 }, 2.4)).toEqual([
      { kind: 'box', min: [-0.1, 0, -0.1], max: [0.1, 2.4, 0.1], axis: 'y', sides: 4, tone: 'strong' },
    ])
    expect(furnitureSolid({ category: 'column', variant: 'round', width: 0.2, depth: 0.2 }, 2.4)).toEqual([
      { kind: 'cylinder', min: [-0.1, 0, -0.1], max: [0.1, 2.4, 0.1], axis: 'y', sides: 12, tone: 'strong' },
    ])
    expect(furnitureSolid({ category: 'beam', width: 0.2, depth: 3 }, 0.25)).toEqual([
      { kind: 'box', min: [-0.1, 0, -1.5], max: [0.1, 0.25, 1.5], axis: 'y', sides: 4, tone: 'strong' },
    ])
  })

  it('a beam is lifted to where it hangs in the 3D scene', () => {
    const room = kitchen({ objects: [{ id: 'b1', category: 'beam', center: { x: 4, y: 1 }, width: 0.2, depth: 2, rotation: 0, height: 0.25, variant: null, elevation: 2.15 }] })
    const mesh = buildFloorPlan3d({ rooms: [room] }).meshes.find((candidate) => candidate.kind === 'object' && candidate.id === 'b1')
    const heights = (mesh?.positions ?? []).filter((_, index) => index % 3 === 1)

    expect(Math.min(...heights)).toBeCloseTo(2.15)
    expect(Math.max(...heights)).toBeCloseTo(2.4)
  })
})

describe('the 3D scene shows what a sketch has changed (SIGN-2014)', () => {
  const tones = { ...DEFAULT_3D_TONES, ...DEFAULT_3D_MARK_TONES }

  it('without marks the scene is exactly as before', () => {
    const plain = buildFloorPlan3d({ rooms: sketch().rooms }, tones)

    expect(buildFloorPlan3d({ rooms: sketch().rooms }, tones, {})).toEqual(plain)
    expect(buildFloorPlan3d({ rooms: sketch().rooms }, tones, { marks: null })).toEqual(plain)
    expect(plain.meshes.some((mesh) => mesh.kind === 'ghost')).toBe(false)
  })

  it('tints what is new with the tone for new, and nothing else', () => {
    const plain = buildFloorPlan3d({ rooms: sketch().rooms }, tones)
    const marked = buildFloorPlan3d({ rooms: sketch().rooms }, tones, { marks: sketchMarks3d(sketch()) })
    const added = hexToRgb(DEFAULT_3D_MARK_TONES.added)!
    const column = marked.meshes.find((mesh) => mesh.kind === 'object' && mesh.id === 'object-column')!
    const columnBefore = plain.meshes.find((mesh) => mesh.kind === 'object' && mesh.id === 'object-column')!

    column.color.forEach((channel, index) => {
      expect(channel).toBeCloseTo(columnBefore.color[index] + (added[index] - columnBefore.color[index]) * ADDED_TINT)
    })

    // Every mesh that was there is still there, and only the column has another colour.
    const recoloured = plain.meshes.filter((mesh, index) => mesh.color.join() !== marked.meshes[index].color.join())

    expect(recoloured.map((mesh) => mesh.id)).toEqual(['object-column'])
  })

  it('draws the walls that are gone as translucent ghosts in the tone for removed', () => {
    const marked = buildFloorPlan3d({ rooms: sketch().rooms }, tones, { marks: sketchMarks3d(sketch()) })
    const ghosts = marked.meshes.filter((mesh) => mesh.kind === 'ghost')

    expect(ghosts.map((mesh) => mesh.id).sort()).toEqual(['bad-e', 'kjokken-w'])

    for (const ghost of ghosts) {
      expect(ghost.opacity).toBe(GHOST_OPACITY)
      expect(ghost.color).toEqual(hexToRgb(DEFAULT_3D_MARK_TONES.removed))
    }
  })

  it('falls back to its own tones when the theme gives none', () => {
    const marked = buildFloorPlan3d({ rooms: sketch().rooms }, DEFAULT_3D_TONES, { marks: sketchMarks3d(sketch()) })

    expect(marked.meshes.find((mesh) => mesh.kind === 'ghost')?.color).toEqual(hexToRgb(DEFAULT_3D_MARK_TONES.removed))
  })
})

describe('where the drawing only picks, a corner is not something to pick', () => {
  it('a press on a corner picks the wall there instead', () => {
    const plan = floorPlan()

    expect(hitTest(plan, { x: 0, y: 0 }, 0.1)).toEqual({ kind: 'corner', roomId: 'room-bad', index: 0 })
    expect(hitTest(plan, { x: 0, y: 0 }, 0.1, null, false)).toMatchObject({ kind: 'wall', roomId: 'room-bad' })
  })
})
