// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import FloorPlanEditorWorkspace from '../../src/floor-plan/FloorPlanEditorWorkspace.vue'
import { floorPlanEditorTexts } from '../../src/floor-plan/floorPlanEditorTexts'
import { floorPlanNames } from '../../src/floor-plan/floorPlanNames'
import { useFloorPlanEditor } from '../../src/floor-plan/useFloorPlanEditor'
import { floorPlan, type FixturePlan } from './support/floorPlanFixture'
import { flush, mountWithApp } from './support/mount'

// The work surface of the room editor (SIGN-1980, shared since SIGN-2041):
// the toolbar, the drawing and the fields for what is selected. The same
// component edits a floor plan in Sign and a sketch in Sketch, so what is
// guarded here is what every app relies on: the texts follow the locale it is
// given, the fields read and write numbers the way that language does, every
// change goes through the editor the page owns, and the component shows no
// message of its own — it says what happened, and the page shows it.

const mount = async (props: Record<string, unknown> = {}) => {
  const editor = useFloorPlanEditor<FixturePlan>()
  editor.load(floorPlan())

  const onSave = vi.fn()
  const onSplitRefused = vi.fn()
  const mounted = mountWithApp(FloorPlanEditorWorkspace, {
    editor,
    drawingLabel: 'Plantegningen 1. etasje',
    locale: 'no',
    onSave,
    onSplitRefused,
    ...props,
  })
  await flush()

  return { ...mounted, editor, onSave, onSplitRefused }
}

const drawing = (el: HTMLElement): SVGSVGElement => el.querySelector<SVGSVGElement>('.floor-plan-edit-canvas svg.floor-plan__svg')!

const numbers = (text: string | null | undefined): number[] => (text ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []

/** A press on the point (metres) in the plan. happy-dom has no layout, so the screen's pixels are the drawing's. */
const press = async (el: HTMLElement, at: { x: number; y: number }): Promise<void> => {
  const svg = drawing(el)
  const [x, y, scale] = numbers(svg.querySelector('.fp-plan')?.getAttribute('transform'))
  const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse', clientX: at.x * scale + x, clientY: at.y * scale + y }

  svg.dispatchEvent(new PointerEvent('pointerdown', init))
  svg.dispatchEvent(new PointerEvent('pointerup', init))
  await flush()
}

const field = (el: HTMLElement, testId: string): HTMLInputElement => el.querySelector<HTMLInputElement>(`[data-testid="${testId}"] input`)!

/** Types in a field and leaves it — the value is reported when the field is left. */
const type = async (el: HTMLElement, testId: string, value: string): Promise<void> => {
  const input = field(el, testId)

  input.dispatchEvent(new Event('focus'))
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('blur'))
  await flush()
}

const button = (el: HTMLElement, testId: string): HTMLButtonElement => el.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!

const click = async (el: HTMLElement, testId: string): Promise<void> => {
  button(el, testId).click()
  await flush()
}

/** Intl uses a no-break space between a number and its unit. */
const plain = (text: string | null | undefined): string => (text ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()

describe('FloorPlanEditorWorkspace (SIGN-2041)', () => {
  it('shows the toolbar, the drawing as the work surface and the fields — in the language of the locale it is given', async () => {
    const { el, unmount } = await mount()
    const text = floorPlanEditorTexts('no')

    expect(el.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe(text.toolbar)
    expect(button(el, 'floor-plan-edit-undo').textContent?.trim()).toBe(text.undo)
    expect(button(el, 'floor-plan-edit-redo').textContent?.trim()).toBe(text.redo)
    expect(drawing(el).getAttribute('aria-label')).toBe('Plantegningen 1. etasje')
    expect(el.querySelector('[data-testid="floor-plan-inspector"]')?.getAttribute('aria-label')).toBe(text.inspector.title)
    // The hint says how far an arrow key moves the selection, written as the language writes a length.
    expect(plain(el.querySelector('.floor-plan-edit-hint')?.textContent)).toContain('0,01 m')
    unmount()

    const english = await mount({ locale: 'en' })

    expect(button(english.el, 'floor-plan-edit-undo').textContent?.trim()).toBe(floorPlanEditorTexts('en').undo)
    expect(plain(english.el.querySelector('.floor-plan-edit-hint')?.textContent)).toContain('0.01 m')
    expect(floorPlanEditorTexts('en').undo).not.toBe(text.undo)
    english.unmount()
  })

  it('a wall is selected in the drawing, and the length typed in the field moves the wall — one step that can be undone', async () => {
    const { el, editor, unmount } = await mount()

    expect(button(el, 'floor-plan-edit-undo').disabled).toBe(true)

    await press(el, { x: 1.2, y: 0 })

    expect(editor.selection.value).toEqual({ kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' })
    expect(el.querySelector('[data-testid="inspector-heading"]')?.textContent).toBe(floorPlanEditorTexts('no').inspector.wall)
    expect(field(el, 'wall-length').value).toBe('2,40')

    await type(el, 'wall-length', '3')

    expect(editor.plan.value?.rooms[0].walls.find((wall) => wall.id === 'bad-n')?.end).toEqual({ x: 3, y: 0 })
    expect(field(el, 'wall-length').value).toBe('3,00')
    expect(editor.dirty.value).toBe(true)

    await click(el, 'floor-plan-edit-undo')

    expect(field(el, 'wall-length').value).toBe('2,40')
    expect(editor.dirty.value).toBe(false)
    unmount()
  })

  it('reads a number the way the language of the locale writes it', async () => {
    const { el, editor, unmount } = await mount({ locale: 'en' })

    await press(el, { x: 1.2, y: 0 })
    expect(field(el, 'wall-length').value).toBe('2.40')

    await type(el, 'wall-length', '3.5')

    expect(editor.plan.value?.rooms[0].walls.find((wall) => wall.id === 'bad-n')?.end.x).toBe(3.5)
    unmount()
  })

  it('names the things in the plan in the language of the locale', async () => {
    const { el, editor, unmount } = await mount()

    editor.select({ kind: 'room', roomId: 'room-kjokken' })
    await flush()
    await click(el, 'floor-plan-edit-add')

    const items = [...document.querySelectorAll<HTMLElement>('.floor-plan-edit-add-list .v-list-item')].map((item) => item.textContent?.trim())

    expect(items).toContain(floorPlanNames('no').openingKinds.door)
    expect(items).toContain(floorPlanNames('no').objects.sofa)
    unmount()
  })

  it('a room that could not be split where the person chose is said to the page, with the text to show', async () => {
    const { el, editor, onSplitRefused, unmount } = await mount()

    await press(el, { x: 1.2, y: 1.6 })
    await click(el, 'room-split')

    expect(el.querySelector('[data-testid="floor-plan-edit-split-hint"]')?.textContent?.trim()).toBe(floorPlanEditorTexts('no').split.first)

    // Two spots on the same wall: the line does not go through the room.
    await press(el, { x: 0.5, y: 0 })
    await press(el, { x: 1.5, y: 0 })

    expect(onSplitRefused).toHaveBeenCalledTimes(1)
    expect(onSplitRefused).toHaveBeenCalledWith(floorPlanEditorTexts('no').split.refused)
    expect(editor.plan.value?.rooms).toHaveLength(3)
    unmount()
  })

  it('a room is split in the drawing, and the new room gets its name in the language of the locale', async () => {
    const { el, editor, unmount } = await mount()

    await press(el, { x: 1.2, y: 1.6 })
    await click(el, 'room-split')
    await press(el, { x: 1.8, y: -0.1 })
    await press(el, { x: 1.8, y: 2.7 })

    expect(editor.plan.value?.rooms).toHaveLength(4)
    expect(field(el, 'room-name').value).toBe('Rom 4')
    unmount()
  })

  it('Cmd/Ctrl+S asks the page to save, and never opens the browser\'s own save dialog', async () => {
    const { onSave, unmount } = await mount()
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true })

    window.dispatchEvent(event)

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    unmount()
  })
})
