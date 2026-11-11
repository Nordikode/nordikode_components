// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref, type App } from 'vue'
import { createVuetify } from 'vuetify'
import { VBadge, VBtn, VCard, VIcon, VMenu, VTextField, VTooltip } from 'vuetify/components'

import NkListPane from '../src/components/NkListPane.vue'

// Listepanelet (SIGN-1845) er det samme i backoffice, Sign og Time. Det som
// voktes: hodet krymper når listen rulles forbi terskelen (verktøyraden legges
// sammen, tittelraden strammes — tittel og handlinger står, SIGN-1852), kommer
// tilbake når listen står på toppen igjen, og krymper aldri når listen ikke
// kan rulles nok til at det er plass til det — da ville hodet hoppe.

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globals.visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1280, height: 800 }
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never
})

let app: App | null = null
let host: HTMLElement | null = null

interface Geometry {
  scrollHeight: number
  clientHeight: number
  titleHeight?: number
}

function mount(props: Record<string, unknown>, geometry: Geometry, slots: Record<string, () => unknown> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(
        NkListPane,
        { title: 'Saker', searchPlaceholder: 'Søk', labels: { filters: 'Filtre', resetFilters: 'Nullstill' }, ...props },
        { default: () => h('ul', [h('li', 'Rad')]), ...slots },
      ),
  })
  app.use(createVuetify({ components: { VBadge, VBtn, VCard, VIcon, VMenu, VTextField, VTooltip } }))
  app.mount(host)

  // happy-dom har ingen layout: geometrien til rulleelementet og tittelraden settes for hånd.
  const body = host.querySelector<HTMLElement>('.nk-list-pane__body')!
  Object.defineProperty(body, 'scrollHeight', { configurable: true, value: geometry.scrollHeight })
  Object.defineProperty(body, 'clientHeight', { configurable: true, value: geometry.clientHeight })
  const titleRow = host.querySelector<HTMLElement>('.nk-list-pane__title-row')!
  Object.defineProperty(titleRow, 'offsetHeight', { configurable: true, value: geometry.titleHeight ?? 56 })

  return { body }
}

const scrollTo = async (body: HTMLElement, top: number) => {
  Object.defineProperty(body, 'scrollTop', { configurable: true, writable: true, value: top })
  body.dispatchEvent(new Event('scroll'))
  await nextTick()
}

const pane = () => host!.querySelector<HTMLElement>('.nk-list-pane')!

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('NkListPane', () => {
  it('krymper hodet når listen rulles forbi terskelen, og åpner det igjen øverst', async () => {
    const { body } = mount({}, { scrollHeight: 2000, clientHeight: 600 })

    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(false)

    await scrollTo(body, 30)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(false)

    await scrollTo(body, 120)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(true)

    // Litt opp igjen er ikke nok — hodet skal ikke blafre rundt terskelen.
    await scrollTo(body, 30)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(true)

    await scrollTo(body, 0)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(false)
  })

  it('beholder tittel og handlinger når hodet er krympet — bare verktøyraden legges sammen', async () => {
    const { body } = mount(
      {},
      { scrollHeight: 2000, clientHeight: 600 },
      { actions: () => h('button', { 'data-testid': 'ny' }, 'Ny sak'), toolbar: () => h('span', 'Brikker') },
    )

    await scrollTo(body, 120)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(true)

    // Tittelraden ligger utenfor det som legges sammen, så tittel og «Ny …» står.
    const titleRow = host!.querySelector('.nk-list-pane__title-row')!
    expect(titleRow.closest('.nk-list-pane__collapsible')).toBeNull()
    expect(titleRow.querySelector('.nk-list-pane__title')?.textContent).toBe('Saker')
    expect(titleRow.querySelector('[data-testid="ny"]')).not.toBeNull()

    // Det som legges sammen er verktøyraden, og ingenting annet.
    const collapsibles = host!.querySelectorAll('.nk-list-pane__collapsible')
    expect(collapsibles).toHaveLength(1)
    expect(collapsibles[0].querySelector('.nk-list-pane__toolbar')?.textContent).toBe('Brikker')
  })

  it('krymper ikke når listen knapt er lengre enn flaten', async () => {
    // Overskytende: 100 px. Hodet som krymper er 56 px → bare 44 px igjen å rulle,
    // mindre enn terskelen — da ville rulleposisjonen havnet på toppen og hodet kommet tilbake.
    const { body } = mount({}, { scrollHeight: 700, clientHeight: 600 })

    await scrollTo(body, 90)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(false)
  })

  it('krymper aldri uten søkerad eller når krympingen er skrudd av', async () => {
    const utenSok = mount({ searchPlaceholder: '', labels: {} }, { scrollHeight: 2000, clientHeight: 600 })
    await scrollTo(utenSok.body, 300)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(false)
    expect(host!.querySelector('.nk-list-pane__search-row')).toBeNull()

    app?.unmount()
    host?.remove()

    const avslatt = mount({ condense: false }, { scrollHeight: 2000, clientHeight: 600 })
    await scrollTo(avslatt.body, 300)
    expect(pane().classList.contains('nk-list-pane--condensed')).toBe(false)
  })

  it('viser filterknappen bare med filtre, og merker antall aktive', async () => {
    mount({ filterCount: 2 }, { scrollHeight: 100, clientHeight: 600 }, { filters: () => h('p', 'Filtre her') })

    const button = host!.querySelector<HTMLElement>('[data-testid="nk-list-pane-filters"]')!
    expect(button).not.toBeNull()
    expect(button.getAttribute('aria-label')).toBe('Filtre')
    expect(button.classList.contains('nk-list-pane__filter-btn--active')).toBe(true)
    expect(host!.querySelector('.v-badge__badge')?.textContent).toBe('2')

    app?.unmount()
    host?.remove()

    mount({ filterCount: 0 }, { scrollHeight: 100, clientHeight: 600 })
    expect(host!.querySelector('[data-testid="nk-list-pane-filters"]')).toBeNull()
  })

  it('sender søketeksten videre og tømmer den med Esc', async () => {
    const changes: string[] = []
    mount(
      { search: 'ha', 'onUpdate:search': (value: string) => changes.push(value) },
      { scrollHeight: 100, clientHeight: 600 },
    )

    const input = host!.querySelector<HTMLInputElement>('.nk-list-pane__search input')!
    expect(input.value).toBe('ha')

    input.value = 'hansen'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(changes.at(-1)).toBe('hansen')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(changes.at(-1)).toBe('')
  })

  // Liste først (SIGN-1888): listen er en egen side, og det valgte åpnes
  // alene på hele flaten. Panelet står montert mens det er skjult, så søk,
  // filtre og rulleposisjon er de samme når brukeren kommer tilbake.
  it('står som før uten listFirst: ingen liste først-klasse, og detailOpen skjuler ingenting', () => {
    mount({ detailOpen: true }, { scrollHeight: 2000, clientHeight: 600 })

    expect(pane().classList.contains('nk-list-pane--list-first')).toBe(false)
    expect(pane().style.display).not.toBe('none')
  })

  it('fyller bredden med listFirst og vises når ingenting er valgt', () => {
    mount({ listFirst: true }, { scrollHeight: 2000, clientHeight: 600 })

    expect(pane().classList.contains('nk-list-pane--list-first')).toBe(true)
    expect(pane().style.display).not.toBe('none')
  })

  it('skjuler listen når noe er valgt, og gir samme rulleposisjon tilbake etterpå', async () => {
    const detailOpen = ref(false)
    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({
      render: () =>
        h(
          NkListPane,
          { title: 'Saker', searchPlaceholder: 'Søk', listFirst: true, detailOpen: detailOpen.value },
          { default: () => h('ul', [h('li', 'Rad')]) },
        ),
    })
    app.use(createVuetify({ components: { VBadge, VBtn, VCard, VIcon, VMenu, VTextField, VTooltip } }))
    app.mount(host)

    const body = host.querySelector<HTMLElement>('.nk-list-pane__body')!
    Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(body, 'clientHeight', { configurable: true, value: 600 })
    await scrollTo(body, 420)

    detailOpen.value = true
    await nextTick()
    expect(pane().style.display).toBe('none')

    // Nettleseren kan nullstille rulleposisjonen på et skjult element.
    body.scrollTop = 0

    detailOpen.value = false
    await nextTick()
    await nextTick()
    expect(pane().style.display).not.toBe('none')
    expect(body.scrollTop).toBe(420)
  })
})
