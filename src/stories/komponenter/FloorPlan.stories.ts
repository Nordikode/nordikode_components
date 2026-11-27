import { defineComponent, h, ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import FloorPlan3dView from '../../floor-plan/FloorPlan3dView.vue'
import FloorPlanDrawing from '../../floor-plan/FloorPlanDrawing.vue'
import FloorPlanEditorWorkspace from '../../floor-plan/FloorPlanEditorWorkspace.vue'
import type { FloorPlanDocument, FloorPlanRoom } from '../../floor-plan/model'
import { sketchMarks } from '../../floor-plan/sketchMarks'
import { useFloorPlanEditor } from '../../floor-plan/useFloorPlanEditor'

// Plantegningen (SIGN-794, delt siden SIGN-2041): tegningen, redigeringen og
// 3D-visningen fra `@nordikode/components/floor-plan`. Sign viser og redigerer
// plantegninger med dem, Sketch skisser — samme romdokument, én implementasjon.
// Appen eier dataene (hvor planen kommer fra og hvordan den lagres) og gir
// planen og brukerens språk (`locale`); tekstene ligger i pakka.

const meta: Meta<typeof FloorPlanDrawing> = {
  title: 'Komponenter/FloorPlan',
  component: FloorPlanDrawing,
  argTypes: {
    locale: { control: 'text' },
    compact: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof FloorPlanDrawing>

const HEIGHT = 2.4

const measurements = (floorArea: number, perimeter: number): FloorPlanRoom['measurements'] => ({
  floorArea,
  wallArea: null,
  wallAreaGross: perimeter * HEIGHT,
  ceilingArea: floorArea,
  perimeter,
  ceilingHeight: HEIGHT,
  ceilingHeightMin: null,
  volume: floorArea * HEIGHT,
})

/** Et rektangulært rom med fire vegger i takhøyden, hjørnene med klokka fra øverst til venstre. */
const rectangle = (id: string, name: string, category: string | null, x: number, y: number, width: number, depth: number): FloorPlanRoom => {
  const outline = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + depth },
    { x, y: y + depth },
  ]

  return {
    id,
    name,
    category,
    floorColor: null,
    wallColor: null,
    ceilingColor: null,
    outline,
    walls: outline.map((start, index) => ({
      id: `${id}-wall-${index + 1}`,
      start,
      end: outline[(index + 1) % outline.length],
      height: HEIGHT,
      profile: null,
      color: null,
    })),
    openings: [],
    objects: [],
    measurements: measurements(width * depth, 2 * (width + depth)),
  }
}

// Norske eksempeldata: bad og kjøkken side om side, med gangen under.
const bad: FloorPlanRoom = {
  ...rectangle('bad', 'Bad', 'bathroom', 0, 0, 2.4, 2.6),
  openings: [
    { id: 'bad-dor', kind: 'door', start: { x: 0.8, y: 2.6 }, end: { x: 1.6, y: 2.6 }, height: 2, sill: 0, hinge: 'start', swing: 'left' },
    { id: 'bad-vindu', kind: 'window', start: { x: 0, y: 0.8 }, end: { x: 0, y: 1.6 }, height: 0.6, sill: 1.4, hinge: null, swing: null },
  ],
  objects: [
    { id: 'toalett', category: 'toilet', center: { x: 2, y: 0.5 }, width: 0.4, depth: 0.7, rotation: Math.PI / 2, height: null, variant: null, elevation: null },
    { id: 'vask', category: 'sink', center: { x: 0.9, y: 0.3 }, width: 0.6, depth: 0.45, rotation: 0, height: null, variant: null, elevation: null },
  ],
}

const kjokken: FloorPlanRoom = {
  ...rectangle('kjokken', 'Kjøkken', 'kitchen', 2.4, 0, 3.6, 2.6),
  openings: [
    { id: 'kjokken-dor', kind: 'door', start: { x: 3.4, y: 2.6 }, end: { x: 4.3, y: 2.6 }, height: 2, sill: 0, hinge: 'end', swing: 'left' },
    { id: 'kjokken-vindu', kind: 'window', start: { x: 3.4, y: 0 }, end: { x: 5, y: 0 }, height: 1.2, sill: 0.9, hinge: null, swing: null },
  ],
  objects: [
    { id: 'kjoleskap', category: 'refrigerator', center: { x: 2.8, y: 0.35 }, width: 0.6, depth: 0.6, rotation: 0, height: 1.8, variant: null, elevation: null },
    { id: 'komfyr', category: 'stove', center: { x: 5.65, y: 1.2 }, width: 0.6, depth: 0.6, rotation: Math.PI / 2, height: 0.9, variant: null, elevation: null },
    { id: 'bord', category: 'table', center: { x: 4.2, y: 1.4 }, width: 1.2, depth: 0.8, rotation: 0, height: 0.75, variant: 'rectangular', elevation: null },
  ],
}

const gang: FloorPlanRoom = {
  ...rectangle('gang', 'Gang', null, 0, 2.6, 6, 1.6),
  openings: [{ id: 'inngang', kind: 'door', start: { x: 2.6, y: 4.2 }, end: { x: 3.5, y: 4.2 }, height: 2.1, sill: 0, hinge: 'start', swing: 'left' }],
}

const plan = (): FloorPlanDocument => ({ rooms: [bad, kjokken, gang] })

export const Plantegning: Story = {
  args: { plan: plan(), label: 'Plantegning: 1. etasje', locale: 'no' },
}

// Miniatyren i kort og lister: uten mål og romnavn.
export const Miniatyr: Story = {
  args: { plan: plan(), label: 'Plantegning: 1. etasje', locale: 'no', compact: true, maxHeight: 120 },
}

// Farger er data personen har valgt: gulvet fylles, og veggene tegnes i sin farge.
export const MedFarger: Story = {
  args: {
    plan: { rooms: [{ ...bad, floorColor: '#9fb1c1', wallColor: '#f4f1ea' }, { ...kjokken, floorColor: '#d8b98a' }, gang] },
    label: 'Plantegning: 1. etasje',
    locale: 'no',
  },
}

// Det en skisse har endret, tegnet oppå planen: veggen mellom bad og kjøkken
// er revet (stiplet skygge), kjøkkenvinduet er flyttet, og en søyle er ny.
// Serveren regner ut hva som er endret — tegningen sammenligner aldri selv.
export const EndringerISkisse: Story = {
  render: () => {
    const badEtter: FloorPlanRoom = { ...bad, walls: bad.walls.filter((wall) => wall.id !== 'bad-wall-2') }
    const kjokkenEtter: FloorPlanRoom = {
      ...kjokken,
      walls: kjokken.walls.filter((wall) => wall.id !== 'kjokken-wall-4'),
      openings: kjokken.openings.map((opening) => (opening.id === 'kjokken-vindu' ? { ...opening, start: { x: 3.8, y: 0 }, end: { x: 5.4, y: 0 } } : opening)),
      objects: [
        ...kjokken.objects,
        { id: 'soyle', category: 'column', center: { x: 2.4, y: 1.3 }, width: 0.2, depth: 0.2, rotation: 0, height: HEIGHT, variant: 'square', elevation: null },
      ],
    }
    const rooms = [badEtter, kjokkenEtter, gang]
    const marks = sketchMarks({
      rooms,
      baseRooms: plan().rooms,
      changes: [
        { elementType: 'wall', elementId: 'bad-wall-2', roomId: 'bad', change: 'removed' },
        { elementType: 'wall', elementId: 'kjokken-wall-4', roomId: 'kjokken', change: 'removed' },
        { elementType: 'object', elementId: 'soyle', roomId: 'kjokken', change: 'added' },
        { elementType: 'opening', elementId: 'kjokken-vindu', roomId: 'kjokken', change: 'moved' },
      ],
    })

    return h(FloorPlanDrawing, { plan: { rooms }, label: 'Skisse: åpent kjøkken', locale: 'no', marks })
  },
}

// Redigeringen: verktøylinja, tegningen som arbeidsflate og feltene for det
// som er valgt. Siden eier planen og lagringen; komponenten endrer rommene
// gjennom `editor` og sier fra (`save`, `splitRefused`).
const Redigerer = defineComponent({
  setup() {
    const editor = useFloorPlanEditor()
    const melding = ref('')

    editor.load(plan())

    return () =>
      h('div', { style: { containerType: 'inline-size' } }, [
        h(FloorPlanEditorWorkspace, {
          editor,
          drawingLabel: 'Plantegningen 1. etasje. Velg og dra for å redigere.',
          locale: 'no',
          onSave: () => {
            melding.value = 'Siden lagrer planen.'
          },
          onSplitRefused: (message: string) => {
            melding.value = message
          },
        }),
        h('p', { 'aria-live': 'polite', style: { color: 'var(--nk-text-secondary)', fontSize: 'var(--nk-text-label)' } }, melding.value),
      ])
  },
})

export const Redigering: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => h(Redigerer),
}

// 3D-visningen bygges av planens egne data. three.js hentes først når
// visningen åpnes — den er aldri med i det appen starter med.
export const TreD: Story = {
  render: () => h(FloorPlan3dView, { plan: plan(), label: '3D-visning av 1. etasje, 3 rom', locale: 'no' }),
}
