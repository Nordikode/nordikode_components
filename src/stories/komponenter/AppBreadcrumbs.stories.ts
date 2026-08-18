import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppBreadcrumbs from '../../components/AppBreadcrumbs.vue'

const meta: Meta<typeof AppBreadcrumbs> = {
  title: 'Komponenter/AppBreadcrumbs',
  component: AppBreadcrumbs,
}

export default meta
type Story = StoryObj<typeof AppBreadcrumbs>

export const Standard: Story = {
  args: {
    crumbs: [
      { label: 'Saker', to: '#' },
      { label: 'Bad 2. etasje', to: '#' },
      { label: 'Tilbud' },
    ],
  },
}

export const MedTilbakeknapp: Story = {
  args: {
    showBackButton: true,
    backLabel: 'Tilbake',
    crumbs: [{ label: 'Saker', to: '#' }, { label: 'Bad 2. etasje' }],
  },
}
