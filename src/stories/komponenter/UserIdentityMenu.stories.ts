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
    accountBaseUrl: 'https://account.nordikode.com',
    locale: 'no',
  },
}

export const Kompakt: Story = {
  args: {
    userName: 'Hedvig Moore',
    accountBaseUrl: 'https://account.nordikode.com',
    locale: 'no',
    compact: true,
  },
}

/** Rail-varianten i produktappene: kompakt utløser, meny mot høyre, med «Avslutt» tilbake til portalen. */
export const Rail: Story = {
  args: {
    userName: 'Hedvig Moore',
    userEmail: 'hedvig.moore@nordikode.com',
    accountBaseUrl: 'https://account.nordikode.com',
    exitUrl: 'https://portal.nordikode.com',
    location: 'end bottom',
    locale: 'no',
    compact: true,
  },
}
