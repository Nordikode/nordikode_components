// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'

import NkContactPickerDialog from '../src/components/NkContactPickerDialog.vue'
import type { NkContactPickerItem, NkContactPickerLabels } from '../src/types/NkContactPicker'

// Kontaktvelgeren (SIGN-1913) er standarden for å velge en kontakt i alle
// apper. Det som voktes: listen står framme når velgeren åpnes, ett trykk
// velger, visningen kan byttes, og «Ny kontakt», «Fjern valg» og «Vis flere»
// finnes bare når appen har bedt om dem.

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

const labels: NkContactPickerLabels = {
  search: 'Søk i kontakter',
  view: 'Visning',
  viewList: 'Liste',
  viewCards: 'Kort',
  close: 'Lukk',
  selected: 'Valgt',
  showMore: 'Vis flere',
  loading: 'Laster …',
  empty: 'Ingen kontakter ennå',
  noMatches: 'Ingen treff',
  create: 'Ny kunde',
  clear: 'Fjern kunde',
}

const items: NkContactPickerItem[] = [
  { id: 'c1', name: 'Kari Hansen', kind: 'person', tags: ['Kunde'], phone: '+47 909 90 909', email: 'kari@example.test', location: 'Bergen', group: 'Brukes ofte' },
  { id: 'c2', name: 'Fjordbygg AS', kind: 'company', tags: ['Kunde', 'Leverandør'], secondary: 'Ola Nordmann', email: 'post@fjordbygg.test', group: 'Alle kontakter' },
  { id: 'c3', name: 'Vestrør AS', kind: 'company', group: 'Alle kontakter' },
]

let app: App | null = null
let host: HTMLElement | null = null
const events: Array<[string, unknown]> = []

function mount(initial: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}) {
  const state = reactive<Record<string, unknown>>({ modelValue: true, title: 'Velg kunde', items, labels, ...initial })
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(
        NkContactPickerDialog,
        {
          ...state,
          onSelect: (id: string) => events.push(['select', id]),
          onCreate: () => events.push(['create', null]),
          onClear: () => events.push(['clear', null]),
          onLoadMore: () => events.push(['load-more', null]),
          'onUpdate:view': (view: string) => {
            events.push(['view', view])
            state.view = view
          },
          'onUpdate:search': (search: string) => events.push(['search', search]),
        },
        slots,
      ),
  })
  app.use(createVuetify({ components }))
  app.mount(host)

  return state
}

const q = <T extends Element = HTMLElement>(selector: string) => document.body.querySelector<T>(selector)
const qa = (selector: string) => Array.from(document.body.querySelectorAll<HTMLElement>(selector))
const buttonWithText = (text: string) => qa('button').find((button) => button.textContent?.trim() === text) ?? null

afterEach(() => {
  app?.unmount()
  host?.remove()
  document.body.innerHTML = ''
  app = null
  host = null
  events.length = 0
})

describe('NkContactPickerDialog', () => {
  it('viser kontaktlisten med en gang, gruppert, med dialogens navn fra tittelen', async () => {
    mount()
    await nextTick()

    expect(q('.nk-sheet__title')?.textContent).toBe('Velg kunde')
    expect(qa('.nk-contact-picker__item')).toHaveLength(3)
    expect(qa('.nk-contact-picker__section-title').map((title) => title.textContent)).toEqual(['Brukes ofte', 'Alle kontakter'])
    // Listevisningen: én linje med det som finnes av kontaktdata.
    expect(q('[data-contact-id="c1"] .nk-contact-picker__sub')?.textContent).toBe('+47 909 90 909 · kari@example.test · Bergen')
    expect(qa('[data-contact-id="c2"] .nk-contact-picker__tag').map((tag) => tag.textContent)).toEqual(['Kunde', 'Leverandør'])
  })

  it('ett trykk på en kontakt velger den', async () => {
    mount()
    await nextTick()

    q('[data-contact-id="c2"]')!.click()

    expect(events).toEqual([['select', 'c2']])
  })

  it('merker kontakten som er valgt fra før, og «Fjern valg» finnes bare da', async () => {
    const state = mount({ clearable: true })
    await nextTick()

    expect(q('.nk-contact-picker__selected')).toBeNull()
    expect(buttonWithText('Fjern kunde')).toBeNull()

    state.selectedId = 'c1'
    await nextTick()

    expect(q('[data-contact-id="c1"]')?.getAttribute('aria-current')).toBe('true')
    expect(q('[data-contact-id="c1"] .nk-contact-picker__selected')?.textContent?.trim()).toBe('Valgt')

    buttonWithText('Fjern kunde')!.click()
    expect(events).toEqual([['clear', null]])
  })

  it('bytter mellom liste og kort, og kortet viser detaljene på egne linjer', async () => {
    mount()
    await nextTick()

    expect(q('[data-view="list"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(q('.nk-contact-picker__details')).toBeNull()

    q('[data-view="cards"]')!.click()
    await nextTick()

    expect(events).toEqual([['view', 'cards']])
    expect(q('[data-view="cards"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(qa('[data-contact-id="c1"] .nk-contact-picker__detail-text').map((detail) => detail.textContent)).toEqual([
      '+47 909 90 909',
      'kari@example.test',
      'Bergen',
    ])
    // En kontakt uten kontaktdata får ingen tom detaljblokk.
    expect(q('[data-contact-id="c3"] .nk-contact-picker__details')).toBeNull()
  })

  it('«Ny kontakt» og «Vis flere» vises bare når appen ber om dem', async () => {
    const state = mount()
    await nextTick()

    expect(buttonWithText('Ny kunde')).toBeNull()
    expect(buttonWithText('Vis flere')).toBeNull()

    state.canCreate = true
    state.hasMore = true
    await nextTick()

    buttonWithText('Vis flere')!.click()
    buttonWithText('Ny kunde')!.click()
    expect(events).toEqual([['load-more', null], ['create', null]])
  })

  it('viser appens skjema i stedet for listen når en ny kontakt opprettes', async () => {
    mount({ creating: true, canCreate: true }, { create: () => h('form', { 'data-testid': 'ny-kontakt' }) })
    await nextTick()

    expect(q('[data-testid="ny-kontakt"]')).not.toBeNull()
    expect(q('.nk-contact-picker__toolbar')).toBeNull()
    expect(qa('.nk-contact-picker__item')).toHaveLength(0)
    expect(buttonWithText('Ny kunde')).toBeNull()
  })

  it('skiller tomt register fra søk uten treff, og viser lasting ved første henting', async () => {
    const state = mount({ items: [], canCreate: true })
    await nextTick()

    expect(q('.nk-empty-state__title')?.textContent).toBe('Ingen kontakter ennå')
    // «Ny kontakt» står ett sted — nederst, der den alltid står.
    expect(qa('button').filter((button) => button.textContent?.trim() === 'Ny kunde')).toHaveLength(1)

    state.search = 'hansen'
    await nextTick()
    expect(q('.nk-empty-state__title')?.textContent).toBe('Ingen treff')

    state.loading = true
    await nextTick()
    expect(q('.nk-contact-picker__loading')?.textContent).toContain('Laster …')
    expect(q('.nk-empty-state')).toBeNull()
  })
})
