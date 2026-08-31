import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppTopHeader from '../../components/AppTopHeader.vue'

const meta: Meta<typeof AppTopHeader> = {
  title: 'Komponenter/AppTopHeader',
  component: AppTopHeader,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof AppTopHeader>

export const Standard: Story = {
  args: {
    appTitle: 'Nordikode Sign',
    userName: 'Hedvig Moore',
    userEmail: 'hedvig.moore@nordikode.com',
    accountBaseUrl: 'https://konto.nordikode.dev',
    locale: 'no',
    tenantItems: [
      { title: 'Bakken Bygg AS', value: 'bakken' },
      { title: 'Moore Montasje', value: 'moore' },
    ],
    tenantModelValue: 'bakken',
  },
}

export const MedNavigasjonsknapp: Story = {
  args: {
    ...Standard.args,
    showNavigationToggle: true,
  },
}

/**
 * Den stille varianten (SIGN-94, designfasit «Hero-lab og Sign-skall»):
 * 64px flat flate uten gradient/dekor, firma-chip og ren avatar-utløser.
 * Verts-appen legger app-brikken i `brand-icon` og produktvelgeren i
 * `actions`.
 */
export const Stille: Story = {
  render: (args) => ({
    components: { AppTopHeader },
    setup: () => ({ args }),
    template: `
      <AppTopHeader v-bind="args">
        <template #brand-icon>
          <span
            aria-hidden="true"
            style="align-items:center;background:var(--nk-info-soft);border-radius:var(--nk-radius-sm);color:var(--nk-on-info-soft);display:inline-flex;height:34px;justify-content:center;width:34px;font-weight:700;"
          >S</span>
        </template>
      </AppTopHeader>
    `,
  }),
  args: {
    ...Standard.args,
    appTitle: 'Sign',
    variant: 'quiet',
  },
}
