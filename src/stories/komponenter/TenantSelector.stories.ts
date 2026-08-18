import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TenantSelector from '../../components/TenantSelector.vue'

const tenants = [
  { title: 'Bakken Bygg AS', value: 'bakken' },
  { title: 'Moore Montasje', value: 'moore' },
  { title: 'Personlig konto', value: 'personal' },
]

const meta: Meta<typeof TenantSelector> = {
  title: 'Komponenter/TenantSelector',
  component: TenantSelector,
}

export default meta
type Story = StoryObj<typeof TenantSelector>

export const Standard: Story = {
  args: {
    items: tenants,
    modelValue: 'bakken',
    personalValue: 'personal',
    locale: 'no',
  },
}

export const Kompakt: Story = {
  args: {
    items: tenants,
    modelValue: 'moore',
    personalValue: 'personal',
    locale: 'no',
    compact: true,
  },
}
