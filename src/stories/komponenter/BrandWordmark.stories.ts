import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BrandWordmark from '../../web/BrandWordmark.vue'

/**
 * Merkevarelogoen (SIGN-641): Nordikode (periwinkle) og Sign (berry), som hel
 * logo eller kun symbolet. Blekket byttes med `.dark` på rot-elementet, derfor
 * vises lys og mørk side om side her.
 */
const meta: Meta<typeof BrandWordmark> = {
  title: 'Komponenter/Web/BrandWordmark',
  component: BrandWordmark,
  argTypes: {
    brand: { control: 'radio', options: ['nordikode', 'sign'] },
    variant: { control: 'radio', options: ['lockup', 'mark'] },
  },
}

export default meta
type Story = StoryObj<typeof BrandWordmark>

/* Høyden settes på selve komponenten (som i appene), ikke på en wrapper. */
const sideBySide = (height: string) => `
  <div style="display: flex; gap: 24px; align-items: stretch">
    <div style="padding: 24px; background: #ffffff; border-radius: 12px">
      <BrandWordmark v-bind="args" style="height: ${height}" />
    </div>
    <div class="dark" style="padding: 24px; background: #0d1c26; border-radius: 12px">
      <BrandWordmark v-bind="args" style="height: ${height}" />
    </div>
  </div>
`

export const Nordikode: Story = {
  name: 'Nordikode (hel logo)',
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: sideBySide('72px'),
  }),
  args: { brand: 'nordikode', variant: 'lockup' },
}

export const NordikodeSymbol: Story = {
  name: 'Nordikode (kun symbol)',
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: sideBySide('64px'),
  }),
  args: { brand: 'nordikode', variant: 'mark' },
}

export const Sign: Story = {
  name: 'Sign (hel logo)',
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: sideBySide('72px'),
  }),
  args: { brand: 'sign', variant: 'lockup' },
}

export const SignSymbol: Story = {
  name: 'Sign (kun symbol)',
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: sideBySide('64px'),
  }),
  args: { brand: 'sign', variant: 'mark' },
}

export const IHeaderstørrelse: Story = {
  name: 'I headerstørrelse (2.25rem)',
  render: (args) => ({
    components: { BrandWordmark },
    setup: () => ({ args }),
    template: `
      <div style="display: flex; gap: 32px; align-items: center; height: 2.25rem">
        <BrandWordmark brand="nordikode" />
        <BrandWordmark brand="sign" />
      </div>
    `,
  }),
}
