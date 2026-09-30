import { defineComponent, h, ref } from 'vue'
import type { VNode } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkConversation from '../../components/NkConversation.vue'
import NkConversationListItem from '../../components/NkConversationListItem.vue'
import NkEmptyState from '../../components/NkEmptyState.vue'
import NkMessageComposer from '../../components/NkMessageComposer.vue'
import NkStatusChip from '../../components/NkStatusChip.vue'
import type { NkConversationEntry } from '../../types/NkConversationEntry'

// Samtalevisningen (SIGN-1313): helpcenter i konto-appen og «Henvendelser» i
// backoffice bruker de samme tre komponentene.
// NkConversation viser innslagene (bobler, dagskiller, hendelser) og ruller ikke
// selv: siden ruller, og skrivefeltet i `#footer` står fast nederst.
// NkMessageComposer er skrivefeltet. NkConversationListItem er raden i listen.
// All tekst kommer fra appens i18n — komponentene eier ingen strenger.

const meta: Meta<typeof NkConversation> = {
  title: 'Komponenter/NkConversation',
  component: NkConversation,
}

export default meta
type Story = StoryObj<typeof NkConversation>

const labels = { list: 'Meldinger i samtalen', newMessages: 'Nye meldinger' }
const composerLabels = { field: 'Skriv en melding', send: 'Send' }

const tid = (dagerSiden: number, klokke: string): string => {
  const dag = new Date()
  dag.setDate(dag.getDate() - dagerSiden)
  const [timer, minutter] = klokke.split(':').map(Number)
  dag.setHours(timer, minutter, 0, 0)

  return dag.toISOString()
}

// Norske eksempeldata: en byggmester som ikke får sendt et tilbud.
const samtale: NkConversationEntry[] = [
  { id: '1', kind: 'message', own: true, text: 'Hei! Jeg får ikke sendt tilbudet til kunden. Knappen «Send» gjør ingenting.', at: tid(2, '09:12') },
  { id: '2', kind: 'message', own: false, author: 'Nordikode', text: 'Hei, og takk for at du sier fra. Hvilken sak gjelder det?', at: tid(2, '09:20') },
  { id: '3', kind: 'message', own: true, text: 'Bad hos Hansen i Storgata 12.', at: tid(2, '09:21') },
  { id: '4', kind: 'message', own: false, author: 'Nordikode', text: 'Vi fant feilen: tilbudet manglet e-postadresse på kunden.\nDen er rettet nå. Kan du prøve igjen?', at: tid(1, '08:05') },
  { id: '5', kind: 'message', own: true, text: 'Nå gikk det. Takk!', at: tid(1, '08:40') },
  { id: '6', kind: 'event', text: 'Samtalen ble løst', at: tid(1, '08:45') },
  { id: '7', kind: 'message', own: true, text: 'En ting til: kan kunden signere på mobilen?', at: tid(0, '10:02') },
  { id: '8', kind: 'event', text: 'Samtalen ble åpnet igjen', at: tid(0, '10:02') },
  { id: '9', kind: 'message', own: false, author: 'Nordikode', text: 'Ja. Lenken i e-posten åpner tilbudet, og kunden signerer der.', at: tid(0, '10:15') },
]

const ramme = (innhold: () => VNode | VNode[]) =>
  h('div', { style: 'max-width:720px;margin:0 auto;padding:0 16px;background:var(--nk-page);' }, innhold())

const sendOk = async (): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 600))

  return true
}

// Brukerens side (konto-appen): egne meldinger til høyre, Nordikode til venstre.
export const Samtale: Story = {
  render: () =>
    ramme(() =>
      h(NkConversation, { entries: samtale, locale: 'no', labels }, {
        footer: () => h(NkMessageComposer, { send: sendOk, labels: composerLabels, maxLength: 5000 }),
      }),
    ),
}

// Backoffice: teamets svar er «egne», og under dem står lesebekreftelsen fra brukeren.
export const BackofficeMedLesebekreftelse: Story = {
  render: () => {
    const entries: NkConversationEntry[] = samtale.map((entry) =>
      entry.kind === 'event'
        ? entry
        : {
            ...entry,
            own: !entry.own,
            author: entry.own ? 'Kari Nordmann' : 'Siri Support',
            receipt: entry.own ? undefined : entry.id === '9' ? 'Sendt' : 'Lest 08:41',
          },
    )

    return ramme(() =>
      h(NkConversation, { entries, locale: 'no', labels }, {
        footer: () => h(NkMessageComposer, { send: sendOk, labels: { field: 'Skriv et svar', send: 'Send svar' }, maxLength: 5000 }),
      }),
    )
  },
}

// Ingen meldinger ennå: appen legger tom-tilstanden i `#empty`.
export const TomSamtale: Story = {
  render: () =>
    ramme(() =>
      h(NkConversation, { entries: [], locale: 'no', labels }, {
        empty: () =>
          h(NkEmptyState, {
            icon: 'mdi-message-outline',
            title: 'Ingen meldinger ennå',
            description: 'Skriv hva du trenger hjelp med, så svarer vi her.',
            size: 'compact',
          }),
        footer: () => h(NkMessageComposer, { send: sendOk, labels: composerLabels }),
      }),
    ),
}

// Sendingen feiler: teksten blir stående, og appen viser årsaken under feltet.
export const SendingSomFeiler: Story = {
  render: () => {
    const Demo = defineComponent({
      setup() {
        const error = ref('')
        const send = async (): Promise<boolean> => {
          await new Promise((resolve) => setTimeout(resolve, 600))
          error.value = 'Kunne ikke sende meldingen. Prøv igjen.'

          return false
        }

        return () =>
          ramme(() =>
            h(NkConversation, { entries: samtale.slice(0, 3), locale: 'no', labels }, {
              footer: () =>
                h(NkMessageComposer, { send, labels: composerLabels, error: error.value, modelValue: 'Hei, er dere der?' }),
            }),
          )
      },
    })

    return h(Demo)
  },
}

// Nye meldinger kommer inn mens samtalen er åpen. Er leseren nederst, følger
// visningen med. Har leseren rullet opp, vises knappen «Nye meldinger».
export const NyeMeldingerKommerInn: Story = {
  render: () => {
    const Demo = defineComponent({
      setup() {
        const entries = ref<NkConversationEntry[]>([...samtale])
        const sett = ref('')
        let teller = 0

        const svar = (): void => {
          teller += 1
          entries.value = [
            ...entries.value,
            { id: `ny-${teller}`, kind: 'message', own: false, author: 'Nordikode', text: `Nytt svar nummer ${teller}.`, at: new Date().toISOString() },
          ]
        }

        const send = async (text: string): Promise<boolean> => {
          teller += 1
          entries.value = [...entries.value, { id: `egen-${teller}`, kind: 'message', own: true, text, at: new Date().toISOString() }]

          return true
        }

        return () =>
          ramme(() => [
            h('p', { style: 'position:sticky;top:0;z-index:2;background:var(--nk-surface-soft);padding:8px;font-size:0.8rem;' }, [
              h('button', { type: 'button', onClick: svar, style: 'text-decoration:underline;margin-right:12px;' }, 'La Nordikode svare'),
              `Sist sett: ${sett.value || '–'}`,
            ]),
            h(NkConversation, {
              entries: entries.value,
              locale: 'no',
              labels,
              onSeen: (id: string) => {
                sett.value = id
              },
            }, {
              footer: () => h(NkMessageComposer, { send, labels: composerLabels }),
            }),
          ])
      },
    })

    return h(Demo)
  },
}

// Andre språk: dato og tid kommer fra Intl, ikke fra tekster.
export const FranskOgPolsk: Story = {
  render: () =>
    h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:24px;' }, [
      h(NkConversation, { entries: samtale.slice(3), locale: 'fr', labels: { list: 'Messages de la conversation', newMessages: 'Nouveaux messages' } }),
      h(NkConversation, { entries: samtale.slice(3), locale: 'pl', labels: { list: 'Wiadomości w rozmowie', newMessages: 'Nowe wiadomości' } }),
    ]),
}

// Samtalelisten: ulest vises som tall og fet tittel, status som chip.
export const Samtaleliste: Story = {
  render: () =>
    h('div', { style: 'max-width:720px;margin:0 auto;border:1px solid var(--nk-surface-border);border-radius:var(--nk-radius-md);overflow:hidden;background:var(--nk-surface);' }, [
      h(NkConversationListItem, {
        title: 'Får ikke sendt tilbudet',
        preview: 'Ja. Lenken i e-posten åpner tilbudet, og kunden signerer der.',
        at: tid(0, '10:15'),
        locale: 'no',
        unreadCount: 2,
        unreadLabel: '2 uleste meldinger',
        href: '#',
      }, { status: () => h(NkStatusChip, { label: 'Åpen', tone: 'inflight', size: 'sm' }) }),
      h(NkConversationListItem, {
        title: 'Spørsmål om fakturaen for september',
        preview: 'Takk, da er det i orden.',
        at: tid(5, '14:30'),
        locale: 'no',
        href: '#',
      }, { status: () => h(NkStatusChip, { label: 'Løst', tone: 'success', size: 'sm' }) }),
      h(NkConversationListItem, {
        title: 'Kan vi få flere brukere i abonnementet?',
        meta: 'Kari Nordmann · Bakken Bygg AS',
        preview: 'Vi er blitt fem ansatte og trenger to lisenser til.',
        at: tid(400, '09:00'),
        locale: 'no',
        unreadCount: 1,
        unreadLabel: '1 ulest melding',
        href: '#',
      }, { status: () => h(NkStatusChip, { label: 'Venter på oss', tone: 'warning', size: 'sm' }) }),
    ]),
}
