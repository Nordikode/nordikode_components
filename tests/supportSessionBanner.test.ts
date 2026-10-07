// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'

import { supportSessionTexts } from '../src/web/supportSessionTexts'
import AppHeader from '../src/web/AppHeader.vue'
import { useSupportBannerHeight } from '../src/web/supportBannerHeight'

// Supportbanneret følger med headeren på alle flater (SIGN-1547). Det som
// voktes her: det vises bare i en økt, kan ikke lukkes, endringer slås aldri
// på uten bekreftelse, og fargene kommer fra varselrollen — aldri en hex.

const NOW = Date.parse('2026-10-05T10:00:00Z')

type Session = {
  userName: string
  tenantName?: string | null
  appName?: string | null
  mode: 'READ' | 'WRITE'
  expiresAt: string
  busy?: boolean
}

const session = (overrides: Partial<Session> = {}): Session => ({
  userName: 'Kari Hansen',
  tenantName: 'Torsvik Bygg',
  appName: 'Nordikode Sign',
  mode: 'READ',
  expiresAt: new Date(NOW + 23 * 60_000).toISOString(),
  ...overrides,
})

// Tiden skrives av Intl på brukerens språk; testen spør Intl om det samme.
const unit = (value: number, name: 'hour' | 'minute' | 'second', locale = 'en-GB'): string =>
  new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short' }).format(value)

let app: App | null = null
let host: HTMLElement | null = null

function mountHeader(initial: { supportSession: Session | null; locale?: string; supportSessionLabels?: Record<string, string> }) {
  const props = reactive({ labels: { navigation: 'Navigation', menu: 'Menu' }, ...initial })
  const modes: string[] = []
  let ended = 0

  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(AppHeader, {
        ...props,
        onSupportSessionMode: (mode: string) => modes.push(mode),
        onSupportSessionEnd: () => {
          ended += 1
        },
      } as never),
  })
  app.mount(host)

  const banner = () => host!.querySelector<HTMLElement>('.nk-support')
  const switchButton = () => host!.querySelector<HTMLButtonElement>('[role="switch"]')
  const buttons = () => Array.from(host!.querySelectorAll<HTMLButtonElement>('.nk-support__button'))

  return { props, modes, ended: () => ended, banner, switchButton, buttons }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
  vi.useRealTimers()
})

describe('supportbanneret i AppHeader', () => {
  it('vises ikke uten supportøkt', () => {
    const { banner } = mountHeader({ supportSession: null })

    expect(banner()).toBeNull()
  })

  it('sier hvem det vises som, modus i ord og tiden som er igjen', () => {
    const { banner } = mountHeader({ supportSession: session() })

    expect(banner()!.querySelector('.nk-support__title')!.textContent).toBe('You are viewing Nordikode Sign as Kari Hansen (Torsvik Bygg)')
    expect(banner()!.querySelector('.nk-support__mode')!.textContent).toBe('Read mode')
    expect(banner()!.querySelector('time')!.textContent).toBe(`${unit(23, 'minute')} left`)
    expect(banner()!.getAttribute('role')).toBe('region')
    expect(banner()!.getAttribute('aria-label')).toBe('Support session')
  })

  it('bruker tekstene og språket fra verts-appen', () => {
    const { banner } = mountHeader({
      supportSession: session({ expiresAt: new Date(NOW + 90 * 60_000).toISOString() }),
      locale: 'no',
      supportSessionLabels: { viewingAs: 'Du ser {app} som {name} ({tenant})', timeLeft: '{time} igjen', readMode: 'Lesemodus' },
    })
    const expected = `${unit(1, 'hour', 'nb-NO')} ${unit(30, 'minute', 'nb-NO')} igjen`

    expect(banner()!.querySelector('.nk-support__title')!.textContent).toBe('Du ser Nordikode Sign som Kari Hansen (Torsvik Bygg)')
    expect(banner()!.querySelector('.nk-support__mode')!.textContent).toBe('Lesemodus')
    expect(banner()!.querySelector('time')!.textContent).toBe(expected)
  })

  it('henter tekstene fra pakken på brukerens språk, uten at appen sender noen', () => {
    const { banner } = mountHeader({ supportSession: session({ mode: 'READ' }), locale: 'no' })

    expect(banner()!.textContent).toContain('Du ser Nordikode Sign som Kari Hansen (Torsvik Bygg)')
    expect(banner()!.textContent).toContain('Lesemodus')
    expect(banner()!.textContent).toContain('Avslutt')
  })

  it('har alle tekstene på hvert språk pakken har, og gir kildespråket ellers', () => {
    const source = supportSessionTexts('en')
    const files = import.meta.glob('../src/web/supportSessionTexts/*.json', { eager: true, import: 'default' })

    expect(Object.keys(files).length).toBeGreaterThan(1)

    for (const [path, texts] of Object.entries(files) as Array<[string, typeof source]>) {
      expect(Object.keys(texts.banner).sort(), path).toEqual(Object.keys(source.banner).sort())
      expect(Object.keys(texts.messages).sort(), path).toEqual(Object.keys(source.messages).sort())

      for (const value of [...Object.values(texts.banner), ...Object.values(texts.messages)]) {
        expect(value.trim(), path).not.toBe('')
      }

      // Plassholderne er de samme som i kilden.
      for (const key of ['viewingAs', 'viewingAsWithoutTenant', 'timeLeft'] as const) {
        expect((texts.banner[key].match(/\{\w+\}/g) ?? []).sort(), path).toEqual((source.banner[key].match(/\{\w+\}/g) ?? []).sort())
      }
    }

    expect(supportSessionTexts('no-NO')).toBe(supportSessionTexts('no'))
    expect(supportSessionTexts('xx')).toBe(source)
    expect(supportSessionTexts(null)).toBe(source)
  })

  it('utelater firmaet når det ikke har navn', () => {
    const { banner } = mountHeader({ supportSession: session({ tenantName: null }) })

    expect(banner()!.querySelector('.nk-support__title')!.textContent).toBe('You are viewing Nordikode Sign as Kari Hansen')
  })

  it('teller ned og sier fra når tiden er ute', async () => {
    const { banner } = mountHeader({ supportSession: session({ expiresAt: new Date(NOW + 61_000).toISOString() }) })

    expect(banner()!.querySelector('time')!.textContent).toBe(`${unit(2, 'minute')} left`)

    vi.advanceTimersByTime(31_000)
    await nextTick()
    expect(banner()!.querySelector('time')!.textContent).toBe(`${unit(30, 'second')} left`)

    vi.advanceTimersByTime(30_000)
    await nextTick()
    expect(banner()!.querySelector('time')!.textContent).toBe('The session has ended')
  })

  it('slår aldri på endringer uten bekreftelse', async () => {
    const { modes, switchButton, buttons, banner } = mountHeader({ supportSession: session() })

    expect(switchButton()!.getAttribute('aria-checked')).toBe('false')
    switchButton()!.click()
    await nextTick()
    await nextTick()

    expect(modes).toEqual([])
    expect(banner()!.querySelector('[role="alert"]')!.textContent).toBe('Changes you make are saved for the customer and logged.')
    expect(document.activeElement).toBe(buttons()[0])

    // Avbryt: ingenting sendes, bryteren er tilbake.
    buttons()[1].click()
    await nextTick()
    expect(modes).toEqual([])
    expect(switchButton()).not.toBeNull()

    switchButton()!.click()
    await nextTick()
    buttons()[0].click()
    await nextTick()
    expect(modes).toEqual(['WRITE'])
  })

  it('Escape avbryter bekreftelsen', async () => {
    const { modes, switchButton, banner } = mountHeader({ supportSession: session() })

    switchButton()!.click()
    await nextTick()
    banner()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(modes).toEqual([])
    expect(banner()!.querySelector('[role="alert"]')).toBeNull()
  })

  it('slår av endringer uten bekreftelse', async () => {
    const { modes, switchButton, banner } = mountHeader({ supportSession: session({ mode: 'WRITE' }) })

    expect(switchButton()!.getAttribute('aria-checked')).toBe('true')
    expect(banner()!.querySelector('.nk-support__mode')!.textContent).toBe('Changes are on')

    switchButton()!.click()
    await nextTick()
    expect(modes).toEqual(['READ'])
  })

  it('«Avslutt» sender hendelsen, og knappene er av mens et kall er underveis', async () => {
    const { props, ended, buttons, switchButton } = mountHeader({ supportSession: session() })

    buttons()[0].click()
    expect(ended()).toBe(1)

    props.supportSession = session({ busy: true })
    await nextTick()
    expect(buttons()[0].disabled).toBe(true)
    expect(switchButton()!.disabled).toBe(true)
  })

  it('kan ikke lukkes: banneret har bare bryteren og «Avslutt»', () => {
    const { banner } = mountHeader({ supportSession: session() })
    const controls = Array.from(banner()!.querySelectorAll('button')).map((button) => button.textContent!.trim())

    expect(controls).toEqual(['Make changes', 'End'])
  })

  it('melder høyden 0 når banneret er borte', async () => {
    const height = useSupportBannerHeight()
    const { props } = mountHeader({ supportSession: session() })

    props.supportSession = null
    await nextTick()
    expect(height.value).toBe(0)
  })
})

describe('supportbannerets farger', () => {
  const source = readFileSync(join(__dirname, '../src/web/SupportSessionBanner.vue'), 'utf8')
  const style = source.slice(source.indexOf('<style'))

  it('kommer fra varselrollen, aldri en hex', () => {
    expect(style).toContain('var(--nk-chrome-support, var(--nk-warning, var(--color-warning)))')
    expect(style).toContain('var(--nk-chrome-on-support, var(--nk-on-warning, var(--color-on-warning)))')
    expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(style).not.toMatch(/rgb\(/)
  })
})
