import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PhoneNumberField from '../../web/PhoneNumberField.vue'

const webTokens = [
  '--color-surface-alt: #f5f7f9',
  '--color-surface-raised: #ffffff',
  '--color-ink: #1d1d1f',
  '--color-ink-secondary: #52525b',
  '--color-line: rgba(13, 28, 38, 0.12)',
  '--color-action: #35569f',
  '--color-error: #b4392b',
  '--radius-compact: 8px',
  '--radius-standard: 14px',
].join(';')

const labels = { country: 'Landkode', search: 'Søk etter land', noResults: 'Ingen treff.' }

const meta: Meta<typeof PhoneNumberField> = {
  title: 'Komponenter/Web/PhoneNumberField',
  component: PhoneNumberField,
  decorators: [
    () => ({
      template: `<div style="padding: 1rem; max-width: 22rem; min-height: 24rem; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof PhoneNumberField>

/** Landet kommer fra verts-appen — her firmaets valgte land. */
export const MedLand: Story = {
  args: { modelValue: '', defaultCountryCode: 'SE', locale: 'sv', labels },
}

/** Uten land står velgeren tom: brukeren velger land eller skriver +landkode. */
export const UtenLand: Story = {
  args: { modelValue: '', defaultCountryCode: null, locale: 'no', labels },
}

export const Utfylt: Story = {
  args: { modelValue: '+33612345678', locale: 'fr', labels },
}

export const Ugyldig: Story = {
  args: { modelValue: '123', defaultCountryCode: 'PL', locale: 'pl', labels, invalid: true },
}
