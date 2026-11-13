// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { createVuetify } from 'vuetify'
import { VAlert, VBtn, VCard, VCardText, VCardTitle, VChip, VDialog, VIcon, VList, VListItem, VListSubheader, VMenu } from 'vuetify/components'
import NkWidgetEditBar from '../src/widgets/NkWidgetEditBar.vue'
import NkWidgetGrid from '../src/widgets/NkWidgetGrid.vue'
import type { WidgetDefinition } from '../src/widgets/types'
import { useWidgetLayout, type WidgetLayoutController } from '../src/widgets/useWidgetLayout'
import { memoryStorage, widgetLabels } from './support/widgetFixtures'

// Rutenettet og redigeringslinjen (SIGN-1850, delt i SIGN-1873): utenfor
// redigering er flaten bare widgetene; i redigeringsmodus får hver flis
// verktøy med navn fra `labels`, skjulte widgeter ligger som brikker i
// linjen, og «Tilbakestill» er av til noe er endret.

const definitions: WidgetDefinition[] = [
  { key: 'team', title: 'Team overview', icon: 'mdi-account-group-outline', sizes: ['medium', 'small'] },
  {
    key: 'work',
    title: () => 'Work',
    icon: 'mdi-format-list-checks',
    sizes: ['large'],
    // En innstilling (SIGN-1911): gir flisen et tannhjul i redigeringsmodus.
    settings: [{ key: 'focus', label: 'Focus', default: 'open', options: [{ value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }] }],
  },
]

beforeAll(() => {
  // Vuetify måler og animerer; happy-dom har ikke alt.
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globals.visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1280, height: 800 }
  if (typeof Element.prototype.animate !== 'function') {
    Element.prototype.animate = (() => ({ finished: Promise.resolve(), cancel() {} })) as never
  }
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never
})

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

/** TransitionGroup fjerner og flytter elementer først etter neste bilde. */
const settle = async (): Promise<void> => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 60))
  await nextTick()
}

describe('NkWidgetGrid + NkWidgetEditBar', () => {
  let controller!: WidgetLayoutController
  let app: App | null = null
  let el!: HTMLElement

  const Host = defineComponent({
    setup() {
      controller = useWidgetLayout({ preferenceKey: 'sign.test.grid', definitions, storage: memoryStorage().storage, labels: widgetLabels })

      return () =>
        h('div', [
          controller.editing.value ? h(NkWidgetEditBar, { controller }) : null,
          h(NkWidgetGrid, { controller }, {
            widget: ({ widgetKey, size, settings }: { widgetKey: string; size: string; settings: Record<string, string> }) =>
              h('p', { class: 'widget-body', 'data-size': size, 'data-focus': settings.focus ?? '' }, widgetKey),
          }),
        ])
    },
  })

  beforeEach(async () => {
    el = document.createElement('div')
    document.body.appendChild(el)
    app = createApp(Host)
    app.use(createVuetify({ components: { VAlert, VBtn, VCard, VCardText, VCardTitle, VChip, VDialog, VIcon, VList, VListItem, VListSubheader, VMenu } }))
    app.mount(el)
    await flush()
  })

  afterEach(() => {
    app?.unmount()
    el.remove()
    app = null
  })

  it('tegner en flis per synlig widget, i standardstørrelsen, uten verktøy', () => {
    const bodies = Array.from(el.querySelectorAll<HTMLElement>('.widget-body'))

    expect(bodies.map((body) => body.textContent)).toEqual(['team', 'work'])
    expect(bodies.map((body) => body.dataset.size)).toEqual(['medium', 'large'])
    expect(el.querySelector('.nk-widget-tools')).toBeNull()
    expect(el.querySelector('[data-widget-zone="main"]')).not.toBeNull()
  })

  it('gir hver flis verktøy med navn i redigeringsmodus', async () => {
    controller.startEditing()
    await nextTick()

    const tools = el.querySelectorAll('.nk-widget-tools')
    expect(tools).toHaveLength(2)

    const handles = Array.from(el.querySelectorAll<HTMLButtonElement>('.nk-widget-tool--handle'))
    expect(handles[0].getAttribute('aria-label')).toBe('Move Team overview')
    expect(handles[1].getAttribute('aria-label')).toBe('Move Work')
    // «work» har bare én størrelse — ingen størrelsesknapp.
    expect(tools[0].querySelectorAll('button')).toHaveLength(3)
    // … men den har en innstilling, og dermed et tannhjul med navn (SIGN-1911).
    expect(tools[1].querySelectorAll('button')).toHaveLength(3)
    expect(tools[0].querySelector('[data-widget-tool="settings"]')).toBeNull()
    expect(tools[1].querySelector('[data-widget-tool="settings"]')?.getAttribute('aria-label')).toBe('Settings for Work')

    expect(el.querySelector('.nk-widget-editbar__title')?.textContent).toBe('Customise the page')
  })

  it('gir widgeten innstillingene sine: standarden først, så brukerens valg (SIGN-1911)', async () => {
    const bodies = (): Record<string, string | null> =>
      Object.fromEntries(Array.from(el.querySelectorAll<HTMLElement>('.widget-body')).map((body) => [body.textContent ?? '', body.getAttribute('data-focus')]))

    expect(bodies()).toEqual({ team: '', work: 'open' })

    controller.setSetting('work', 'focus', 'done')
    await nextTick()

    expect(bodies()).toEqual({ team: '', work: 'done' })
  })

  it('skjuler en widget fra verktøyet og henter den fram fra brikken i linjen', async () => {
    controller.startEditing()
    await nextTick()

    const hide = Array.from(el.querySelectorAll<HTMLButtonElement>('.nk-widget-tool')).find((button) =>
      button.getAttribute('aria-label')?.startsWith('Hide Team overview'),
    )
    expect(hide).toBeDefined()
    hide?.click()
    await settle()

    expect(Array.from(el.querySelectorAll('.widget-body')).map((body) => body.textContent)).toEqual(['work'])
    const chip = el.querySelector<HTMLElement>('[data-widget-hidden="team"]')
    expect(chip?.textContent).toContain('Team overview')

    chip?.click()
    await settle()

    // Vist igjen på plassen den hadde.
    expect(Array.from(el.querySelectorAll('.widget-body')).map((body) => body.textContent)).toEqual(['team', 'work'])
  })

  it('bytter størrelse fra verktøyet og slår på «Tilbakestill»', async () => {
    controller.startEditing()
    await nextTick()

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('.nk-widget-editbar__actions button'))
    expect(buttons[0].disabled).toBe(true)

    const resize = Array.from(el.querySelectorAll<HTMLButtonElement>('.nk-widget-tool')).find((button) =>
      button.getAttribute('aria-label')?.startsWith('Change size to Small'),
    )
    expect(resize).toBeDefined()
    resize?.click()
    await nextTick()

    expect(el.querySelector<HTMLElement>('.widget-body')?.dataset.size).toBe('small')
    expect(buttons[0].disabled).toBe(false)
  })

  it('flytter flisen med piltastene på håndtaket', async () => {
    controller.startEditing()
    await nextTick()

    const handle = el.querySelector<HTMLButtonElement>('.nk-widget-tool--handle')
    expect(handle).not.toBeNull()
    handle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await settle()

    expect(Array.from(el.querySelectorAll('.widget-body')).map((body) => body.textContent)).toEqual(['work', 'team'])
  })
})
