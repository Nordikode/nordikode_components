import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ProductSymbol from '../../web/ProductSymbol.vue'

/**
 * Produktsymbolet (SIGN-614). Tar-delen følger `currentColor`, merkefargen er
 * fast (Sign: light berry) — derfor vises lys og mørk side om side her.
 */
const meta: Meta<typeof ProductSymbol> = {
  title: 'Komponenter/Web/ProductSymbol',
  component: ProductSymbol,
  args: { product: 'sign' },
}

export default meta
type Story = StoryObj<typeof ProductSymbol>

export const Sign: Story = {
  render: (args) => ({
    components: { ProductSymbol },
    setup: () => ({ args }),
    template: `
      <div style="display: flex; gap: 24px; align-items: stretch">
        <div style="padding: 24px; background: #ffffff; color: #1d1d1f; border-radius: 12px">
          <ProductSymbol v-bind="args" style="height: 64px" />
        </div>
        <div style="padding: 24px; background: #0e1216; color: #e6e9ee; border-radius: 12px">
          <ProductSymbol v-bind="args" style="height: 64px" />
        </div>
      </div>
    `,
  }),
}

export const IHeaderstørrelse: Story = {
  name: 'I headerstørrelse (1.25rem ved siden av navnet)',
  render: (args) => ({
    components: { ProductSymbol },
    setup: () => ({ args }),
    template: `
      <span style="display: inline-flex; align-items: center; gap: 0.375rem; font: 600 0.9375rem Inter, sans-serif; color: #1d1d1f">
        Nordikode
        <span style="display: inline-flex; align-items: center; gap: 0.375rem; font-weight: 400; color: #6e6e73">
          <ProductSymbol v-bind="args" style="height: 1.25rem; color: #1d1d1f" />Sign
        </span>
      </span>
    `,
  }),
}
