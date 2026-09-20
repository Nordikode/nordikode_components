import { onBeforeUnmount, onMounted } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkSignedOutDialog from '../../web/NkSignedOutDialog.vue'

// Web-kontrakten mappet fra produkt-tokenene slik Sign gjør det i style.css
// (SIGN-442/679/904) — ingen hexverdier, og Modus-velgeren flipper begge temaer.
// Merk: `-ink` er aksenten selv (tekst på lys tint), teksten på fylt aksent er
// `--nk-chrome-on-accent`. Å sette `-ink` på knappen ga berry på berry (SIGN-904).
const webTokens: Record<string, string> = {
  '--color-surface': 'var(--nk-surface)',
  '--color-surface-alt': 'var(--nk-surface-soft)',
  '--color-surface-raised': 'var(--nk-surface)',
  '--color-ink': 'var(--nk-text-primary)',
  '--color-ink-secondary': 'var(--nk-text-secondary)',
  '--color-ink-tertiary': 'var(--nk-text-secondary)',
  '--color-line': 'var(--nk-surface-border)',
  '--radius-standard': 'var(--nk-radius-lg)',
  '--radius-compact': 'var(--nk-radius-sm)',
  '--nk-chrome-accent': 'var(--nk-link)',
  '--nk-chrome-accent-ink': 'var(--nk-link)',
  '--nk-chrome-on-accent': 'var(--nk-on-action-primary)',
}

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
      // Overlegget teleporteres til <body>, så kontrakten må stå på :root
      // — slik verts-appene setter den — ikke på en wrapper rundt historien.
      setup() {
        const root = document.documentElement.style
        onMounted(() => {
          for (const [name, value] of Object.entries(webTokens)) root.setProperty(name, value)
        })
        onBeforeUnmount(() => {
          for (const name of Object.keys(webTokens)) root.removeProperty(name)
        })
      },
      template: `<div style="min-height: 24rem; padding: 1rem;">
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
