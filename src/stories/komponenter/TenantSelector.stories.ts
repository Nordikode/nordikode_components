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

/**
 * Footer-slotten (SIGN-94): verts-appens lenker under firmalisten —
 * firmainnstillinger og «Opprett nytt firma». Med footer kan menyen åpnes
 * selv når brukeren bare har ett firma.
 */
export const MedFooterLenker: Story = {
  render: (args) => ({
    components: { TenantSelector },
    setup: () => ({ args }),
    template: `
      <TenantSelector v-bind="args">
        <template #footer>
          <v-list-item prepend-icon="mdi-office-building-cog-outline" title="Firmainnstillinger" />
          <v-list-item prepend-icon="mdi-plus" title="Opprett nytt firma" />
        </template>
      </TenantSelector>
    `,
  }),
  args: {
    items: [{ title: 'Bakken Bygg AS', value: 'bakken' }],
    modelValue: 'bakken',
    locale: 'no',
  },
}
