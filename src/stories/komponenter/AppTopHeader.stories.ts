import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppTopHeader from '../../components/AppTopHeader.vue'

const meta: Meta<typeof AppTopHeader> = {
  title: 'Komponenter/AppTopHeader',
  component: AppTopHeader,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof AppTopHeader>

export const Standard: Story = {
  args: {
    appTitle: 'Nordikode Sign',
    userName: 'Hedvig Moore',
    userEmail: 'hedvig.moore@nordikode.com',
    accountBaseUrl: 'https://konto.nordikode.dev',
    locale: 'no',
    tenantItems: [
      { title: 'Bakken Bygg AS', value: 'bakken' },
      { title: 'Moore Montasje', value: 'moore' },
    ],
    tenantModelValue: 'bakken',
  },
}

export const MedNavigasjonsknapp: Story = {
  args: {
    ...Standard.args,
    showNavigationToggle: true,
  },
}
