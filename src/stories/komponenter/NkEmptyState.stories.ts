import { h } from 'vue'
import { VBtn } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkEmptyState from '../../components/NkEmptyState.vue'

// Tom-tilstanden (SIGN-447): TO størrelser.
// default = hele flater/paneler der ingenting er registrert ennå (primær-tonet ikonsirkel).
// compact = lister etter søk/filter («ingen treff»): mindre luft, dempet ikonsirkel.
// Ikonet er valgfritt, handlingene kommer i `actions`-slotten, og all tekst
// kommer fra appens i18n — komponenten eier ingen strenger.

const meta: Meta<typeof NkEmptyState> = {
  title: 'Komponenter/NkEmptyState',
  component: NkEmptyState,
  argTypes: {
    size: { control: 'select', options: ['default', 'compact'] },
    icon: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof NkEmptyState>

const knapp = (tekst: string, props: Record<string, unknown> = {}) =>
  h(VBtn, { prependIcon: 'mdi-plus', ...props }, () => tekst)

// Norske eksempeldata fra Sign: sakslisten hos en helt ny tenant.
export const Standard: Story = {
  args: {
    icon: 'mdi-folder-plus-outline',
    title: 'Ingen saker ennå',
    description: 'Fått en henvendelse fra en kunde? Registrer saken her og hent inn mer informasjon med kunde-lenken.',
    size: 'default',
  },
  render: (args) => h(NkEmptyState, args, { actions: () => knapp('Registrer første sak') }),
}

// Kompakt: ingen treff etter søk eller filter i sakslisten.
export const Kompakt: Story = {
  args: {
    icon: 'mdi-magnify',
    title: 'Ingen saker matcher',
    description: 'Prøv et annet søk eller nullstill filteret.',
    size: 'compact',
  },
  render: (args) =>
    h(NkEmptyState, args, {
      actions: () => knapp('Nullstill filter', { prependIcon: 'mdi-restore', size: 'small', variant: 'tonal' }),
    }),
}

// Uten ikon og uten handling: bare tittel og linje.
export const UtenIkonOgHandling: Story = {
  args: {
    title: 'Ingen hendelser på denne saken ennå',
    description: 'Hendelser dukker opp her etter hvert som saken beveger seg.',
    size: 'compact',
  },
}

// Med ikon, uten handling (f.eks. en tom liste brukeren ikke kan fylle selv).
export const UtenHandling: Story = {
  args: {
    icon: 'mdi-inbox-arrow-down-outline',
    title: 'Ingen varsler ennå',
    description: 'Vi sier fra her når noe skjer på sakene dine.',
    size: 'default',
  },
}

// Begge størrelsene side om side — samme innhold, ulik luft og ikontone.
export const BeggeStorrelser: Story = {
  render: () =>
    h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;' }, [
      h('div', { style: 'border:1px solid var(--nk-surface-border);border-radius:var(--nk-radius-md);background:var(--nk-surface-soft);' }, [
        h(
          NkEmptyState,
          { icon: 'mdi-folder-plus-outline', title: 'Ingen saker ennå', description: 'Registrer saken her og hent inn mer informasjon med kunde-lenken.', size: 'default' },
          { actions: () => knapp('Registrer første sak') },
        ),
      ]),
      h('div', { style: 'border:1px solid var(--nk-surface-border);border-radius:var(--nk-radius-md);background:var(--nk-surface-soft);' }, [
        h(
          NkEmptyState,
          { icon: 'mdi-magnify', title: 'Ingen saker matcher', description: 'Prøv et annet søk eller nullstill filteret.', size: 'compact' },
          { actions: () => knapp('Nullstill filter', { prependIcon: 'mdi-restore', size: 'small', variant: 'tonal' }) },
        ),
      ]),
    ]),
}
