import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import NkTemplateField from '../../components/NkTemplateField.vue'

const placeholders = [
  { key: 'company', label: 'Firmanavn' },
  { key: 'link', label: 'Lenke til skjemaet', missingMessage: 'SMS-en må ha lenken til skjemaet. Trykk «Lenke til skjemaet» for å sette den inn.' },
]

const labels = { field: 'SMS med kundelenken', insert: 'Sett inn i teksten' }

const meta: Meta<typeof NkTemplateField> = {
  title: 'Komponenter/NkTemplateField',
  component: NkTemplateField,
  render: (args) => ({
    components: { NkTemplateField },
    setup() {
      const text = ref(args.modelValue)
      return { args, text }
    },
    template: '<div style="max-width: 520px"><NkTemplateField v-bind="args" v-model="text" /><pre style="margin-top: 16px">{{ text }}</pre></div>',
  }),
}

export default meta
type Story = StoryObj<typeof NkTemplateField>

export const Utfylt: Story = {
  args: {
    modelValue: 'Beskriv prosjektet ditt her, så tar {company} kontakt: {link}',
    placeholders,
    labels,
    hint: 'Trykk på en knapp for å sette inn firmanavnet eller lenken der markøren står.',
    maxLength: 640,
  },
}

export const Tom: Story = {
  args: {
    modelValue: '',
    placeholders,
    labels,
    emptyText: 'Beskriv prosjektet ditt her, så tar {company} kontakt: {link}',
    maxLength: 640,
  },
}

export const ManglerLenke: Story = {
  args: {
    modelValue: 'Hei! Beskriv prosjektet ditt, så tar {company} kontakt.',
    placeholders,
    labels,
    maxLength: 640,
  },
}
