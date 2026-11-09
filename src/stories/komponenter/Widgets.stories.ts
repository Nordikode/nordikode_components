import { defineComponent, h, reactive } from 'vue'
import { VBtn, VCard, VCardText, VCardTitle } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkWidgetEditBar from '../../widgets/NkWidgetEditBar.vue'
import NkWidgetGrid from '../../widgets/NkWidgetGrid.vue'
import NkWidgetColumn from '../../widgets/NkWidgetColumn.vue'
import type { WidgetDefinition, WidgetLabels, WidgetLayout, WidgetLayoutStorage, WidgetSize } from '../../widgets/types'
import { useWidgetLayout } from '../../widgets/useWidgetLayout'

// Widgetrammeverket (SIGN-1850, delt i SIGN-1873): en flate satt sammen av
// widgeter brukeren selv plasserer, gir størrelse og skjuler. Rutenettet
// (`NkWidgetGrid`) snapper fliser til celler med faste rader på brede
// skjermer og følger listerekkefølgen på smale; kolonnen (`NkWidgetColumn`)
// følger alltid listerekkefølgen. Verten tegner selve widgeten i `#widget`
// og får nøkkel, størrelse og definisjon.
//
// Tekstene (`labels`) kommer fra appens i18n, og lagringen (`storage`) er
// appens: Sign lagrer oppsettet i brukerens UI-preferanser i core. Her er
// begge byttet ut med norske eksempeltekster og en lagring i minnet.

const meta: Meta<typeof NkWidgetGrid> = {
  title: 'Komponenter/Widgets',
  component: NkWidgetGrid,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof NkWidgetGrid>

const labels: WidgetLabels = {
  editTitle: 'Tilpass siden',
  hint: 'Dra widgetene dit du vil ha dem, bytt størrelse eller skjul dem.',
  hidden: 'Skjulte widgeter',
  none: 'Ingen',
  reset: 'Tilbakestill',
  resetTitle: 'Tilbakestille oppsettet?',
  resetBody: 'Alle widgeter går tilbake til standardplass og -størrelse.',
  done: 'Ferdig',
  cancel: 'Avbryt',
  move: (widget) => `Flytt ${widget}`,
  dragToMove: 'Dra for å flytte',
  nextSize: (size) => `Bytt til ${size.toLowerCase()}`,
  hide: (widget) => `Skjul ${widget}`,
  sizes: { small: 'Liten', medium: 'Medium', large: 'Stor' },
}

const definitions: WidgetDefinition[] = [
  { key: 'open-cases', title: 'Åpne saker', icon: 'mdi-folder-open-outline', sizes: ['small', 'medium'] },
  { key: 'offers', title: 'Tilbud som venter', icon: 'mdi-file-document-outline', sizes: ['medium', 'large'] },
  { key: 'team', title: 'Teamet i dag', icon: 'mdi-account-group-outline', sizes: ['medium', 'small'] },
  { key: 'activity', title: 'Siste aktivitet', icon: 'mdi-history', sizes: ['large', 'medium'] },
]

/** Lagring i minnet — i appen er dette brukerens UI-preferanser i core. */
const memoryStorage = (): WidgetLayoutStorage => {
  const values = reactive<Record<string, WidgetLayout>>({})

  return {
    load: async (key) => values[key] ?? null,
    save: async (key, layout) => {
      values[key] = layout
    },
    current: (key) => values[key],
  }
}

const innhold: Record<string, Record<WidgetSize, string>> = {
  'open-cases': { small: '12', medium: '12 åpne saker · 3 trenger tilsyn', large: '12 åpne saker · 3 trenger tilsyn' },
  offers: { small: '4', medium: '4 tilbud venter på svar · 2 forfaller denne uken', large: 'Hansen · Bytte dusj · sendt 3. nov.\nBerg · Nytt kjøkken · sendt 5. nov.\nSolberg · Legge parkett · sendt 7. nov.' },
  team: { small: '5 på jobb', medium: 'Kari, Ola, Per, Anne og Lars er på jobb i dag', large: 'Kari, Ola, Per, Anne og Lars er på jobb i dag' },
  activity: { small: '3 nye', medium: 'Tilbud sendt til Hansen · Berg godtok tilbudet · Ny sak fra Solberg', large: 'Tilbud sendt til Hansen (09:12)\nBerg godtok tilbudet (10:40)\nNy sak fra Solberg (11:05)\nUE-forespørsel besvart av Rør AS (12:30)' },
}

const widget = (definition: WidgetDefinition, size: WidgetSize) =>
  h(VCard, { variant: 'outlined', style: { height: '100%' } }, () => [
    h(VCardTitle, { style: { fontSize: size === 'small' ? '0.85rem' : '1rem' } }, () => (typeof definition.title === 'function' ? definition.title() : definition.title)),
    h(VCardText, { style: { whiteSpace: 'pre-line', fontSize: size === 'small' ? '1.6rem' : '0.95rem', fontWeight: size === 'small' ? 700 : 400 } }, () => innhold[definition.key][size]),
  ])

const Demo = defineComponent({
  props: { medKolonne: { type: Boolean, default: false } },
  setup(props) {
    const controller = useWidgetLayout({
      preferenceKey: props.medKolonne ? 'storybook.widgets.with-column' : 'storybook.widgets',
      definitions: props.medKolonne
        ? definitions.map((definition, i) => ({ ...definition, zone: i >= 2 ? 'side' : 'main' }))
        : definitions,
      zones: props.medKolonne ? [{ key: 'main', kind: 'grid' }, { key: 'side', kind: 'column' }] : undefined,
      storage: memoryStorage(),
      labels,
    })

    const slots = {
      widget: ({ definition, size }: { widgetKey: string; size: WidgetSize; definition: WidgetDefinition }) => widget(definition, size),
    }

    return () =>
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--nk-gap-section)', minHeight: '100vh', padding: '24px' } }, [
        controller.editing.value
          ? h(NkWidgetEditBar, { controller })
          : h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, [
              h(VBtn, { prependIcon: 'mdi-pencil-outline', variant: 'text', onClick: () => controller.startEditing() }, () => 'Tilpass siden'),
            ]),
        props.medKolonne
          ? h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--nk-gap-section)' } }, [
              h(NkWidgetGrid, { controller }, slots),
              h(NkWidgetColumn, { controller }, { ...slots, empty: () => 'Dra en widget hit' }),
            ])
          : h(NkWidgetGrid, { controller }, slots),
      ])
  },
})

// Fire widgeter i ett rutenett med faste rader. «Tilpass siden» åpner
// redigeringslinjen: dra flisene, bytt størrelse, skjul og hent fram igjen.
export const Rutenett: Story = {
  render: () => h(Demo),
}

// Rutenett og kolonne på samme flate (som saksoversikten i Sign): widgeter
// kan dras mellom sonene, og en tom kolonne er en slippsone.
export const RutenettOgKolonne: Story = {
  render: () => h(Demo, { medKolonne: true }),
}
