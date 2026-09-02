import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppTopBar from '../../web/AppTopBar.vue'

/**
 * Verts-appen eier web-designtokenene; dekoratøren setter dem slik
 * nettsiden/konto-appen gjør i sin app.css (lys modus).
 */
const webTokens = [
  '--color-surface: #ffffff',
  '--color-surface-alt: #f5f7f9',
  '--color-surface-raised: #ffffff',
  '--color-ink: #1d1d1f',
  '--color-ink-secondary: #52525b',
  '--color-ink-tertiary: #6e6e73',
  '--color-line: #e8e8ed',
  '--radius-compact: 8px',
  '--radius-standard: 14px',
  '--nk-chrome-accent: #3b5b72',
  '--nk-chrome-accent-ink: #3b5b72',
  '--nk-chrome-badge: #c0504d',
  '--nk-chrome-badge-ink: #ffffff',
].join(';')

const meta: Meta<typeof AppTopBar> = {
  title: 'Komponenter/Web/AppTopBar',
  component: AppTopBar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    () => ({
      template: `<div style="min-height: 360px; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof AppTopBar>

/**
 * Produktappenes topbar (SIGN-94, vedtak 01.09): brand-slot til venstre,
 * standard plassert chrome til høyre — app-velger, firmameny (chip) og
 * kontomeny, de bokstavelig samme komponentene som nettsiden bruker.
 */
export const Standard: Story = {
  render: (args) => ({
    components: { AppTopBar },
    setup: () => ({ args }),
    template: `
      <AppTopBar v-bind="args">
        <template #brand>
          <span class="nk-topbar__chip" aria-hidden="true" style="font-weight:700;">S</span>
        </template>
        <template #tenant-menu-footer>
          <a href="#" role="menuitem" style="display:flex;gap:0.625rem;padding:0.5rem 0.75rem;font-size:0.875rem;color:var(--color-ink-secondary);text-decoration:none;">Firmainnstillinger</a>
        </template>
      </AppTopBar>
    `,
  }),
  args: {
    appTitle: 'Sign',
    launcherLabel: 'Nordikode-apper',
    launcherApps: [
      { key: 'sign', label: 'Sign', url: '#', group: 'products' },
      { key: 'time', label: 'Time', url: '#', group: 'products' },
      { key: 'website', label: 'Nettsiden', url: '#', group: 'services' },
    ],
    launcherGroupLabels: { products: 'Produkter', services: 'Tjenester', internal: 'Internt' },
    tenants: [
      { id: 'bakken', name: 'Bakken Bygg AS' },
      { id: 'moore', name: 'Moore Montasje' },
    ],
    selectedTenantId: 'bakken',
    tenantLabels: { menu: 'Firmameny', current: 'Valgt firma', companies: 'Dine firmaer' },
    userName: 'Hedvig Moore',
    userEmail: 'hedvig.moore@nordikode.com',
    accountServices: [{ key: 'account', label: 'Kontoinnstillinger', url: '#' }],
    currentServiceKey: 'sign',
    accountLabels: { menu: 'Konto', services: 'Dine tjenester', current: 'Nåværende', logOut: 'Logg ut' },
  },
}

/** Uten produktvelger (feature-flagget av) og uten temabryter. */
export const UtenValgfrieMenyer: Story = {
  args: {
    ...Standard.args,
    appTitle: 'Time',
    showLauncher: false,
    showThemeToggle: false,
  },
}
