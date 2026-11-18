import { defineComponent, h, ref } from 'vue'
import { VBtn, VTextarea } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkConfirmDialog from '../../components/NkConfirmDialog.vue'

// Felles bekreftelse (SIGN-846): ett spørsmål, en kort forklaring og to
// knapper. Teksten er appens og følger tone-regelen: tittelen er spørsmålet,
// bekreft-knappen sier handlingen («Slett avdelingen», aldri «OK»), feilen
// er «Kunne ikke X.». `confirm` lukker ikke dialogen — eieren utfører
// handlingen med `loading` og lukker selv, eller setter `error`.
//
// Knappene (SIGN-1763): «Avbryt» er en tekstknapp i appens egen knappefarge,
// lik «Avbryt» i appens andre dialoger, og handlingen er den fylte knappen.
// Fokus starter på «Avbryt». Åpner du bekreftelsen med musen, vises ingen
// fokusmarkering; åpner du den fra tastaturet (Tab til «Åpne bekreftelsen»,
// så Enter), vises den. Trykker du Tab etter et museklikk, kommer den også.

const meta: Meta<typeof NkConfirmDialog> = {
  title: 'Komponenter/NkConfirmDialog',
  component: NkConfirmDialog,
  argTypes: {
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    tone: { control: 'inline-radio', options: ['default', 'danger'] },
    loading: { control: 'boolean' },
    confirmDisabled: { control: 'boolean' },
    error: { control: 'text' },
    maxWidth: { control: 'number' },
  },
  args: {
    cancelLabel: 'Avbryt',
    tone: 'default',
    loading: false,
    confirmDisabled: false,
    error: '',
  },
}

export default meta
type Story = StoryObj<typeof NkConfirmDialog>

type Outcome = 'ok' | 'feil'

/** Åpneknapp + bekreftelsen, med en liten ventetid som viser `loading`. */
const confirmStory = (args: Record<string, unknown>, outcome: Outcome = 'ok', failure = '', body?: () => unknown) =>
  defineComponent({
    setup() {
      const open = ref(true)
      const loading = ref(false)
      const error = ref('')
      const confirm = () => {
        loading.value = true
        error.value = ''
        setTimeout(() => {
          loading.value = false
          if (outcome === 'ok') open.value = false
          else error.value = failure
        }, 900)
      }
      return () =>
        h('div', [
          h(VBtn, { onClick: () => (open.value = true) }, () => 'Åpne bekreftelsen'),
          h(
            NkConfirmDialog,
            {
              ...args,
              loading: loading.value || Boolean(args.loading),
              error: error.value || String(args.error ?? ''),
              modelValue: open.value,
              'onUpdate:modelValue': (value: boolean) => (open.value = value),
              onConfirm: confirm,
              onCancel: () => (error.value = ''),
            } as never,
            body ? { default: body } : undefined,
          ),
        ])
    },
  })

// Vanlig bekreftelse: «Avbryt» som tekstknapp og handlingen fylt, begge i
// appens handlingsfarge (berry i Sign). Slik ser alle bekreftelser i Sign ut,
// også de som ikke kan angres: Sign har ingen rød knapp.
export const Standard: Story = {
  args: {
    title: 'Arkivere saken «Bad Haugesund»?',
    message: 'Saken flyttes ut av listen. Du finner den igjen under Arkiverte og kan hente den tilbake.',
    confirmLabel: 'Arkiver saken',
  },
  render: (args) => h(confirmStory(args as unknown as Record<string, unknown>)),
}

// Bare spørsmålet: uten melding og innhold har dialogen ingen tom kropp, og
// knappene står rett under spørsmålet (NkSheet, SIGN-1763).
export const BareSporsmalet: Story = {
  name: 'Bare spørsmålet',
  args: {
    title: 'Forkaste endringene i tilbudet?',
    confirmLabel: 'Forkast endringene',
  },
  render: (args) => h(confirmStory(args as unknown as Record<string, unknown>)),
}

// `tone="danger"` gir bekreft-knappen feilfargen. Om en app har en rød
// handling i det hele tatt, er appens valg: Sign bruker den ikke (bytt
// produkt i verktøylinjen for å se den der den brukes).
export const KanIkkeAngres: Story = {
  args: {
    title: 'Slette avdelingen «Montering Bergen»?',
    message: 'De tre ansatte i avdelingen blir stående uten avdeling. Dette kan ikke angres.',
    confirmLabel: 'Slett avdelingen',
    tone: 'danger',
  },
  render: (args) => h(confirmStory(args as unknown as Record<string, unknown>)),
}

// Handlingen feilet: dialogen står, og feilen leses opp (`role="alert"`).
export const Feil: Story = {
  args: {
    title: 'Trekke tilbake tilbudet til Kari Nordmann?',
    message: 'Lenken kunden har fått, slutter å virke.',
    confirmLabel: 'Trekk tilbake tilbudet',
    tone: 'danger',
  },
  render: (args) => h(confirmStory(args as unknown as Record<string, unknown>, 'feil', 'Kunne ikke trekke tilbake tilbudet.')),
}

// Ett felt i standard-slotten (begrunnelse). Mer enn det er et skjema, og
// hører hjemme i NkSheet eller på en egen side.
export const MedBegrunnelse: Story = {
  args: {
    title: 'Avslå budet fra Rør og Varme AS?',
    message: 'Underentreprenøren får beskjed på e-post.',
    confirmLabel: 'Avslå budet',
  },
  render: (args) =>
    h(
      confirmStory(args as unknown as Record<string, unknown>, 'ok', '', () =>
        h(VTextarea, { label: 'Begrunnelse (valgfritt)', rows: 2, autoGrow: true, hideDetails: true }),
      ),
    ),
}
