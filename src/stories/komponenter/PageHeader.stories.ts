import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PageHeader from '../../web/PageHeader.vue'

const webTokens = [
  '--color-surface: #ffffff',
  '--color-ink: #1d1d1f',
  '--color-ink-secondary: #52525b',
  '--color-ink-tertiary: #6e6e73',
  '--color-line: #e8e8ed',
  '--radius-compact: 8px',
].join(';')

// PageHeader har både en prop og en slot som heter `back`. Storybook slår
// props og slots sammen til én args-type, og da kan `back` ikke settes.
// Args er derfor komponentens props alene (SIGN-1195).
type PageHeaderArgs = InstanceType<typeof PageHeader>['$props']

const meta: Meta<PageHeaderArgs> = {
  title: 'Komponenter/Web/PageHeader',
  component: PageHeader,
  decorators: [
    () => ({
      template: `<div style="max-width: 46rem; padding: 2rem 1.25rem; ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<PageHeaderArgs>

/** Nivå 1-side: tittel + undertittel, ingen tilbakelenke. */
export const Standard: Story = {
  args: {
    title: 'Firmainnstillinger',
    subtitle: 'Bygg og Anlegg AS',
  },
}

/** Detaljside: hierarkisk tilbakelenke (ett nivå opp) + statuschip + handling. */
export const Detaljside: Story = {
  args: {
    title: 'Hedvig Hansen',
    subtitle: 'Tømrer · hedvig@example.com',
    back: { href: '/personer', label: 'Til personer' },
  },
  render: (args) => ({
    components: { PageHeader },
    setup: () => ({ args }),
    template: `
      <PageHeader v-bind="args">
        <template #badge>
          <span style="border: 1px solid #b7e3c8; border-radius: 999px; padding: 2px 10px; font-size: 12px; color: #1c7c43;">Har tilgang</span>
        </template>
        <template #actions>
          <button type="button" style="border: 1px solid var(--color-line); background: none; border-radius: 999px; padding: 6px 16px; font-size: 14px; cursor: pointer;">Rediger</button>
        </template>
      </PageHeader>
    `,
  }),
}
