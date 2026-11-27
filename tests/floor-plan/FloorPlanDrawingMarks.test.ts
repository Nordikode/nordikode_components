// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import FloorPlanDrawing from '../../src/floor-plan/FloorPlanDrawing.vue'
import type { FloorPlanDocument } from '../../src/floor-plan/model'
import type { FloorPlanSelection } from '../../src/floor-plan/floorPlanEditing'
import { sketchMarks, type FloorPlanMarks } from '../../src/floor-plan/sketchMarks'
import { floorPlan, kitchen } from './support/floorPlanFixture'
import { flush, mountWithApp } from './support/mount'
import { sketch } from './support/sketchFixture'

// What a sketch has changed, drawn on top of the plan (SIGN-2014): a thin
// contour around what is new (a full line in the success tone), moved (a
// dashed one) or changed (a dotted one, both in the action colour), and what
// was removed as a dashed ghost where it stood. The mark never paints the
// element itself — a wall that got a new colour shows that colour. Without
// `marks` the drawing is exactly as before — and `interactive="pick"` makes
// it a place to point, where nothing can be dragged.

/** The user's UI locale the drawing is mounted with. */
let locale = 'no'

const mount = async (plan: FloorPlanDocument, props: Record<string, unknown> = {}) => {
  const mounted = mountWithApp(FloorPlanDrawing, { plan, label: 'Skisse: forslag 1', locale, ...props })
  await flush()

  return { ...mounted, svg: mounted.el.querySelector<SVGSVGElement>('svg')! }
}

const numbers = (text: string | null | undefined): number[] => (text ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []

/** A press on the point (metres) in the plan. happy-dom has no layout, so the screen's pixels are the drawing's. */
const press = async (svg: SVGSVGElement, at: { x: number; y: number }): Promise<void> => {
  const [x, y, scale] = numbers(svg.querySelector('.fp-plan')?.getAttribute('transform'))
  const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse', clientX: at.x * scale + x, clientY: at.y * scale + y }

  svg.dispatchEvent(new PointerEvent('pointerdown', init))
  svg.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: init.clientX + 40, clientY: init.clientY + 40 }))
  svg.dispatchEvent(new PointerEvent('pointerup', init))
  await flush()
}

describe('FloorPlanDrawing: marks (SIGN-2014)', () => {
  beforeEach(() => {
    locale = 'no'
  })

  it('draws nothing extra without marks', async () => {
    const { svg, unmount } = await mount(floorPlan())

    expect(svg.querySelector('.fp-marks')).toBeNull()
    expect(svg.querySelectorAll('.fp-mark, .fp-ghost, .fp-attention, .fp-picked')).toHaveLength(0)
    unmount()
  })

  it('marks a new object with its box in the tone for new', async () => {
    const { svg, unmount } = await mount({ rooms: sketch().rooms }, { marks: sketchMarks(sketch()) })
    const mark = svg.querySelector('[data-mark="object:object-column"]')

    expect(mark?.tagName.toLowerCase()).toBe('rect')
    expect(mark?.classList.contains('fp-mark--added')).toBe(true)
    expect(mark?.classList.contains('fp-mark--box')).toBe(true)
    // A full line: new is not dashed.
    expect(mark?.getAttribute('stroke-dasharray')).toBeNull()
    expect(numbers(mark?.getAttribute('width'))[0]).toBeCloseTo(0.2)
    unmount()
  })

  it('marks a moved opening with a dashed contour around it, and draws a faint ghost where it stood', async () => {
    const { svg, unmount } = await mount({ rooms: sketch().rooms }, { marks: sketchMarks(sketch()) })
    const mark = svg.querySelector('[data-mark="opening:kjokken-window"]')
    const ghost = svg.querySelector('[data-ghost="opening:kjokken-window"]')

    expect(mark?.tagName.toLowerCase()).toBe('rect')
    expect(mark?.classList.contains('fp-mark--moved')).toBe(true)
    expect(mark?.getAttribute('stroke-dasharray')).not.toBeNull()

    // The contour stands around the window where it is now (x 3.8–5.4 on the north wall), a little outside it…
    const x = Number(mark?.getAttribute('x'))
    const width = Number(mark?.getAttribute('width'))

    expect(x).toBeLessThan(3.8)
    expect(x).toBeGreaterThan(3.7)
    expect(x + width).toBeGreaterThan(5.4)
    expect(x + width).toBeLessThan(5.5)
    expect(Number(mark?.getAttribute('y'))).toBeLessThan(0)
    // …the window itself is drawn as it is, under the mark…
    expect(svg.querySelector('.fp-opening[data-opening-id="kjokken-window"]')?.getAttribute('x1')).toBe('3.8')
    // …and the ghost where it was.
    expect(ghost?.classList.contains('fp-ghost--moved')).toBe(true)
    expect([ghost?.getAttribute('x1'), ghost?.getAttribute('x2')]).toEqual(['3.4', '5'])
    unmount()
  })

  it('draws what was removed as a dashed ghost from the base rooms', async () => {
    const { svg, unmount } = await mount({ rooms: sketch().rooms }, { marks: sketchMarks(sketch()) })
    const ghosts = [...svg.querySelectorAll('.fp-ghost--removed')]

    expect(ghosts.map((ghost) => ghost.getAttribute('data-ghost'))).toEqual(['wall:bad-e', 'wall:kjokken-w'])
    expect(ghosts[0].getAttribute('stroke-dasharray')).not.toBeNull()
    expect(ghosts[0].classList.contains('fp-ghost--wall')).toBe(true)
    // The wall itself is not in the plan any more.
    expect(svg.querySelector('.fp-wall[data-wall-id="bad-e"]')).toBeNull()
    unmount()
  })

  it('a wall that is new or changed keeps its own colour: the mark is a contour around it, never paint on it', async () => {
    const rooms = [
      kitchen({
        walls: [
          // A wall that was painted blue, and a new partition.
          ...kitchen().walls.map((wall) => (wall.id === 'kjokken-n' ? { ...wall, color: '#2a5db0' } : wall)),
          { id: 'partition', start: { x: 4, y: 0 }, end: { x: 4, y: 2.6 }, height: 2.4, profile: null, color: null },
        ],
      }),
    ]
    const marks: FloorPlanMarks = { elements: { 'wall:partition': 'added', 'wall:kjokken-n': 'changed' }, ghosts: [] }
    const { svg, unmount } = await mount({ rooms }, { marks })
    const added = svg.querySelector('[data-mark="wall:partition"]')
    const changed = svg.querySelector('[data-mark="wall:kjokken-n"]')

    // The painted wall is drawn in its new colour, fully visible…
    expect((svg.querySelector('.fp-wall[data-wall-id="kjokken-n"]') as SVGElement | null)?.style.stroke).toBe('#2a5db0')
    // …and the marks are frames around the walls, not lines on them.
    expect(changed?.tagName.toLowerCase()).toBe('rect')
    expect(changed?.parentElement?.classList.contains('fp-marks')).toBe(true)
    expect(changed?.classList.contains('fp-mark--changed')).toBe(true)
    expect(added?.classList.contains('fp-mark--added')).toBe(true)
    // The frame is longer and wider than the wall it stands around (kjokken-n runs from x 2.4 to 6 at y 0).
    expect(Number(changed?.getAttribute('x'))).toBeLessThan(2.4)
    expect(Number(changed?.getAttribute('x')) + Number(changed?.getAttribute('width'))).toBeGreaterThan(6)
    expect(Number(changed?.getAttribute('y'))).toBeLessThan(0)
    expect(Number(changed?.getAttribute('y')) + Number(changed?.getAttribute('height'))).toBeGreaterThan(0)
    // The upright partition's frame is turned with it.
    expect(added?.getAttribute('transform')).toBe('rotate(90 4 1.3)')
    // New is a full line, changed a dotted one, moved a dashed one: three patterns.
    expect(added?.getAttribute('stroke-dasharray')).toBeNull()
    expect(changed?.getAttribute('stroke-dasharray')).not.toBeNull()
    unmount()
  })

  it('moved and changed have each their own line pattern', async () => {
    const marks: FloorPlanMarks = { elements: { 'wall:kjokken-n': 'changed', 'wall:kjokken-e': 'moved' }, ghosts: [] }
    const { svg, unmount } = await mount({ rooms: [kitchen()] }, { marks })
    const changed = svg.querySelector('[data-mark="wall:kjokken-n"]')?.getAttribute('stroke-dasharray')
    const moved = svg.querySelector('[data-mark="wall:kjokken-e"]')?.getAttribute('stroke-dasharray')

    expect(changed).not.toBeNull()
    expect(moved).not.toBeNull()
    expect(changed).not.toBe(moved)
    unmount()
  })

  it('a removed room is drawn as its outline', async () => {
    const marks = sketchMarks({
      rooms: [kitchen()],
      baseRooms: floorPlan().rooms,
      changes: [{ elementType: 'room', elementId: 'room-gang', roomId: 'room-gang', change: 'removed' }],
    })
    const { svg, unmount } = await mount({ rooms: [kitchen()] }, { marks })
    const ghost = svg.querySelector('[data-ghost="room:room-gang"]')

    expect(ghost?.tagName.toLowerCase()).toBe('polygon')
    expect(ghost?.getAttribute('points')).toBe('0,2.6 6,2.6 6,4.2 0,4.2')
    unmount()
  })

  it('a mark for an element that is not in the plan is not drawn', async () => {
    const { svg, unmount } = await mount(floorPlan(), { marks: { elements: { 'wall:unknown': 'added' }, ghosts: [] } })

    expect(svg.querySelectorAll('.fp-mark')).toHaveLength(0)
    unmount()
  })

  it('pulses the elements a question asks about, and outlines what the person points at', async () => {
    const marks: FloorPlanMarks = { elements: {}, ghosts: [], attention: ['opening:kjokken-window', 'opening:bad-window'], picked: ['wall:gang-n', 'room:room-bad'] }
    const { svg, unmount } = await mount(floorPlan(), { marks })

    expect([...svg.querySelectorAll('.fp-attention')].map((mark) => mark.getAttribute('data-attention'))).toEqual(['opening:kjokken-window', 'opening:bad-window'])
    expect([...svg.querySelectorAll('.fp-picked')].map((mark) => mark.getAttribute('data-picked'))).toEqual(['wall:gang-n', 'room:room-bad'])
    expect(svg.querySelector('[data-picked="room:room-bad"]')?.tagName.toLowerCase()).toBe('polygon')
    unmount()
  })

  it('marks in a thumbnail too', async () => {
    const { svg, unmount } = await mount({ rooms: sketch().rooms }, { marks: sketchMarks(sketch()), compact: true })

    expect(svg.querySelectorAll('.fp-ghost--removed')).toHaveLength(2)
    expect(svg.querySelector('[data-mark="object:object-column"]')).not.toBeNull()
    unmount()
  })
})

describe('FloorPlanDrawing: structural objects (SIGN-2014)', () => {
  it('draws a column as a filled shape and a beam as a dashed outline — also when they are too small for details', async () => {
    const rooms = [
      kitchen({
        objects: [
          { id: 'c1', category: 'column', center: { x: 3, y: 1 }, width: 0.2, depth: 0.2, rotation: 0, height: 2.4, variant: 'round', elevation: null },
          { id: 'b1', category: 'beam', center: { x: 4, y: 1 }, width: 0.2, depth: 2, rotation: 0, height: 0.25, variant: null, elevation: 2.15 },
        ],
      }),
    ]
    const { svg, unmount } = await mount({ rooms })
    const column = svg.querySelector('[data-object-id="c1"] ellipse')
    const beam = svg.querySelector('[data-object-id="b1"] rect')

    expect(column?.classList.contains('fp-object__shape--solid')).toBe(true)
    expect(column?.classList.contains('fp-object__shape--outline')).toBe(true)
    expect(beam?.classList.contains('fp-object__shape--dashed')).toBe(true)
    expect(beam?.classList.contains('fp-object__shape--none')).toBe(true)
    expect(beam?.getAttribute('stroke-dasharray')).not.toBeNull()
    unmount()
  })
})

describe('FloorPlanDrawing: interactive="pick" (SIGN-2014)', () => {
  const pickable = async (props: Record<string, unknown> = {}) => {
    const selected: Array<FloorPlanSelection | null> = []
    const dragged: unknown[] = []
    const mounted = await mount(floorPlan(), {
      interactive: 'pick',
      onSelect: (selection: FloorPlanSelection | null) => selected.push(selection),
      onDrag: (payload: unknown) => dragged.push(payload),
      ...props,
    })

    return { ...mounted, selected, dragged }
  }

  it('takes the pointer and the keyboard, but has no corner handles', async () => {
    const { svg, unmount } = await pickable()

    expect(svg.getAttribute('role')).toBe('application')
    expect(svg.getAttribute('tabindex')).toBe('0')
    expect(svg.classList.contains('floor-plan__svg--picking')).toBe(true)
    expect(svg.querySelectorAll('.fp-corner')).toHaveLength(0)
    unmount()
  })

  it('a press says what is under it, and nothing is dragged', async () => {
    const { svg, selected, dragged, unmount } = await pickable()

    // The toilet in the bathroom.
    await press(svg, { x: 2, y: 0.5 })
    // The floor of the hall.
    await press(svg, { x: 3, y: 3.6 })

    expect(selected).toEqual([
      { kind: 'object', roomId: 'room-bad', objectId: 'object-toilet' },
      { kind: 'room', roomId: 'room-gang' },
    ])
    expect(dragged).toEqual([])
    unmount()
  })

  it('a press on a corner picks the wall there — a corner is not something to point at', async () => {
    const { svg, selected, unmount } = await pickable()

    await press(svg, { x: 0, y: 0 })

    expect(selected[0]?.kind).toBe('wall')
    unmount()
  })

  it('no key changes anything: only Esc lets go', async () => {
    const removed: unknown[] = []
    const nudged: unknown[] = []
    const { svg, selected, unmount } = await pickable({
      selection: { kind: 'object', roomId: 'room-bad', objectId: 'object-toilet' },
      onRemove: (selection: unknown) => removed.push(selection),
      onNudge: (payload: unknown) => nudged.push(payload),
    })

    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flush()

    expect(removed).toEqual([])
    expect(nudged).toEqual([])
    expect(selected).toEqual([null])
    unmount()
  })

  it('the editor\'s work surface is as before: corners, and a drag moves', async () => {
    const dragged: unknown[] = []
    const { svg, unmount } = await mount(floorPlan(), { interactive: true, onDrag: (payload: unknown) => dragged.push(payload) })

    expect(svg.querySelectorAll('.fp-corner').length).toBeGreaterThan(0)
    await press(svg, { x: 2, y: 0.5 })
    expect(dragged).toHaveLength(1)
    unmount()
  })
})
