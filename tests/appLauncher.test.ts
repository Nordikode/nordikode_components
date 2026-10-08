// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, reactive, type App } from 'vue'

import AppLauncherMenu, { type AppLauncherItem } from '../src/web/AppLauncherMenu.vue'

// Har firmaet bare én app, er det ingenting å velge i (SIGN-1506): knappen
// er en direkte lenke med appens navn i stedet for ni prikker, så brukeren
// finner veien tilbake fra firmainnstillingene. To eller flere apper gir
// rutenettet som før.

const sign: AppLauncherItem = { key: 'sign', label: 'Sign', url: 'https://sign.example.test', group: 'products' }
const time: AppLauncherItem = { key: 'time', label: 'Time', url: 'https://time.example.test', group: 'products' }

let app: App | null = null

function mountLauncher(apps: AppLauncherItem[]) {
  const props = reactive({ apps, label: 'Apps' })
  const host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({ render: () => h(AppLauncherMenu, props) })
  app.mount(host)

  return { props, host }
}

afterEach(() => {
  app?.unmount()
  app = null
  document.body.innerHTML = ''
})

describe('app-velgeren', () => {
  it('viser én app som direkte lenke med navnet, uten rutenett-knapp', () => {
    const { host } = mountLauncher([sign])

    const link = host.querySelector<HTMLAnchorElement>('a.nk-launcher__direct')
    expect(link?.getAttribute('href')).toBe(sign.url)
    expect(link?.textContent).toContain('Sign')
    expect(host.querySelector('.nk-launcher__trigger')).toBeNull()
  })

  it('viser rutenett-knappen med menyen når det er flere apper', async () => {
    const { host } = mountLauncher([sign, time])

    expect(host.querySelector('.nk-launcher__direct')).toBeNull()
    host.querySelector<HTMLButtonElement>('.nk-launcher__trigger')!.click()
    await nextTick()

    const items = Array.from(host.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]'))
    expect(items.map((item) => item.getAttribute('href'))).toEqual([sign.url, time.url])
  })

  it('bytter til rutenettet når firmaet får en app til', async () => {
    const { props, host } = mountLauncher([sign])

    props.apps = [sign, time]
    await nextTick()

    expect(host.querySelector('.nk-launcher__direct')).toBeNull()
    expect(host.querySelector('.nk-launcher__trigger')).not.toBeNull()
  })
})
