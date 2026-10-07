// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'

import NkGroupedMoveList from '../src/web/NkGroupedMoveList.vue'

// Flytting mellom grupper er delt mellom firmaappen og firmaveiviseren
// (SIGN-1395): dra og slipp for mus, menyen «Flytt til …» for tastatur og
// mobil. Begge veier skal ende i samme `move`-hendelse, og komponenten
// lagrer aldri noe selv.

const labels = { ungrouped: 'No department', move: 'Move {name}', drag: 'Drag {name}' }

const groups = [
  { id: 'a', name: 'Carpentry' },
  { id: 'b', name: 'Office' },
]

let app: App | null = null

type Options = { items: { id: string; groupId: string | null; name: string; movable?: boolean }[]; canMove?: boolean; menu?: boolean }

function mount(options: Options) {
  const moves: unknown[] = []
  const state = reactive({ items: options.items })
  const host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(
        NkGroupedMoveList,
        {
          groups,
          items: state.items,
          labels,
          canMove: options.canMove,
          menu: options.menu,
          onMove: (event: unknown) => moves.push(event),
        },
        { item: ({ item }: { item: { name: string } }) => h('span', { class: 'row' }, item.name) },
      ),
  })
  app.mount(host)
  return { host, moves, state }
}

afterEach(() => {
  app?.unmount()
  app = null
  document.body.innerHTML = ''
})

const dragEvent = (type: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Event(type, { bubbles: true, cancelable: true }), { dataTransfer: null, relatedTarget: null, ...extra })

const section = (host: HTMLElement, key: string): HTMLElement => host.querySelector<HTMLElement>(`[data-group="${key}"]`)!

describe('NkGroupedMoveList', () => {
  it('grupperer radene og viser «uten gruppe» bare når noen står der', () => {
    const { host } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna' }] })

    expect(section(host, 'a').textContent).toContain('Anna')
    expect(host.querySelector('[data-group=""]')).toBeNull()
  })

  it('dra fra én gruppe og slipp i en annen gir én move-hendelse', async () => {
    const { host, moves } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna' }] })

    host.querySelector('.nk-move__handle')!.dispatchEvent(dragEvent('dragstart'))
    await nextTick()
    // Mens noe dras finnes «uten gruppe» som slippmål, selv om den er tom.
    expect(host.querySelector('[data-group=""]')).not.toBeNull()
    expect(host.querySelector('.nk-move__item--dragging')).not.toBeNull()

    const target = section(host, 'b')
    target.dispatchEvent(dragEvent('dragenter'))
    const over = dragEvent('dragover')
    target.dispatchEvent(over)
    expect(over.defaultPrevented).toBe(true)
    await nextTick()
    expect(target.classList.contains('nk-move__group--over')).toBe(true)

    target.dispatchEvent(dragEvent('drop'))
    await nextTick()

    expect(moves).toEqual([{ itemId: '1', fromGroupId: 'a', toGroupId: 'b' }])
    expect(host.querySelector('.nk-move__item--dragging')).toBeNull()
  })

  it('slipp i gruppen raden alt står i gjør ingenting', () => {
    const { host, moves } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna' }] })

    host.querySelector('.nk-move__handle')!.dispatchEvent(dragEvent('dragstart'))
    const own = section(host, 'a')
    const over = dragEvent('dragover')
    own.dispatchEvent(over)
    own.dispatchEvent(dragEvent('drop'))

    expect(over.defaultPrevented).toBe(false)
    expect(moves).toEqual([])
  })

  it('menyen lister de andre gruppene og «uten gruppe», og valget gir samme hendelse', async () => {
    const { host, moves } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna' }] })

    const trigger = host.querySelector<HTMLButtonElement>('.nk-move__trigger')!
    expect(trigger.getAttribute('aria-label')).toBe('Move Anna')
    trigger.click()
    await nextTick()

    const options = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Office', 'No department'])
    expect(document.activeElement).toBe(options[0])

    options[1]!.click()
    // Hendelsen kommer først etter at menyen er tegnet bort, så raden
    // forlater gruppen uten en åpen meny hengende på seg.
    expect(moves).toEqual([])
    await nextTick()
    await nextTick()

    expect(moves).toEqual([{ itemId: '1', fromGroupId: 'a', toGroupId: null }])
    expect(host.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('Escape lukker menyen og gir fokus tilbake til knappen', async () => {
    const { host } = mount({ items: [{ id: '1', groupId: null, name: 'Anna' }] })

    const trigger = host.querySelector<HTMLButtonElement>('.nk-move__trigger')!
    trigger.click()
    await nextTick()
    host.querySelector<HTMLElement>('[role="menu"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(host.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('rader som ikke kan flyttes har verken håndtak eller meny', () => {
    const { host } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna', movable: false }] })

    expect(host.querySelector('.nk-move__handle')).toBeNull()
    expect(host.querySelector('.nk-move__trigger')).toBeNull()
  })

  it('uten flytterett er listen bare gruppert', () => {
    const { host } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna' }], canMove: false })

    expect(host.querySelector('.nk-move__handle')).toBeNull()
    expect(host.querySelector('.nk-move__trigger')).toBeNull()
    expect(section(host, 'a').textContent).toContain('Anna')
  })

  it('menyen kan slås av når eieren har sin egen vei for tastatur', () => {
    const { host } = mount({ items: [{ id: '1', groupId: 'a', name: 'Anna' }], menu: false })

    expect(host.querySelector('.nk-move__handle')).not.toBeNull()
    expect(host.querySelector('.nk-move__trigger')).toBeNull()
  })
})

