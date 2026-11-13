// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue'
import type { WidgetDefinition, WidgetLayout, WidgetLayoutStorage } from '../src/widgets/types'
import { rowAt, useWidgetLayout, type UseWidgetLayoutOptions, type WidgetLayoutController } from '../src/widgets/useWidgetLayout'
import { memoryStorage, widgetLabels } from './support/widgetFixtures'

// Kontrolleren for én flates widgetoppsett (SIGN-1850, delt i SIGN-1873):
// leser lagringen appen gir, gjør endringene med en gang, lagrer kort etter,
// og følger med når lagringen endres fra en annen fane.

const KEY = 'sign.test.layout'

const definitions: WidgetDefinition[] = [
  { key: 'a', title: 'Team overview', icon: 'mdi-a', sizes: ['medium', 'small', 'large'], zone: 'main' },
  { key: 'b', title: 'Work', icon: 'mdi-b', sizes: ['large'], zone: 'main' },
  {
    key: 'c',
    title: 'Notes',
    icon: 'mdi-c',
    sizes: ['medium'],
    zone: 'side',
    // En innstilling (SIGN-1911): ett valg blant noen få, lagret i oppsettet.
    settings: [{ key: 'focus', label: 'Focus', default: 'distance', options: [{ value: 'distance', label: 'Distance' }, { value: 'cost', label: 'Cost' }] }],
  },
]

const zones = [
  { key: 'main', kind: 'grid' as const },
  { key: 'side', kind: 'column' as const },
]

let app: App | null = null
let host: HTMLElement | null = null

const mountController = (
  options: Partial<Pick<UseWidgetLayoutOptions, 'migrate' | 'onSaveError' | 'storage' | 'definitions'>> = {},
  stored: Record<string, unknown> = {},
) => {
  const memory = memoryStorage(stored)
  const available = ref(definitions)
  let controller!: WidgetLayoutController

  const Host = defineComponent({
    setup() {
      controller = useWidgetLayout({
        preferenceKey: KEY,
        definitions: options.definitions ?? (() => available.value),
        zones,
        storage: options.storage ?? memory.storage,
        labels: widgetLabels,
        migrate: options.migrate,
        onSaveError: options.onSaveError,
      })

      return () => h('div')
    },
  })

  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(Host)
  app.mount(host)

  return { controller, available, memory }
}

/** Et rutenett med faste rader og fire kolonner, slik NkWidgetGrid melder det. */
const fixedGrid = (controller: WidgetLayoutController): void => {
  controller.setGrid('main', { columns: 4, fixedRows: true, element: null, columnGap: 0, rowGap: 0, rowHeight: 100 })
  controller.setGrid('side', { columns: 1, fixedRows: false, element: null, columnGap: 0, rowGap: 0, rowHeight: 0 })
}

describe('useWidgetLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    app?.unmount()
    host?.remove()
    app = null
    host = null
    vi.useRealTimers()
  })

  it('starter med standardoppsettet når ingenting er lagret', async () => {
    const { controller } = mountController()
    await vi.runAllTimersAsync()

    expect(controller.visibleIn('main').map((item) => item.key)).toEqual(['a', 'b'])
    expect(controller.visibleIn('side').map((item) => item.key)).toEqual(['c'])
    expect(controller.isDefault.value).toBe(true)
    expect(controller.loaded.value).toBe(true)
  })

  it('leser det lagrede oppsettet og renser det mot registeret', async () => {
    const { controller } = mountController(
      {},
      { [KEY]: { widgets: [{ key: 'c', size: 'medium', visible: true, zone: 'main' }, { key: 'borte' }, { key: 'a', visible: false }] } },
    )
    await vi.runAllTimersAsync()

    expect(controller.visibleIn('main').map((item) => item.key)).toEqual(['c', 'b'])
    expect(controller.hiddenWidgets.value.map((item) => item.key)).toEqual(['a'])
    expect(controller.isDefault.value).toBe(false)
  })

  it('tar med et eldre oppsett bare når nøkkelen mangler', async () => {
    const migrate = vi.fn(() => ({ widgets: [{ key: 'c', size: 'medium' as const, visible: true, zone: 'main' }] }))
    const { controller, memory } = mountController({ migrate })
    await vi.runAllTimersAsync()

    expect(migrate).toHaveBeenCalledOnce()
    expect(controller.visibleIn('main').map((item) => item.key)).toEqual(['c', 'a', 'b'])
    expect(memory.save).not.toHaveBeenCalled()
  })

  it('bruker standardoppsettet for økten når lagringen ikke svarer', async () => {
    const storage: WidgetLayoutStorage = {
      load: vi.fn(async () => {
        throw new Error('offline')
      }),
      save: vi.fn(async () => {}),
    }
    const { controller } = mountController({ storage })
    await vi.runAllTimersAsync()

    expect(controller.loaded.value).toBe(true)
    expect(controller.isDefault.value).toBe(true)
  })

  it('skjuler, viser og bytter størrelse, og lagrer kort etter siste endring', async () => {
    const { controller, memory } = mountController()
    await vi.runAllTimersAsync()

    controller.hide('a')
    controller.cycleSize('b')
    expect(controller.hiddenWidgets.value.map((item) => item.key)).toEqual(['a'])
    expect(memory.save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(600)

    expect(memory.save).toHaveBeenCalledTimes(1)
    expect(memory.save.mock.calls[0][0]).toBe(KEY)
    const stored = memory.save.mock.calls[0][1] as WidgetLayout
    expect(stored.widgets.find((item) => item.key === 'a')?.visible).toBe(false)
    // b har bare én størrelse — ingenting skjer.
    expect(stored.widgets.find((item) => item.key === 'b')?.size).toBe('large')

    controller.show('a')
    controller.setSize('a', 'small')
    await vi.advanceTimersByTimeAsync(600)

    expect(memory.save).toHaveBeenCalledTimes(2)
    expect(controller.visibleIn('main').find((item) => item.key === 'a')?.size).toBe('small')
  })

  it('melder fra til appen når lagringen feiler, og lar oppsettet stå', async () => {
    const failure = new Error('core svarte 500')
    const onSaveError = vi.fn()
    const storage: WidgetLayoutStorage = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {
        throw failure
      }),
    }
    const { controller } = mountController({ storage, onSaveError })
    await vi.runAllTimersAsync()

    controller.hide('a')
    await vi.advanceTimersByTimeAsync(600)

    expect(storage.save).toHaveBeenCalledTimes(1)
    expect(onSaveError).toHaveBeenCalledExactlyOnceWith(failure)
    expect(controller.isSaving.value).toBe(false)
    expect(controller.hiddenWidgets.value.map((item) => item.key)).toEqual(['a'])
  })

  it('løser opp et navn som er en getter, og gir nøkkelen for en ukjent widget', async () => {
    const language = ref('en')
    const { controller } = mountController({
      definitions: () => [
        { key: 'a', title: () => (language.value === 'en' ? 'Team overview' : 'Teamoversikt'), icon: 'mdi-a', sizes: ['medium'] },
        { key: 'b', title: 'Work', icon: 'mdi-b', sizes: ['large'] },
      ],
    })
    await vi.runAllTimersAsync()

    expect(controller.title('a')).toBe('Team overview')
    expect(controller.title('b')).toBe('Work')
    expect(controller.title('finnes-ikke')).toBe('finnes-ikke')

    language.value = 'no'
    expect(controller.title('a')).toBe('Teamoversikt')
  })

  it('flytter en widget mellom sonene og tilbake til cellen i rutenettet', async () => {
    const { controller } = mountController()
    await vi.runAllTimersAsync()
    fixedGrid(controller)

    expect(controller.moveTo('c', 'a')).toBe(true)
    expect(controller.visibleIn('main').map((item) => item.key)).toEqual(['c', 'a', 'b'])
    expect(controller.visibleIn('side')).toEqual([])

    expect(controller.moveToZone('b', 'side')).toBe(true)
    expect(controller.visibleIn('side').map((item) => item.key)).toEqual(['b'])

    // Celle (2, 0) i et rutenett med fire kolonner: c (medium, to kolonner) flyttes dit.
    expect(controller.moveToCell('c', 'main', 2, 0)).toBe(true)
    expect(controller.placedIn('main').find((tile) => tile.key === 'c')).toMatchObject({ x: 2, y: 0, w: 2 })
    expect(controller.layout.value.positions?.find((entry) => entry.zone === 'main' && entry.columns === 4)?.tiles.c).toEqual({ x: 2, y: 0 })
  })

  it('følger med når lagringen endres i en annen fane', async () => {
    const { controller, memory } = mountController()
    await vi.runAllTimersAsync()

    memory.values[KEY] = { widgets: [{ key: 'b', size: 'large', visible: true, zone: 'side' }] }
    await nextTick()

    expect(controller.visibleIn('side').map((item) => item.key)).toEqual(['b', 'c'])
    expect(memory.save).not.toHaveBeenCalled()
  })

  it('renser oppsettet på nytt når registeret endrer seg', async () => {
    const { controller, available } = mountController()
    await vi.runAllTimersAsync()

    available.value = definitions.filter((definition) => definition.key !== 'a')
    await nextTick()

    expect(controller.visibleIn('main').map((item) => item.key)).toEqual(['b'])
  })

  it('tilbakestiller til standard og lagrer når redigeringen avsluttes', async () => {
    const { controller, memory } = mountController()
    await vi.runAllTimersAsync()

    controller.startEditing()
    controller.hide('c')
    controller.reset()
    expect(controller.isDefault.value).toBe(true)

    controller.stopEditing()
    expect(controller.editing.value).toBe(false)
    expect(memory.save).toHaveBeenCalledTimes(1)
  })

  it('bytter høyde i hele rader, dytter naboen ned og lagrer valget (SIGN-1903)', async () => {
    const { controller, memory } = mountController()
    await vi.runAllTimersAsync()
    fixedGrid(controller)

    // «a» er medium (2 kolonner, 2 rader); «b» er stor og står under.
    expect(controller.rowsOf('a')).toBe(2)
    expect(controller.nextRows('a')).toBe(3)
    expect(controller.placedIn('main').find((tile) => tile.key === 'b')?.y).toBe(2)

    controller.cycleRows('a')
    expect(controller.rowsOf('a')).toBe(3)
    expect(controller.placedIn('main').find((tile) => tile.key === 'a')?.h).toBe(3)
    expect(controller.placedIn('main').find((tile) => tile.key === 'b')?.y).toBe(3)

    controller.setRows('a', 1)
    expect(controller.placedIn('main').find((tile) => tile.key === 'a')?.h).toBe(1)
    expect(controller.placedIn('main').find((tile) => tile.key === 'b')?.y).toBe(1)

    await vi.runAllTimersAsync()
    const saved = memory.save.mock.calls.at(-1)?.[1] as WidgetLayout
    expect(saved.widgets.find((item) => item.key === 'a')?.rows).toBe(1)

    // Høyden følger widgeten når størrelsen byttes, og «Tilbakestill» fjerner den.
    controller.setSize('a', 'small')
    expect(controller.rowsOf('a')).toBe(1)
    controller.reset()
    expect(controller.rowsOf('a')).toBe(2)
  })

  it('velger en innstilling på en widget, lagrer bare avviket fra standarden og tilbakestiller den (SIGN-1911)', async () => {
    const { controller, memory } = mountController()
    await vi.runAllTimersAsync()

    expect(controller.settingsOf('c')).toEqual({ focus: 'distance' })
    expect(controller.settingsOf('a')).toEqual({})

    controller.setSetting('c', 'focus', 'cost')
    expect(controller.settingsOf('c')).toEqual({ focus: 'cost' })
    expect(controller.isDefault.value).toBe(false)

    await vi.runAllTimersAsync()
    const saved = memory.save.mock.calls.at(-1)?.[1] as WidgetLayout
    expect(saved.widgets.find((item) => item.key === 'c')?.settings).toEqual({ focus: 'cost' })

    // Ukjente innstillinger og verdier, og widgeter uten innstillinger, ignoreres uten å lagre.
    const saves = memory.save.mock.calls.length
    controller.setSetting('c', 'focus', 'time')
    controller.setSetting('c', 'period', 'week')
    controller.setSetting('a', 'focus', 'cost')
    controller.setSetting('c', 'focus', 'cost')
    await vi.runAllTimersAsync()
    expect(memory.save.mock.calls.length).toBe(saves)
    expect(controller.settingsOf('c')).toEqual({ focus: 'cost' })

    // Tilbake til standarden: valget fjernes fra oppsettet, som igjen er standard.
    controller.setSetting('c', 'focus', 'distance')
    await vi.runAllTimersAsync()
    expect((memory.save.mock.calls.at(-1)?.[1] as WidgetLayout).widgets.find((item) => item.key === 'c')?.settings).toBeUndefined()
    expect(controller.isDefault.value).toBe(true)

    controller.setSetting('c', 'focus', 'cost')
    controller.reset()
    expect(controller.settingsOf('c')).toEqual({ focus: 'distance' })
  })

  it('leser et lagret valg for en innstilling', async () => {
    const { controller } = mountController({}, { [KEY]: { widgets: [{ key: 'c', settings: { focus: 'cost' } }] } })
    await vi.runAllTimersAsync()

    expect(controller.settingsOf('c')).toEqual({ focus: 'cost' })
  })

  it('har ingen høydeknapp der sonen ikke har rader', async () => {
    const { controller } = mountController()
    await vi.runAllTimersAsync()

    // Før rutenettet har meldt seg, og i kolonnen.
    expect(controller.nextRows('a')).toBeNull()
    fixedGrid(controller)
    expect(controller.nextRows('c')).toBeNull()

    controller.setRows('a', 5)
    expect(controller.rowsOf('a')).toBe(2)
  })

  it('finner raden under pekeren når radene har ulik høyde', () => {
    // Tre rader på 100, 300 og 100 piksler med 10 i mellomrom.
    const tracks = [100, 300, 100]

    expect(rowAt(0, tracks, 100, 10)).toBe(0)
    expect(rowAt(54, tracks, 100, 10)).toBe(0)
    expect(rowAt(56, tracks, 100, 10)).toBe(1)
    expect(rowAt(260, tracks, 100, 10)).toBe(1)
    expect(rowAt(270, tracks, 100, 10)).toBe(2)
    // Under de radene som finnes fortsetter radene med minstehøyden.
    expect(rowAt(700, tracks, 100, 10)).toBe(5)
    expect(rowAt(40, [], 100, 10)).toBe(0)
  })
})
