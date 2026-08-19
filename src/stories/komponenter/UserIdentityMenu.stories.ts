import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UserIdentityMenu from '../../components/UserIdentityMenu.vue'

const meta: Meta<typeof UserIdentityMenu> = {
  title: 'Komponenter/UserIdentityMenu',
  component: UserIdentityMenu,
}

export default meta
type Story = StoryObj<typeof UserIdentityMenu>

export const Standard: Story = {
  args: {
    userName: 'Hedvig Moore',
    userEmail: 'hedvig.moore@nordikode.com',
    accountBaseUrl: 'https://konto.nordikode.dev',
    locale: 'no',
  },
}

export const Kompakt: Story = {
  args: {
    userName: 'Hedvig Moore',
    accountBaseUrl: 'https://konto.nordikode.dev',
    locale: 'no',
    compact: true,
  },
}
