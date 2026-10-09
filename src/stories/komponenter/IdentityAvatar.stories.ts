import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IdentityAvatar from '../../components/IdentityAvatar.vue'

const meta: Meta<typeof IdentityAvatar> = {
  title: 'Komponenter/IdentityAvatar',
  component: IdentityAvatar,
  parameters: {
    docs: {
      description: {
        component:
          'Uten bilde viser avataren reserve-initialer etter plattformens ene regel (SIGN-1668): første bokstav i hvert av de to første ordene, samme som konto- og firmamenyen.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof IdentityAvatar>

/** To ord gir to bokstaver — «Kari Lund» → «KL». */
export const Initialer: Story = {
  args: { name: 'Kari Lund', size: 40 },
}

/** Ett ord gir én bokstav — «Kari» → «K». */
export const EttOrd: Story = {
  args: { name: 'Kari', size: 40 },
}

/** Tomt navn gir reserven «?» i stedet for en tom brikke. */
export const TomtNavn: Story = {
  args: { name: '', size: 40 },
}

export const Stor: Story = {
  args: { name: 'Rune Bakken', size: 64, color: 'secondary' },
}

export const MedBilde: Story = {
  args: {
    name: 'Kari Lund',
    size: 48,
    imageUrl: 'https://i.pravatar.cc/96?img=5',
  },
}
