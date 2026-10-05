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
  // Badge-kontrakten: verts-appene setter disse fra error-tokenet.
  '--nk-chrome-badge: #c0504d',
  '--nk-chrome-badge-ink: #ffffff',
].join(';')

const meta: Meta<typeof NotificationBellMenu> = {
  title: 'Komponenter/Web/NotificationBellMenu',
  component: NotificationBellMenu,
  decorators: [
    () => ({
      template: `<div style="min-height: 420px; display: flex; align-items: flex-start; justify-content: flex-end; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof NotificationBellMenu>

// Mørk modus for historiene som viser fokusringen (SIGN-1288): `.dark` slår
// på komponentens mørke regler, og tokenene er Signs mørke palett.
const darkTokens = [
  '--color-surface: #050708',
  '--color-surface-alt: #080b0e',
  '--color-surface-raised: #0e1216',
  '--color-ink: #e6e9ee',
  '--color-ink-secondary: #98a2ab',
  '--color-ink-tertiary: #98a2ab',
  '--color-line: rgba(230, 233, 238, 0.14)',
  '--nk-chrome-accent: #dc7499',
  '--nk-chrome-accent-ink: #dc7499',
  'background: #050708',
  'padding: 12px',
].join(';')

const darkDecorator = () => ({
  template: `<div class="dark" style="flex: 1; min-height: 420px; display: flex; align-items: flex-start; justify-content: flex-end; ${darkTokens}"><story /></div>`,
})

/** Åpner panelet slik en tastaturbruker gjør: fokus på bjellen, så Enter. */
async function openPanel(canvasElement: HTMLElement) {
  const trigger = canvasElement.querySelector<HTMLButtonElement>('.nk-bell__trigger')
  if (!trigger || trigger.getAttribute('aria-expanded') === 'true') return
  trigger.focus()
  trigger.click()
  await new Promise((resolve) => setTimeout(resolve, 50))
}

/** Flytter fokus til rad nummer `index` blant menyelementene (0 = «Merk alle som lest»). */
async function focusMenuItem(canvasElement: HTMLElement, index: number) {
  await openPanel(canvasElement)
  canvasElement.querySelectorAll<HTMLElement>('[role="menuitem"]')[index]?.focus()
}

const labels = {
  menu: 'Varsler',
  menuWithUnread: 'Varsler, {count} uleste',
  title: 'Varsler',
  empty: 'Ingen varsler ennå.',
  markAllRead: 'Merk alle som lest',
  unread: 'ulest',
  loading: 'Henter varsler …',
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

const focusItems = [
  { id: '1', title: 'Kunden har akseptert tilbudet i «Bad Bergen»', timeLabel: '2 min siden', read: false },
  { id: '2', title: 'Ola Nordmann har sendt en melding i «Kjøkken Voss»', body: 'Kan dere komme tirsdag i stedet?', timeLabel: '1 t siden', read: false },
  { id: '3', title: 'Kunden har sendt inn opplysninger i «Terrasse Os»', timeLabel: 'i går', read: true },
]

/**
 * Fokus på en rad (SIGN-1288): ringen er tekstfargen (`--color-ink`), 2 px
 * innenfor raden. Bruk piltastene for å flytte den, Escape eller Tab for å
 * lukke — fokus går tilbake til bjellen.
 */
export const FokusPaaRad: Story = {
  args: { labels, unreadCount: 2, items: focusItems },
  play: async ({ canvasElement }) => focusMenuItem(canvasElement, 1),
}

/** Fokus på «Merk alle som lest» — samme ring som radene. */
export const FokusPaaMerkAlle: Story = {
  args: { labels, unreadCount: 2, items: focusItems },
  play: async ({ canvasElement }) => focusMenuItem(canvasElement, 0),
}

/** Fokusringen i mørk modus, der hover-bakgrunnen alene var usynlig (1,01:1). */
export const FokusMorkModus: Story = {
  args: { labels, unreadCount: 2, items: focusItems },
  decorators: [darkDecorator],
  play: async ({ canvasElement }) => focusMenuItem(canvasElement, 1),
}

/** Tomt panel, åpent: fokus står på bjellen, og Escape lukker panelet. */
export const TomtPanelAapent: Story = {
  args: { labels, unreadCount: 0, items: [] },
  play: async ({ canvasElement }) => openPanel(canvasElement),
}

/** Første last: panelet viser `labels.loading` i stedet for «…». */
export const Laster: Story = {
  args: { labels, unreadCount: 0, items: [], loading: true },
  play: async ({ canvasElement }) => openPanel(canvasElement),
}

/**
 * Merket ved ett, to og tre tegn. Det er festet i venstre kant og vokser
 * utover, så «99+» dekker ikke mer av bjellen enn «1» gjør.
 */
export const MerkeBredder: Story = {
  render: () => ({
    components: { NotificationBellMenu },
    setup: () => ({ labels, counts: [1, 12, 120] }),
    template: `
      <div style="display: flex; gap: 24px; align-items: center">
        <NotificationBellMenu v-for="count in counts" :key="count" :labels="labels" :unread-count="count" :items="[]" />
      </div>
    `,
  }),
}

/**
 * Lang tittel uten mellomrom i et 390 px bredt vindu: ordet brytes innenfor
 * panelet i stedet for å klippes ved kanten.
 */
export const LangTittel: Story = {
  args: {
    labels,
    unreadCount: 1,
    items: [
      { id: '1', title: 'Totalrenoveringavbadogvaskeromiandreetasjemedvarmekabler', body: 'https://sign.nordikode.example/cases/0198f3a2-7c1e-7e55-9b1d-3f6f0a1c2d4e/offers', timeLabel: 'nå nettopp', read: false },
      { id: '2', title: 'Kunden har sendt inn opplysninger i «Terrasse Os»', timeLabel: 'i går', read: true },
    ],
  },
  decorators: [
    () => ({
      template: '<div style="width: 390px; max-width: 100%; min-height: 420px; display: flex; align-items: flex-start; justify-content: flex-end; outline: 1px dashed var(--color-line)"><story /></div>',
    }),
  ],
  play: async ({ canvasElement }) => openPanel(canvasElement),
}
