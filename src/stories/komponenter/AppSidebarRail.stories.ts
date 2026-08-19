import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppSidebarRail from '../../components/AppSidebarRail.vue'

const meta: Meta<typeof AppSidebarRail> = {
  title: 'Komponenter/AppSidebarRail',
  component: AppSidebarRail,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof AppSidebarRail>

export const Standard: Story = {
  args: {
    appTitle: 'Sign',
    userName: 'Hedvig Moore',
    userEmail: 'hedvig.moore@nordikode.com',
    accountBaseUrl: 'https://konto.nordikode.dev',
    locale: 'no',
    items: [
      { key: 'dashboard', label: 'Oversikt', icon: 'mdi-view-dashboard-outline', active: true },
      { key: 'cases', label: 'Saker', icon: 'mdi-briefcase-outline' },
      { key: 'customers', label: 'Kunder', icon: 'mdi-account-group-outline' },
      { key: 'products', label: 'Produktregister', icon: 'mdi-package-variant-closed' },
    ],
    footerItems: [{ key: 'settings', label: 'Innstillinger', icon: 'mdi-cog-outline' }],
    tenantItems: [
      { title: 'Bakken Bygg AS', value: 'bakken' },
      { title: 'Moore Montasje', value: 'moore' },
    ],
    tenantModelValue: 'bakken',
  },
}
