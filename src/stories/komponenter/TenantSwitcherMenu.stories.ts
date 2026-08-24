import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TenantSwitcherMenu from '../../web/TenantSwitcherMenu.vue'

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

const meta: Meta<typeof TenantSwitcherMenu> = {
  title: 'Komponenter/Web/TenantSwitcherMenu',
  component: TenantSwitcherMenu,
  decorators: [
    () => ({
      template: `<div style="min-height: 340px; display: flex; justify-content: flex-end; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof TenantSwitcherMenu>

const labels = {
  menu: 'Bytt firma',
  current: 'Aktivt firma',
  companies: 'Firmaene dine',
}

export const Standard: Story = {
  args: {
    selectedId: 't-1',
    labels,
    tenants: [
      { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: null },
      { id: 't-2', name: 'Håndverkspartner Sørvest AS', logoUrl: null },
      { id: 't-3', name: 'Moore Eiendom AS', logoUrl: null },
    ],
  },
}

export const UnderBytte: Story = {
  args: {
    selectedId: 't-1',
    labels,
    switching: true,
    tenants: [
      { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: null },
      { id: 't-2', name: 'Håndverkspartner Sørvest AS', logoUrl: null },
    ],
  },
}
