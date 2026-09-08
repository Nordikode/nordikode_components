import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NotificationBellMenu from '../../web/NotificationBellMenu.vue'

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

const meta: Meta<typeof NotificationBellMenu> = {
  title: 'Komponenter/Web/NotificationBellMenu',
  component: NotificationBellMenu,
  decorators: [
    () => ({
      template: `<div style="min-height: 420px; display: flex; justify-content: flex-end; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof NotificationBellMenu>

const labels = {
  menu: 'Varsler',
  menuWithUnread: 'Varsler, {count} uleste',
  title: 'Varsler',
  empty: 'Ingen varsler ennå.',
  markAllRead: 'Merk alle som lest',
  unread: 'ulest',
}

export const MedUleste: Story = {
  args: {
    labels,
    unreadCount: 2,
    items: [
      { id: '1', title: 'Kunden har akseptert tilbudet i «Bad Bergen»', timeLabel: '2 min siden', read: false },
      { id: '2', title: 'Ola Nordmann har sendt en melding i «Kjøkken Voss»', body: 'Kan dere komme tirsdag i stedet?', timeLabel: '1 t siden', read: false },
      { id: '3', title: 'Kunden har sendt inn opplysninger i «Terrasse Os»', timeLabel: 'i går', read: true },
    ],
  },
}

export const Tom: Story = {
  args: {
    labels,
    unreadCount: 0,
    items: [],
  },
}

export const MangeUleste: Story = {
  args: {
    labels,
    unreadCount: 120,
    items: [{ id: '1', title: 'Kunden har avslått tilbudet i «Garasje Åsane»', timeLabel: 'nå nettopp', read: false }],
  },
}
