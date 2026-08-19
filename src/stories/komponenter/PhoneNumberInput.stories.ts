import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PhoneNumberInput from '../../components/PhoneNumberInput.vue'

const meta: Meta<typeof PhoneNumberInput> = {
  title: 'Komponenter/PhoneNumberInput',
  component: PhoneNumberInput,
}

export default meta
type Story = StoryObj<typeof PhoneNumberInput>

export const Norsk: Story = {
  args: {
    modelValue: '',
    defaultCountryCode: 'NO',
    locale: 'no',
  },
}

export const Utfylt: Story = {
  args: {
    modelValue: '+4791234567',
    locale: 'no',
  },
}

export const Påkrevd: Story = {
  args: {
    modelValue: '',
    defaultCountryCode: 'NO',
    locale: 'no',
    required: true,
  },
}
