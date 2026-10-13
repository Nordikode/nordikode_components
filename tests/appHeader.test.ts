// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, type App } from 'vue'

import AppHeader, { type AppHeaderNavItem } from '../src/web/AppHeader.vue'

// Toppmenyen er felles for alle flatene (SIGN-1213): et punkt med undermeny
// og uten egen lenke skal være et nedtrekk, ikke en lenke — og undermenyens
// lenker skal følge med inn i mobilmenyen (burger-skuffen), ellers finnes
// de ikke på en telefon. SIGN-1195 var en typefeil som avviste slike punkter.

const labels = { navigation: 'Hovedmeny', menu: 'Åpne menyen' }

const nav: AppHeaderNavItem[] = [
  { key: 'home', label: 'Hjem', href: '/' },
  {
    key: 'products',
    label: 'Produkter',
    children: [
      { key: 'sign', label: 'Sign', href: '/products/sign' },
      { key: 'time', label: 'Time', href: '/products/time' },
    ],
  },
  { key: 'pricing', label: 'Priser', href: '/pricing' },
]

let app: App | null = null
let host: HTMLElement | null = null

function mountHeader(items: AppHeaderNavItem[] = nav) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({ render: () => h(AppHeader, { labels, nav: items, currentPath: '/products/time' }) })
  app.mount(host)

  const root = host
  const navEl = () => root.querySelector<HTMLElement>('.nk-header__nav')!
  const navLinks = () => Array.from(navEl().querySelectorAll<HTMLAnchorElement>('a.nk-header__link'))
  const dropdownButton = () => navEl().querySelector<HTMLButtonElement>('.nk-header__dropdown button')
  const dropdownLinks = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('.nk-header__dropdown-link'))
  const burger = () => root.querySelector<HTMLButtonElement>('.nk-header__burger')!
  const drawerLinks = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('.nk-header__drawer-link'))
  const settle = async () => {
    await nextTick()
    await nextTick()
  }

  return { navLinks, dropdownButton, dropdownLinks, burger, drawerLinks, settle }
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('toppmenyen', () => {
  it('viser et punkt med undermeny uten egen lenke som nedtrekk, ikke som lenke', async () => {
    const header = mountHeader()

    expect(header.navLinks().map((link) => link.textContent?.trim())).toEqual(['Hjem', 'Priser'])

    const button = header.dropdownButton()
    expect(button).not.toBeNull()
    expect(button?.textContent?.trim()).toBe('Produkter')
    expect(button?.getAttribute('aria-haspopup')).toBe('true')
    expect(button?.getAttribute('aria-expanded')).toBe('false')
    // Et barn er aktivt ⇒ forelderen markeres aktiv.
    expect(button?.classList.contains('nk-header__link--active')).toBe(true)
    expect(header.dropdownLinks()).toHaveLength(0)

    button?.click()
    await header.settle()

    expect(button?.getAttribute('aria-expanded')).toBe('true')
    expect(header.dropdownLinks().map((link) => link.getAttribute('href'))).toEqual(['/products/sign', '/products/time'])
    expect(header.dropdownLinks()[1]?.classList.contains('nk-header__dropdown-link--active')).toBe(true)
  })

  it('tar undermenyens lenker med i mobilmenyen, uten en rad for selve nedtrekket', async () => {
    const header = mountHeader()

    expect(header.drawerLinks()).toHaveLength(0)
    expect(header.burger().getAttribute('aria-expanded')).toBe('false')

    header.burger().click()
    await header.settle()

    expect(header.burger().getAttribute('aria-expanded')).toBe('true')
    const rows = header.drawerLinks()
    expect(rows.map((link) => link.getAttribute('href'))).toEqual(['/', '/products/sign', '/products/time', '/pricing'])
    expect(rows.map((link) => link.textContent?.trim())).not.toContain('Produkter')
    // Undermenyens lenker er innrykket som barn; toppunktene ikke.
    expect(rows.map((link) => link.classList.contains('nk-header__drawer-link--child'))).toEqual([false, true, true, false])
  })
})
