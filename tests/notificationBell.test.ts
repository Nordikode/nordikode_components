// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'

import NotificationBellMenu from '../src/web/NotificationBellMenu.vue'

// Bjellen er felles for alle flatene, så tastaturoppførselen og reglene som
// holder fokus synlig voktes her (SIGN-1288): fokus skal aldri havne på
// `body`, Escape skal virke i alle tilstander, og en regel som fjerner
// outline uten erstatning skal ikke komme tilbake.

const labels = {
  menu: 'Notifications',
  menuWithUnread: 'Notifications, {count} unread',
  title: 'Notifications',
  empty: 'No notifications yet.',
  markAllRead: 'Mark all as read',
  unread: 'unread',
  loading: 'Loading notifications',
}

const unreadItem = { id: '1', title: 'First', timeLabel: 'now', read: false }
const readItem = { id: '2', title: 'Second', timeLabel: 'yesterday', read: true }

type Props = { items: (typeof unreadItem)[]; unreadCount: number; loading?: boolean; labels: Partial<typeof labels> }

let app: App | null = null
let host: HTMLElement | null = null

function mountBell(initial: Partial<Props> = {}) {
  const props = reactive<Props>({ items: [unreadItem, readItem], unreadCount: 1, labels, ...initial })
  const selected: string[] = []

  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () => h(NotificationBellMenu, { ...props, onSelect: (item: { id: string }) => selected.push(item.id) } as never),
  })
  app.mount(host)

  const trigger = host.querySelector<HTMLButtonElement>('.nk-bell__trigger')!
  const panel = () => host!.querySelector<HTMLElement>('.nk-bell__panel')
  const menuItems = () => Array.from(host!.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  const press = (key: string, target: Element = document.activeElement ?? trigger) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event
  }
  const openPanel = async () => {
    trigger.focus()
    trigger.click()
    await nextTick()
    await nextTick()
  }

  return { props, selected, trigger, panel, menuItems, press, openPanel }
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('bjellens tastaturoppførsel', () => {
  it('setter fokus på første menyelement når panelet åpnes', async () => {
    const bell = mountBell()
    await bell.openPanel()

    expect(bell.panel()).not.toBeNull()
    expect(document.activeElement).toBe(bell.menuItems()[0])
  })

  it('Escape lukker panelet og gir fokus tilbake til bjellen', async () => {
    const bell = mountBell()
    await bell.openPanel()

    bell.press('Escape')
    await nextTick()

    expect(bell.trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bell.trigger)
  })

  it('Escape lukker også et panel uten rader, der fokus står på bjellen', async () => {
    const bell = mountBell({ items: [], unreadCount: 0 })
    await bell.openPanel()

    expect(bell.menuItems()).toHaveLength(0)
    expect(document.activeElement).toBe(bell.trigger)

    bell.press('Escape')
    await nextTick()

    expect(bell.trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bell.trigger)
  })

  it('Escape lukker panelet mens det laster', async () => {
    const bell = mountBell({ items: [], unreadCount: 0, loading: true })
    await bell.openPanel()

    bell.press('Escape')
    await nextTick()

    expect(bell.trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('Tab ut av panelet lukker det og gir fokus tilbake til bjellen, ikke til body', async () => {
    const bell = mountBell()
    await bell.openPanel()

    const event = bell.press('Tab')
    await nextTick()

    expect(event.defaultPrevented).toBe(true)
    expect(bell.trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bell.trigger)
  })

  it('Tab fra bjellen med åpent, tomt panel lukker panelet og lar Tab gå videre', async () => {
    const bell = mountBell({ items: [], unreadCount: 0 })
    await bell.openPanel()

    const event = bell.press('Tab')
    await nextTick()

    expect(event.defaultPrevented).toBe(false)
    expect(bell.trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('valg av en rad lukker panelet og gir fokus tilbake til bjellen', async () => {
    const bell = mountBell()
    await bell.openPanel()

    bell.menuItems()[1].click()
    await nextTick()

    expect(bell.selected).toEqual(['1'])
    expect(bell.trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bell.trigger)
  })

  it('piltastene flytter fokus mellom menyelementene og går rundt', async () => {
    const bell = mountBell()
    await bell.openPanel()
    const items = bell.menuItems()

    bell.press('ArrowDown')
    expect(document.activeElement).toBe(items[1])
    bell.press('End')
    expect(document.activeElement).toBe(items[items.length - 1])
    bell.press('ArrowDown')
    expect(document.activeElement).toBe(items[0])
  })

  it('taster gjør ingenting når panelet er lukket', () => {
    const bell = mountBell()
    bell.trigger.focus()

    expect(bell.press('Tab').defaultPrevented).toBe(false)
    expect(bell.press('ArrowDown').defaultPrevented).toBe(false)
    expect(bell.panel()).toBeNull()
  })
})

describe('bjellens tekster og merke', () => {
  it('viser lasteteksten fra labels mens feeden lastes', async () => {
    const bell = mountBell({ items: [], unreadCount: 0, loading: true })
    await bell.openPanel()

    expect(bell.panel()!.querySelector('.nk-bell__empty')!.textContent!.trim()).toBe(labels.loading)
  })

  it('viser tom-teksten når feeden er lastet og tom', async () => {
    const bell = mountBell({ items: [], unreadCount: 0 })
    await bell.openPanel()

    expect(bell.panel()!.querySelector('.nk-bell__empty')!.textContent!.trim()).toBe(labels.empty)
  })

  it('viser «99+» over 99 uleste, og det nøyaktige tallet i navnet på knappen', () => {
    const bell = mountBell({ unreadCount: 120 })

    expect(host!.querySelector('.nk-bell__badge')!.textContent).toBe('99+')
    expect(bell.trigger.getAttribute('aria-label')).toBe('Notifications, 120 unread')
  })
})

describe('bjellens stilregler', () => {
  const source = readFileSync(join(__dirname, '..', 'src', 'web', 'NotificationBellMenu.vue'), 'utf8')
  const css = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((match) => match[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selectors: selector.split(',').map((part) => part.trim()),
    body,
  }))
  const declarationsFor = (selector: string) =>
    rules
      .filter((rule) => rule.selectors.includes(selector))
      .map((rule) => rule.body)
      .join(';')

  it('fjerner aldri outline — fokus skal synes (WCAG 2.4.7)', () => {
    expect(css).not.toMatch(/outline:\s*(none|0)\b/)
  })

  it.each(['.nk-bell__item:focus-visible', '.nk-bell__mark-all:focus-visible'])('%s har en ring i tekstfargen', (selector) => {
    expect(declarationsFor(selector)).toMatch(/outline:\s*2px solid var\(--color-ink\)/)
  })

  it('merket er festet i venstre kant, så «99+» vokser utover og ikke over ikonet', () => {
    const badge = declarationsFor('.nk-bell__badge')

    expect(badge).toMatch(/inset-inline-start:/)
    expect(badge).not.toMatch(/inset-inline-end:/)
  })

  it.each(['.nk-bell__item-title', '.nk-bell__item-body'])('%s bryter lange ord uten mellomrom', (selector) => {
    expect(declarationsFor(selector)).toMatch(/overflow-wrap:\s*anywhere/)
  })
})
