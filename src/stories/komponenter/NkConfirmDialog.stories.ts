import { defineComponent, h, ref } from 'vue'
import { VBtn, VTextarea } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkConfirmDialog from '../../components/NkConfirmDialog.vue'

// Felles bekreftelse (SIGN-846): ett spørsmål, en kort forklaring og to
// knapper. Teksten er appens og følger tone-regelen: tittelen er spørsmålet,
// bekreft-knappen sier handlingen («Slett avdelingen», aldri «OK»), feilen
// er «Kunne ikke X.». `confirm` lukker ikke dialogen — eieren utfører
// handlingen med `loading` og lukker selv, eller setter `error`.

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

// Vanlig bekreftelse: handlingen kan gjøres om, så knappen har handlingsfargen.
export const Standard: Story = {
  args: {
    title: 'Arkivere saken «Bad Haugesund»?',
    message: 'Saken flyttes ut av listen. Du finner den igjen under Arkiverte og kan hente den tilbake.',
    confirmLabel: 'Arkiver saken',
  },
  render: (args) => h(confirmStory(args as unknown as Record<string, unknown>)),
}

// Kan ikke angres: `tone="danger"` gir bekreft-knappen feilfargen. Fokus
// starter på Avbryt.
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
