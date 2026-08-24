import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BrandWordmark from '../../web/BrandWordmark.vue'

const meta: Meta<typeof BrandWordmark> = {
  title: 'Komponenter/Web/BrandWordmark',
  component: BrandWordmark,
}

export default meta
type Story = StoryObj<typeof BrandWordmark>

export const Lockup: Story = {
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: '<div style="height: 96px"><BrandWordmark v-bind="args" /></div>',
  }),
  args: { variant: 'lockup' },
}

export const KunMonogram: Story = {
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: '<div style="height: 32px"><BrandWordmark v-bind="args" /></div>',
  }),
  args: { variant: 'mark' },
}
