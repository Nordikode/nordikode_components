import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ThemeToggle from '../../web/ThemeToggle.vue'

const webTokens = [
  '--color-surface-alt: #f5f7f9',
  '--color-surface-raised: #ffffff',
  '--color-ink: #1d1d1f',
  '--color-ink-secondary: #52525b',
].join(';')

const meta: Meta<typeof ThemeToggle> = {
  title: 'Komponenter/Web/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    () => ({
      template: `<div style="padding: 1rem; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

/** Bytter `dark`-klassen på dokumentet — selvryddende localStorage-overstyring av OS-valget. */
export const Standard: Story = {
  args: {
    labels: { toLight: 'Bytt til lys modus', toDark: 'Bytt til mørk modus' },
  },
}
