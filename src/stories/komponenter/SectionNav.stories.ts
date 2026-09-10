import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { mdiAccountMultipleOutline, mdiDomain, mdiPuzzleOutline, mdiShieldAccountOutline, mdiSitemapOutline } from '@mdi/js'
import SectionNav from '../../web/SectionNav.vue'

const webTokens = [
  '--color-surface: #ffffff',
  '--color-surface-alt: #f5f5f7',
  '--color-ink: #0d1c26',
  '--color-ink-secondary: #5f6970',
  '--color-line: #e8e8ed',
  '--radius-compact: 8px',
  '--nk-chrome-accent: #35569f',
  '--nk-chrome-accent-ink: #35569f',
].join(';')

const items = [
  { key: 'profil', label: 'Firmaprofil', href: '#profil', icon: mdiDomain },
  { key: 'personer', label: 'Personer', href: '#personer', icon: mdiAccountMultipleOutline, badge: 2 },
  { key: 'avdelinger', label: 'Avdelinger', href: '#avdelinger', icon: mdiSitemapOutline },
  { key: 'roller', label: 'Roller', href: '#roller', icon: mdiShieldAccountOutline },
  { key: 'utvidelser', label: 'Utvidelser', href: '#utvidelser', icon: mdiPuzzleOutline },
]

const meta: Meta<typeof SectionNav> = {
  title: 'Komponenter/Web/SectionNav',
  component: SectionNav,
  decorators: [
    () => ({
      template: `<div style="padding: 1.5rem; ${webTokens}"><story /></div>`,
    }),
  ],
  args: { items, activeKey: 'avdelinger', label: 'Firma' },
}

export default meta
type Story = StoryObj<typeof SectionNav>

/** Sidemeny (≥ 1280px) ved siden av innholdet; faner under 1280px — smalne vinduet for å se byttet. */
export const Sidemeny: Story = {
  render: (args) => ({
    components: { SectionNav },
    setup: () => ({ args }),
    template: `
      <div style="display:flex; gap:1.5rem; align-items:flex-start; flex-direction: column;" class="nk-story-shell">
        <SectionNav v-bind="args" />
        <div style="flex:1; min-width:0; padding:1rem; border:1px dashed var(--color-line); border-radius: var(--radius-compact); color: var(--color-ink-secondary)">Innholdet i valgt seksjon</div>
      </div>
      <style>@media (min-width: 1280px) { .nk-story-shell { flex-direction: row !important } }</style>
    `,
  }),
}

/** Seksjoner i samme visning (kontoinnstillingene): ingen lenker, `select`-hendelsen bytter. */
export const Valg: Story = {
  args: {
    items: [
      { key: 'profile', label: 'Profil', icon: mdiAccountMultipleOutline },
      { key: 'emails', label: 'E-postadresser' },
      { key: 'security', label: 'Sikkerhet', icon: mdiShieldAccountOutline },
    ],
    activeKey: 'profile',
    label: 'Innstillinger',
  },
}
