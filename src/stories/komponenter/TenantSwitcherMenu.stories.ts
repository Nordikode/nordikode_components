import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TenantSwitcherMenu from '../../web/TenantSwitcherMenu.vue'

/**
 * Verts-appen eier web-designtokenene; dekoratøren mapper dem fra `--nk-*`
 * slik Sign/Time gjør i sin style.css, så historien følger Modus-valget
 * (lys/mørk) i verktøylinja.
 */
const webTokens = [
  '--color-surface: var(--nk-surface)',
  '--color-surface-alt: var(--nk-surface-soft)',
  '--color-surface-raised: var(--nk-surface)',
  '--color-ink: var(--nk-text-primary)',
  '--color-ink-secondary: var(--nk-text-secondary)',
  '--color-ink-tertiary: var(--nk-text-secondary)',
  '--color-line: var(--nk-surface-border)',
  '--radius-compact: var(--nk-radius-sm)',
  '--radius-standard: var(--nk-radius-lg)',
  '--nk-chrome-accent: var(--nk-on-info-soft)',
  '--nk-chrome-accent-ink: var(--nk-on-info-soft)',
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

export const MedPersonlig: Story = {
  args: {
    selectedId: 'personal',
    labels,
    personal: { id: 'personal', name: 'Personlig' },
    tenants: [
      { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: null },
      { id: 't-2', name: 'Håndverkspartner Sørvest AS', logoUrl: null },
    ],
  },
}

/**
 * Firmablokken (SIGN-561) — standardvarianten i `AppHeader`s `#tenant`-slot:
 * logo (initialer uten logo) og fullt firmanavn på transparent flate, panelet
 * venstrejustert under blokken. Navnet trunkeres når plassen er knapp.
 */
export const Firmablokk: Story = {
  args: {
    selectedId: 't-1',
    labels,
    variant: 'block',
    tenants: [
      {
        id: 't-1',
        name: 'Bygg og Anlegg AS',
        logoUrl:
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#35569f"/><path d="M14 44 32 16l18 28H14Z" fill="#bfd75b"/></svg>',
          ),
      },
      { id: 't-2', name: 'Håndverkspartner Sørvest AS', logoUrl: null },
    ],
  },
  decorators: [
    () => ({
      template: `<div style="min-height: 340px; width: 100%; display: flex; justify-content: flex-start; ${webTokens}"><story /></div>`,
    }),
  ],
}

export const FirmablokkPersonlig: Story = {
  name: 'Firmablokk – personlig kontekst',
  args: {
    selectedId: 'personal',
    labels,
    variant: 'block',
    personal: { id: 'personal', name: 'Kari Nordmann' },
    tenants: [{ id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: null }],
  },
  decorators: [
    () => ({
      template: `<div style="min-height: 340px; width: 100%; display: flex; justify-content: flex-start; ${webTokens}"><story /></div>`,
    }),
  ],
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
