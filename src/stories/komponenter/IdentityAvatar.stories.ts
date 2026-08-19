import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IdentityAvatar from '../../components/IdentityAvatar.vue'

const meta: Meta<typeof IdentityAvatar> = {
  title: 'Komponenter/IdentityAvatar',
  component: IdentityAvatar,
}

export default meta
type Story = StoryObj<typeof IdentityAvatar>

export const Initial: Story = {
  args: { name: 'Hedvig Moore', size: 40 },
}

export const Stor: Story = {
  args: { name: 'Rune Bakken', size: 64, color: 'secondary' },
}

export const MedBilde: Story = {
  args: {
    name: 'Hedvig Moore',
    size: 48,
    imageUrl: 'https://i.pravatar.cc/96?img=5',
  },
}
