import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppHeader from '../../web/AppHeader.vue'
import ThemeToggle from '../../web/ThemeToggle.vue'
import TenantSwitcherMenu from '../../web/TenantSwitcherMenu.vue'
import AccountIdentityMenu from '../../web/AccountIdentityMenu.vue'

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
].join(';')

const meta: Meta<typeof AppHeader> = {
  title: 'Komponenter/Web/AppHeader',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
  decorators: [
    () => ({
      template: `<div style="min-height: 420px; background: #fafafa; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof AppHeader>

const labels = { navigation: 'Hovednavigasjon', menu: 'Meny' }

const nav = [
  { key: 'products', label: 'Produkter', href: '/produkter' },
  { key: 'prices', label: 'Priser', href: '/priser' },
  {
    key: 'resources',
    label: 'Ressurser',
    children: [
      { key: 'help', label: 'Hjelpesenter', href: '/hjelp' },
      { key: 'guides', label: 'Guider', href: '/guider' },
    ],
  },
]

export const Standard: Story = {
  args: { labels, nav, currentPath: '/priser' },
}

export const MedSuffiksOgBredde: Story = {
  name: 'Admin (suffiks + wide)',
  args: {
    labels,
    width: 'wide',
    currentPath: '/admin/pages',
    nav: [
      { key: 'dashboard', label: 'Dashboard', href: '/admin' },
      { key: 'pages', label: 'Pages', href: '/admin/pages' },
      { key: 'seo', label: 'SEO', href: '/admin/seo' },
    ],
  },
  render: (args) => ({
    components: { AppHeader },
    setup: () => ({ args }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Admin</template>
      </AppHeader>
    `,
  }),
}

export const MedMenyer: Story = {
  name: 'Med menyene i #menus',
  args: { labels, nav, currentPath: '/produkter' },
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels: { toLight: 'Bytt til lys modus', toDark: 'Bytt til mørk modus' },
      tenants: [
        { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: null },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels: { menu: 'Bytt firma', current: 'Aktivt firma', companies: 'Firmaene dine' },
      accountLabels: { menu: 'Konto', services: 'Tjenester', current: 'Du er her', logOut: 'Logg ut' },
      services: [{ key: 'account', label: 'Kontoinnstillinger', url: '#' }],
    }),
    template: `
      <AppHeader v-bind="args">
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="website"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}
