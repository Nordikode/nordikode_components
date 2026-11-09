// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'

import NkLineChart from '../src/web/NkLineChart.vue'
import { niceStep, niceTicks } from '../src/web/lineChartScale'

// Linjediagrammet (SIGN-1873) er den delte tegningen av utvikling over tid.
// Testene dekker skalaen, at linjen tegnes, at trådkorset og tooltipen
// følger nærmeste kategori (peker og tastatur), og at tabellvisningen —
// den tilgjengelige tvillingen — har alle tallene.

const labels = { table: 'Vis som tabell', chart: 'Vis som diagram', category: 'Periode', empty: 'Ingen data ennå' }

let app: App | null = null

type Options = {
  categories: string[]
  series: { key: string; label: string; values: (number | null)[]; color?: string }[]
}

function mount(options: Options) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () => h(NkLineChart, { ...options, labels, ariaLabel: 'Nye kunder per uke', formatValue: (value: number) => `${value} stk` }),
  })
  app.mount(host)

  return host
}

afterEach(() => {
  app?.unmount()
  app = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** happy-dom måler ingen bredde: gi plottet en. */
const measure = (width: number): void => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 200,
    left: 0,
    top: 0,
    right: width,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('niceTicks', () => {
  it('runder opp til pene trinn og starter alltid på null', () => {
    expect(niceTicks(37, 4)).toEqual([0, 10, 20, 30, 40])
    expect(niceTicks(7, 4)).toEqual([0, 2, 4, 6, 8])
    expect(niceTicks(1234, 4)).toEqual([0, 500, 1000, 1500])
  })

  it('gir en heltallsakse når det ikke finnes tall', () => {
    expect(niceTicks(0, 4)).toEqual([0, 1, 2, 3, 4])
  })

  it('velger trinn blant 1, 2, 2,5 og 5', () => {
    expect(niceStep(1.3)).toBe(2)
    expect(niceStep(2.2)).toBe(2.5)
    expect(niceStep(4)).toBe(5)
    expect(niceStep(60)).toBe(100)
  })
})

describe('NkLineChart', () => {
  it('tegner linjen, aksen og sluttmerket for én serie', async () => {
    measure(600)
    const host = mount({ categories: ['2026-10-01', '2026-10-02', '2026-10-03'], series: [{ key: 'new', label: 'Nye', values: [2, 5, 3] }] })
    await nextTick()

    const line = host.querySelector('.nk-line-chart__line')
    expect(line?.getAttribute('d')).toMatch(/^M.* L.* L/)
    expect(line?.getAttribute('stroke-width')).toBe('2')
    expect(host.querySelector('.nk-line-chart__end-label')?.textContent?.trim()).toBe('3 stk')
    expect(host.querySelector('.nk-line-chart__legend')).toBeNull()
    expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Nye kunder per uke')
    expect([...host.querySelectorAll('.nk-line-chart__grid text')].map((node) => node.textContent?.trim())).toContain('0 stk')
  })

  it('viser alle seriene ved nærmeste kategori når pekeren beveger seg, og forklaringen for flere serier', async () => {
    measure(600)
    const host = mount({
      categories: ['a', 'b', 'c'],
      series: [
        { key: 'users', label: 'Brukere', values: [10, 20, 30] },
        { key: 'tenants', label: 'Firmaer', values: [1, 2, 3], color: 'var(--nk-text-title)' },
      ],
    })
    await nextTick()

    expect(host.querySelectorAll('.nk-line-chart__legend-item')).toHaveLength(2)

    const plot = host.querySelector<HTMLElement>('.nk-line-chart__plot')!
    plot.dispatchEvent(Object.assign(new Event('pointermove', { bubbles: true }), { clientX: 590 }))
    await nextTick()

    const rows = [...host.querySelectorAll('.nk-line-chart__tooltip-row strong')].map((node) => node.textContent?.trim())
    expect(rows).toEqual(['30 stk', '3 stk'])
    expect(host.querySelector('.nk-line-chart__crosshair')).not.toBeNull()

    plot.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    await nextTick()
    expect(host.querySelector('.nk-line-chart__tooltip')).toBeNull()
  })

  it('flytter trådkorset med piltastene', async () => {
    measure(600)
    const host = mount({ categories: ['a', 'b', 'c'], series: [{ key: 'n', label: 'Nye', values: [1, 2, 3] }] })
    await nextTick()

    const plot = host.querySelector<HTMLElement>('.nk-line-chart__plot')!
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(host.querySelector('.nk-line-chart__tooltip-title')?.textContent?.trim()).toBe('a')

    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    expect(host.querySelector('.nk-line-chart__tooltip-title')?.textContent?.trim()).toBe('c')

    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(host.querySelector('.nk-line-chart__tooltip')).toBeNull()
  })

  it('har en tabellvisning med hvert tall, og sier fra når det ikke finnes kategorier', async () => {
    measure(600)
    const host = mount({ categories: ['a', 'b'], series: [{ key: 'n', label: 'Nye', values: [4, null] }] })
    await nextTick()

    host.querySelector<HTMLButtonElement>('.nk-line-chart__toggle')!.click()
    await nextTick()

    const cells = [...host.querySelectorAll('.nk-line-chart__table tbody td')].map((node) => node.textContent?.trim())
    expect(cells).toEqual(['4 stk', '–'])
    expect(host.querySelector('.nk-line-chart__table thead th')?.textContent?.trim()).toBe('Periode')
    expect(host.querySelector('.nk-line-chart__toggle')?.textContent?.trim()).toBe('Vis som diagram')

    app?.unmount()
    const empty = mount({ categories: [], series: [] })
    await nextTick()
    expect(empty.querySelector('.nk-line-chart__empty')?.textContent?.trim()).toBe('Ingen data ennå')
  })
})

describe('NkLineChart – måling', () => {
  it('måler plottet når kategoriene kommer etter montering', async () => {
    measure(600)
    const state = reactive<{ categories: string[]; series: { key: string; label: string; values: number[] }[] }>({ categories: [], series: [] })
    const host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({ render: () => h(NkLineChart, { categories: state.categories, series: state.series, labels, ariaLabel: 'Nye', formatValue: (value: number) => String(value) }) })
    app.mount(host)
    await nextTick()
    expect(host.querySelector('.nk-line-chart__empty')).not.toBeNull()

    state.categories = ['a', 'b']
    state.series = [{ key: 'n', label: 'Nye', values: [1, 2] }]
    await nextTick()
    await nextTick()

    expect(host.querySelector('.nk-line-chart__svg')).not.toBeNull()
    expect(host.querySelector('.nk-line-chart__line')).not.toBeNull()
  })
})
