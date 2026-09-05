import type { Meta, StoryObj } from '@storybook/vue3-vite'
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
  '--nk-chrome-accent: #2e6b5f',
  '--nk-chrome-accent-ink: #2e6b5f',
].join(';')

const meta: Meta<typeof AccountIdentityMenu> = {
  title: 'Komponenter/Web/AccountIdentityMenu',
  component: AccountIdentityMenu,
  decorators: [
    () => ({
      template: `<div style="min-height: 380px; display: flex; justify-content: flex-end; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof AccountIdentityMenu>

const labels = {
  menu: 'Konto',
  services: 'Tjenester',
  current: 'Du er her',
  logOut: 'Logg ut',
}

export const Standard: Story = {
  args: {
    name: 'Hedvig Moore',
    email: 'hedvig.moore@nordikode.com',
    currentServiceKey: 'account',
    labels,
    services: [
      { key: 'account', label: 'Kontoinnstillinger', url: 'https://account.nordikode.com/settings' },
      { key: 'portal', label: 'Portal', url: 'https://portal.nordikode.com' },
      { key: 'sign', label: 'Sign', url: 'https://sign.nordikode.com' },
      { key: 'time', label: 'Time', url: 'https://time.nordikode.com' },
      { key: 'website', label: 'Nettsted', url: 'https://nordikode.com' },
    ],
  },
}

export const MedTemavalg: Story = {
  args: {
    ...Standard.args,
    theme: {
      label: 'Utseende',
      value: 'system',
      options: [
        { value: 'light', label: 'Lyst' },
        { value: 'dark', label: 'Mørkt' },
        { value: 'system', label: 'Følg systemet' },
      ],
    },
  },
}

export const UtenTjenesteliste: Story = {
  args: {
    name: 'Christer Såheim',
    email: 'christer@nordikode.com',
    currentServiceKey: 'website',
    labels,
    services: [],
  },
}
