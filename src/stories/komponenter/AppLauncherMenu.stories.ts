import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppLauncherMenu from '../../web/AppLauncherMenu.vue'

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

const meta: Meta<typeof AppLauncherMenu> = {
  title: 'Komponenter/Web/AppLauncherMenu',
  component: AppLauncherMenu,
  decorators: [
    () => ({
      template: `<div style="min-height: 320px; display: flex; justify-content: flex-end; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof AppLauncherMenu>

export const Standard: Story = {
  args: {
    label: 'Nordikode-apper',
    apps: [
      { key: 'portal', label: 'Portal', url: 'https://portal.nordikode.com' },
      { key: 'sign', label: 'Sign', url: 'https://sign.nordikode.com' },
      { key: 'time', label: 'Time', url: 'https://time.nordikode.com' },
    ],
  },
}

export const MedBackoffice: Story = {
  args: {
    label: 'Nordikode-apper',
    apps: [
      { key: 'portal', label: 'Portal', url: 'https://portal.nordikode.com' },
      { key: 'sign', label: 'Sign', url: 'https://sign.nordikode.com' },
      { key: 'time', label: 'Time', url: 'https://time.nordikode.com' },
      { key: 'backoffice', label: 'Backoffice', url: 'https://backoffice.nordikode.com' },
      { key: 'website', label: 'Nettsted', url: 'https://nordikode.com' },
    ],
  },
}
