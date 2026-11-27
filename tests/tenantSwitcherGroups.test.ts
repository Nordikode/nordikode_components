// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, type App } from 'vue'

import TenantSwitcherMenu, { type TenantSwitcherGroup } from '../src/web/TenantSwitcherMenu.vue'

// Konsern i firmavelgeren (SIGN-2023): konsernet står øverst med firmaene
// sine under. Et firma uten konsern skal ikke merke noe — uten `groups` er
// panelet det samme som før.

const labels = { menu: 'Bytt firma', current: 'Aktivt firma', companies: 'Firmaene dine', group: 'Konsern' }

const tenants = [
  { id: 't-1', name: 'Nordbygg Norge AS' },
  { id: 't-2', name: 'Nordbygg Sverige AB' },
  { id: 't-3', name: 'Moore Eiendom AS' },
]

let app: App | null = null
let host: HTMLElement | null = null
const selected: string[] = []

async function openMenu(groups?: TenantSwitcherGroup[] | null) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(TenantSwitcherMenu, {
        tenants,
        selectedId: 't-1',
        labels,
        groups,
        variant: 'block',
        onSelect: (id: string) => selected.push(id),
      }),
  })
  app.mount(host)
  host.querySelector<HTMLButtonElement>('.nk-tenant__trigger')!.click()
  await nextTick()

  return host.querySelector<HTMLElement>('.nk-tenant__panel')!
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
  selected.length = 0
})

const itemNames = (panel: HTMLElement, selector: string) =>
  Array.from(panel.querySelectorAll<HTMLElement>(selector)).map((el) => el.querySelector('.nk-tenant__item-label')!.textContent!.trim())

describe('TenantSwitcherMenu with groups', () => {
  it('is unchanged without groups: one heading and a flat list', async () => {
    for (const groups of [undefined, null, []]) {
      const panel = await openMenu(groups)

      expect(panel.querySelector('.nk-tenant__group')).toBeNull()
      expect(panel.querySelectorAll('.nk-tenant__section-label')).toHaveLength(1)
      expect(panel.querySelector('.nk-tenant__item--grouped')).toBeNull()
      expect(itemNames(panel, 'button.nk-tenant__item')).toEqual(tenants.map((tenant) => tenant.name))

      app?.unmount()
      host?.remove()
    }
  })

  it('shows the group first with its companies under it, then the other companies', async () => {
    const panel = await openMenu([{ id: 'g-1', name: 'Nordbygg Gruppen', tenantIds: ['t-2', 't-1'], href: '/group/g-1' }])

    const group = panel.querySelector<HTMLAnchorElement>('a.nk-tenant__group')!
    expect(group.getAttribute('href')).toBe('/group/g-1')
    expect(group.getAttribute('role')).toBe('menuitem')
    expect(group.querySelector('.nk-tenant__group-kicker')!.textContent).toBe('Konsern')
    expect(group.querySelector('.nk-tenant__group-name')!.textContent).toBe('Nordbygg Gruppen')

    // Firmaene beholder rekkefølgen fra `tenants`, innrykket under konsernet.
    expect(itemNames(panel, '.nk-tenant__item--grouped')).toEqual(['Nordbygg Norge AS', 'Nordbygg Sverige AB'])
    expect(itemNames(panel, 'button.nk-tenant__item:not(.nk-tenant__item--grouped)')).toEqual(['Moore Eiendom AS'])

    // Konsernet står over overskriften for de øvrige firmaene.
    const order = Array.from(panel.children).map((el) => el.className)
    expect(order.findIndex((name) => name.includes('nk-tenant__group'))).toBeLessThan(
      order.findIndex((name) => name.includes('nk-tenant__section-label')),
    )
  })

  it('renders a group without an address as a heading, not a link', async () => {
    const panel = await openMenu([{ id: 'g-1', name: 'Nordbygg Gruppen', tenantIds: ['t-1', 't-2', 't-3'] }])

    expect(panel.querySelector('a.nk-tenant__group')).toBeNull()
    expect(panel.querySelector('div.nk-tenant__group')!.getAttribute('role')).toBeNull()
    // Alle firmaene er i konsernet: ingen egen overskrift for «resten».
    expect(panel.querySelector('.nk-tenant__section-label')).toBeNull()
  })

  it('still switches company from inside a group', async () => {
    const panel = await openMenu([{ id: 'g-1', name: 'Nordbygg Gruppen', tenantIds: ['t-1', 't-2'], href: '/group/g-1' }])

    panel.querySelectorAll<HTMLButtonElement>('.nk-tenant__item--grouped')[1]!.click()

    expect(selected).toEqual(['t-2'])
  })
})
