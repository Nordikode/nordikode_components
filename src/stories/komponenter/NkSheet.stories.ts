import { defineComponent, h, ref } from 'vue'
import { VBtn, VSelect, VSwitch, VTextField, VTextarea } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkSheet from '../../components/NkSheet.vue'
import NkStatusChip from '../../components/NkStatusChip.vue'

// Dialogskallet (SIGN-733): hode, rullende kropp og festet handlingsrad.
// Kroppen er det eneste som ruller — hodet og handlingsraden står fast — og
// den har luft nok til Vuetifys flytende etiketter og fokusrammer, så
// ingenting klippes ved rulleposisjon 0. Under `smAndDown` er sheetet
// fullskjerm med safe-area på handlingsraden. All tekst kommer fra appen.

const meta: Meta<typeof NkSheet> = {
  title: 'Komponenter/NkSheet',
  component: NkSheet,
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    maxWidth: { control: 'number' },
    fullscreenOnMobile: { control: 'boolean' },
    eager: { control: 'boolean' },
  },
  args: {
    fullscreenOnMobile: true,
    eager: false,
  },
}

export default meta
type Story = StoryObj<typeof NkSheet>

interface SheetArgs {
  title?: string
  subtitle?: string
  maxWidth?: number | string
  fullscreenOnMobile?: boolean
  eager?: boolean
}

/** Åpneknapp + sheetet, så historien kan lukkes og åpnes igjen. */
const sheetStory = (
  args: SheetArgs,
  body: () => unknown,
  actions?: (close: () => void) => unknown,
  badge?: () => unknown,
) =>
  defineComponent({
    setup() {
      const open = ref(true)
      const close = () => {
        open.value = false
      }
      return () =>
        h('div', [
          h(VBtn, { onClick: () => (open.value = true) }, () => 'Åpne sheetet'),
          h(
            NkSheet,
            {
              ...args,
              modelValue: open.value,
              'onUpdate:modelValue': (value: boolean) => (open.value = value),
            },
            {
              default: body,
              ...(actions ? { actions: () => actions(close) } : {}),
              ...(badge ? { badge } : {}),
            },
          ),
        ])
    },
  })

const avbrytOgLagre = (close: () => void) => [
  h(VBtn, { variant: 'outlined', color: 'default', onClick: close }, () => 'Avbryt'),
  h(VBtn, { onClick: close }, () => 'Lagre'),
]

// Norske eksempeldata fra company: én avdeling — kort skjema som får plass
// uten rulling.
export const Kort: Story = {
  args: {
    title: 'Ny avdeling',
    maxWidth: 560,
  },
  render: (args) =>
    h(
      sheetStory(
        args as SheetArgs,
        () => [
          h(VTextField, { label: 'Navn', modelValue: 'Montering Bergen', autofocus: true }),
          h(VTextField, { label: 'Kode', modelValue: 'mont-brg', hint: 'Kort kode som brukes i rapporter', persistentHint: true }),
          h(VSelect, {
            label: 'Overordnet avdeling',
            items: ['Ingen', 'Drift', 'Montering'],
            modelValue: 'Montering',
          }),
          h(VTextarea, { label: 'Beskrivelse', rows: 2, autoGrow: true }),
        ],
        avbrytOgLagre,
      ),
    ),
}

const fagfelt = [
  'Tømrer', 'Rørlegger', 'Elektriker', 'Murer', 'Maler', 'Taktekker', 'Blikkenslager',
  'Flislegger', 'Gulvlegger', 'Anleggsgartner', 'Glassmester', 'Låsesmed', 'Snekker',
  'Betongarbeider', 'Stillasbygger', 'Isolatør', 'Ventilasjonsmontør', 'Kuldemontør',
]

// Lang, rullende: rollens rettigheter — hodet og handlingsraden står fast
// mens lista ruller. Rull til toppen: det første feltets etikett og
// fokusramme er ikke klippet.
export const LangRullende: Story = {
  args: {
    title: 'Rediger rolle',
    subtitle: 'Standardrollene følger plattformens katalog og kan ikke endres her.',
    maxWidth: 640,
  },
  render: (args) =>
    h(
      sheetStory(
        args as SheetArgs,
        () => [
          h(VTextField, { label: 'Navn', modelValue: 'Prosjektleder', autofocus: true }),
          h(VTextField, { label: 'Kode', modelValue: 'prosjektleder' }),
          h('p', { style: 'margin:0;font-weight:700;' }, 'Fagfelt rollen kan sette pris på'),
          ...fagfelt.map((fag) => h(VSwitch, { label: fag, color: 'primary', hideDetails: true, modelValue: fag === 'Tømrer' })),
          h(VTextarea, { label: 'Notat', rows: 3, autoGrow: true, hint: 'Vises bare for administratorer', persistentHint: true }),
        ],
        (close) => [
          h(VBtn, { variant: 'text', color: 'error', class: 'me-auto', onClick: close }, () => 'Slett rolle'),
          ...avbrytOgLagre(close),
        ],
        () => h(NkStatusChip, { tone: 'neutral', size: 'sm', label: 'Standardrolle' }),
      ),
    ),
}

// Fullskjerm på mobil (360 px): ingen hjørner, hele høyden, kroppen ruller
// og handlingsraden ligger festet over safe-area.
export const FullskjermMobil: Story = {
  args: {
    title: 'Ny timeføring',
    subtitle: 'Timer registrert i dag legges på prosjektet du velger.',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) =>
    h(
      sheetStory(
        args as SheetArgs,
        () => [
          h(VTextField, { label: 'Dato', type: 'date', modelValue: '2026-09-17', autofocus: true }),
          h(VSelect, { label: 'Sak', items: ['Bad Haugesund', 'Tilbygg Kleppestø', 'Tak Loddefjord'], modelValue: 'Bad Haugesund' }),
          h(VSelect, { label: 'Timetype', items: ['Ordinær', 'Overtid 50 %', 'Overtid 100 %'], modelValue: 'Ordinær' }),
          h(VTextField, { label: 'Tid', modelValue: '7:30', hint: 'Timer og minutter, f.eks. 7:30', persistentHint: true }),
          h(VTextarea, { label: 'Beskrivelse', rows: 3, autoGrow: true, modelValue: 'Flislegging bad, andre etasje.' }),
          ...fagfelt.slice(0, 8).map((fag) => h(VSwitch, { label: fag, color: 'primary', hideDetails: true })),
        ],
        (close) => [
          h(VBtn, { variant: 'text', color: 'error', class: 'me-auto', onClick: close }, () => 'Slett'),
          ...avbrytOgLagre(close),
        ],
      ),
    ),
}

// Bekreftelse: bare tekst og to knapper — her er fullskjerm på mobil skrudd
// av, et kort spørsmål trenger ikke hele skjermen.
export const Bekreftelse: Story = {
  args: {
    title: 'Logg ut fra Safari på iPhone?',
    maxWidth: 480,
    fullscreenOnMobile: false,
  },
  render: (args) =>
    h(
      sheetStory(
        args as SheetArgs,
        () => h('p', { class: 'text-body-2 text-medium-emphasis', style: 'margin:0;' }, 'Enheten må logge inn på nytt. Det du holdt på med der, går tapt hvis det ikke er lagret.'),
        (close) => [
          h(VBtn, { variant: 'outlined', color: 'default', onClick: close }, () => 'Avbryt'),
          h(VBtn, { color: 'error', onClick: close }, () => 'Logg ut'),
        ],
      ),
    ),
}
