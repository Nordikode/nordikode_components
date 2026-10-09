import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EmailVerificationBanner from '../../web/EmailVerificationBanner.vue'

// Båndet «Bekreft e-posten din» (SIGN-1676). Fargene er varselrollen fra
// designsystemet; verts-appene setter `--nk-warning`/`--nk-on-warning`.
const webTokens = [
  '--color-surface: #ffffff',
  '--color-ink: #1d1d1f',
  '--radius-compact: 8px',
  '--nk-warning: #b26d00',
  '--nk-on-warning: #ffffff',
].join(';')

const meta: Meta<typeof EmailVerificationBanner> = {
  title: 'Komponenter/Web/EmailVerificationBanner',
  component: EmailVerificationBanner,
  decorators: [
    () => ({
      template: `<div style="${webTokens}"><story /></div>`,
    }),
  ],
  args: {
    pending: { email: 'kari@torsvikbygg.no', deadlineAt: '2026-10-11 14:30:00' },
    locale: 'no',
  },
}

export default meta
type Story = StoryObj<typeof EmailVerificationBanner>

export const Standard: Story = {}

export const Nedtelling: Story = {
  args: { resendSecondsLeft: 27 },
}

export const Sender: Story = {
  args: { busy: true },
}

export const Engelsk: Story = {
  args: { locale: 'en' },
}
