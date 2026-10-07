import { defineComponent, h, ref } from 'vue'
import { VBtn, VCard, VCardActions, VCardText, VCardTitle, VSpacer, VTextField } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkDialog from '../../components/NkDialog.vue'

// Felles dialog-wrapper (SIGN-846): `v-dialog` med tilgjengelig navn.
// Innholdet er appens eget — wrapperen har ingen flate og ingen stil — men
// dialogen kobles til tittelen (`aria-labelledby`), til ingressen
// (`aria-describedby`), og fokus går tilbake til knappen som åpnet den.
// Åpne «Accessibility»-treet i nettleseren og se navnet på dialogen, eller
// slå på VoiceOver: den leser tittelen og «dialog».

const meta: Meta<typeof NkDialog> = {
  title: 'Komponenter/NkDialog',
  component: NkDialog,
}

export default meta
type Story = StoryObj<typeof NkDialog>

/** Åpneknapp + dialogen. Lukk med Esc: fokus står på åpneknappen igjen. */
const dialogStory = (attrs: Record<string, unknown>, body: (close: () => void) => unknown, openLabel = 'Åpne dialogen') =>
  defineComponent({
    setup() {
      const open = ref(false)
      return () =>
        h('div', [
          h(VBtn, { onClick: () => (open.value = true) }, () => openLabel),
          h(
            NkDialog,
            { maxWidth: 480, ...attrs, modelValue: open.value, 'onUpdate:modelValue': (value: boolean) => (open.value = value) },
            { default: ({ close }: { close: () => void }) => body(close) },
          ),
        ])
    },
  })

// Vanligst: dialogen har en overskrift (`v-card-title` eller `h1`–`h6`).
// Da trengs ingenting — den første overskriften blir navnet.
export const TittelFraOverskrift: Story = {
  render: () =>
    h(
      dialogStory({}, (close) =>
        h(VCard, () => [
          h(VCardTitle, () => 'Gi saken nytt navn'),
          h(VCardText, () => h(VTextField, { label: 'Navn', modelValue: 'Bad Haugesund', autofocus: true })),
          h(VCardActions, () => [
            h(VSpacer),
            h(VBtn, { variant: 'text', onClick: close }, () => 'Avbryt'),
            h(VBtn, { color: 'primary', onClick: close }, () => 'Lagre'),
          ]),
        ]),
      ),
    ),
}

// Tittelen er ikke en overskrift (eller det finnes flere): merk den med
// `data-nk-dialog-title`. Ingressen merkes `data-nk-dialog-description`.
export const MerketTittelOgIngress: Story = {
  render: () =>
    h(
      dialogStory({}, (close) =>
        h(VCard, { class: 'pa-6' }, () => [
          h('div', { class: 'text-overline' }, 'Trinn 2 av 3'),
          h('div', { class: 'text-h6', 'data-nk-dialog-title': '' }, 'Send tilbudet til Kari Nordmann'),
          h(
            'p',
            { class: 'text-body-2 text-medium-emphasis mt-2', 'data-nk-dialog-description': '' },
            'Kunden får en lenke på e-post og kan svare uten å logge inn.',
          ),
          h('div', { class: 'd-flex justify-end ga-2 mt-6' }, [
            h(VBtn, { variant: 'text', onClick: close }, () => 'Avbryt'),
            h(VBtn, { color: 'primary', onClick: close }, () => 'Send tilbudet'),
          ]),
        ]),
      ),
    ),
}

// Ingen synlig tittel (bildevisning, datovelger): dialogen får navnet sitt
// med `aria-label`, og lukkeknappen har eget navn.
export const UtenSynligTittel: Story = {
  render: () =>
    h(
      dialogStory(
        { 'aria-label': 'Bilde 2 av 5: Bad før riving', maxWidth: 720 },
        (close) =>
          h(VCard, { class: 'pa-4' }, () => [
            h('div', { class: 'd-flex justify-end' }, [h(VBtn, { variant: 'text', onClick: close }, () => 'Lukk')]),
            h('div', {
              role: 'img',
              'aria-label': 'Bad før riving',
              style: 'aspect-ratio:16/9;background:var(--nk-muted-soft);border-radius:var(--nk-radius-md);',
            }),
          ]),
        'Vis bildet',
      ),
    ),
}
