import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkSignedOutDialog from '../../web/NkSignedOutDialog.vue'

const webTokens = [
  '--color-surface: #ffffff',
  '--color-surface-alt: #f5f7f9',
  '--color-surface-raised: #ffffff',
  '--color-ink: #1d1d1f',
  '--color-ink-secondary: #52525b',
  '--color-ink-tertiary: #71717a',
  '--color-line: #e4e4e7',
  '--radius-standard: 1rem',
  '--radius-compact: 0.5rem',
  '--nk-chrome-accent: #0f766e',
  '--nk-chrome-accent-ink: #ffffff',
].join(';')

const labels = {
  title: 'Du er logget ut',
  revoked: 'Sesjonen din ble avsluttet i en annen fane eller på en annen enhet. Det du holdt på med her, er ikke borte.',
  expired: 'Sesjonen din utløp. Det du holdt på med her, er ikke borte.',
  signInAgain: 'Logg inn igjen',
  waiting: 'Venter på innlogging…',
}

const meta: Meta<typeof NkSignedOutDialog> = {
  title: 'Komponenter/Web/NkSignedOutDialog',
  component: NkSignedOutDialog,
  decorators: [
    () => ({
      template: `<div style="min-height: 24rem; padding: 1rem; ${webTokens}">
        <p>Skjermbildet bak overlegget: ulagret skjematilstand beholdes.</p>
        <story />
      </div>`,
    }),
  ],
  args: { open: true, labels },
}

export default meta
type Story = StoryObj<typeof NkSignedOutDialog>

/** Logget ut i en annen fane/enhet (realtime-hendelsen `account.session.revoked`). */
export const LoggetUtAnnetSted: Story = {
  args: { reason: 'revoked' },
}

/** Sesjonen utløp (401 ved neste kall eller ved fokus). */
export const Utlopt: Story = {
  args: { reason: 'expired' },
}

/** Innloggingsvinduet er åpent — knappen er deaktivert til sesjonen er tilbake. */
export const VenterPaaInnlogging: Story = {
  args: { reason: 'revoked', waiting: true },
}
