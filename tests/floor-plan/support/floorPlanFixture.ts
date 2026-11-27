import type { FloorPlanDocument, FloorPlanRoom } from '../../../src/floor-plan/model'

/**
 * En plantegning slik befaringsverktøyet i appen lagrer den (SIGN-794): tre
 * rom i samme koordinatsystem (meter, x mot høyre, y nedover). Bad og kjøkken
 * ligger side om side, med gangen under — de deler vegger, og det er en dør
 * fra gangen inn til hvert av rommene.
 *
 *   (0,0)        (2,4)              (6,0)
 *     ┌───────────┬──────────────────┐
 *     │    Bad    │     Kjøkken      │
 *     ├───────────┴──────────────────┤ y = 2,6
 *     │             Gang             │
 *     └──────────────────────────────┘ y = 4,2
 *
 * `FixturePlan` is a plan as an app carries it: the rooms, and the app's own
 * fields around them (here the ones Sign's floor plans have). Everything in
 * the package reads and changes `rooms` only, and gives the same type back.
 */
export type FixturePlan = FloorPlanDocument & {
  id: string
  caseId: string
  clientReference: string
  name: string
  source: string
  capturedAt: string | null
  hasModel: boolean
  modelUrl: string | null
  createdByUserId: string | null
  createdAt: string | null
  updatedAt: string | null
}
export const bathroom = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id: 'room-bad',
  name: 'Bad',
  category: 'bathroom',
  floorColor: null,
  wallColor: null,
  ceilingColor: null,
  outline: [
    { x: 0, y: 0 },
    { x: 2.4, y: 0 },
    { x: 2.4, y: 2.6 },
    { x: 0, y: 2.6 },
  ],
  walls: [
    { id: 'bad-n', start: { x: 0, y: 0 }, end: { x: 2.4, y: 0 }, height: 2.4, profile: null, color: null },
    // Delt med kjøkkenet.
    { id: 'bad-e', start: { x: 2.4, y: 0 }, end: { x: 2.4, y: 2.6 }, height: 2.4, profile: null, color: null },
    // Delt med gangen.
    { id: 'bad-s', start: { x: 2.4, y: 2.6 }, end: { x: 0, y: 2.6 }, height: 2.4, profile: null, color: null },
    { id: 'bad-w', start: { x: 0, y: 2.6 }, end: { x: 0, y: 0 }, height: 2.4, profile: null, color: null },
  ],
  openings: [
    { id: 'bad-door', kind: 'door', start: { x: 0.8, y: 2.6 }, end: { x: 1.6, y: 2.6 }, height: 2, sill: 0, hinge: null, swing: null },
    { id: 'bad-window', kind: 'window', start: { x: 0, y: 0.8 }, end: { x: 0, y: 1.6 }, height: 0.6, sill: 1.4, hinge: null, swing: null },
  ],
  objects: [
    { id: 'object-toilet', category: 'toilet', center: { x: 2, y: 0.5 }, width: 0.4, depth: 0.6, rotation: Math.PI / 2, height: null },
    { id: 'object-sink', category: 'sink', center: { x: 0.9, y: 0.3 }, width: 0.6, depth: 0.45, rotation: 0, height: null },
  ],
  measurements: {
    floorArea: 6.24,
    wallArea: 22.1,
    wallAreaGross: 24,
    ceilingArea: 6.24,
    perimeter: 10,
    ceilingHeight: 2.4,
    ceilingHeightMin: null,
    volume: 14.98,
  },
  ...overrides,
})

export const kitchen = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id: 'room-kjokken',
  name: 'Kjøkken',
  category: 'kitchen',
  floorColor: null,
  wallColor: null,
  ceilingColor: null,
  outline: [
    { x: 2.4, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 2.6 },
    { x: 2.4, y: 2.6 },
  ],
  walls: [
    { id: 'kjokken-n', start: { x: 2.4, y: 0 }, end: { x: 6, y: 0 }, height: 2.4, profile: null, color: null },
    { id: 'kjokken-e', start: { x: 6, y: 0 }, end: { x: 6, y: 2.6 }, height: 2.4, profile: null, color: null },
    // Delt med gangen.
    { id: 'kjokken-s', start: { x: 6, y: 2.6 }, end: { x: 2.4, y: 2.6 }, height: 2.4, profile: null, color: null },
    // Delt med badet.
    { id: 'kjokken-w', start: { x: 2.4, y: 2.6 }, end: { x: 2.4, y: 0 }, height: 2.4, profile: null, color: null },
  ],
  openings: [
    { id: 'kjokken-door', kind: 'door', start: { x: 3.4, y: 2.6 }, end: { x: 4.3, y: 2.6 }, height: 2, sill: 0, hinge: null, swing: null },
    { id: 'kjokken-window', kind: 'window', start: { x: 3.4, y: 0 }, end: { x: 5, y: 0 }, height: 1.2, sill: 0.9, hinge: null, swing: null },
  ],
  objects: [
    { id: 'object-refrigerator', category: 'refrigerator', center: { x: 2.8, y: 0.35 }, width: 0.6, depth: 0.6, rotation: 0, height: null },
    { id: 'object-stove', category: 'stove', center: { x: 5.65, y: 1.2 }, width: 0.6, depth: 0.6, rotation: 0, height: null },
  ],
  measurements: {
    floorArea: 9.36,
    wallArea: 26.04,
    wallAreaGross: 29.76,
    ceilingArea: 9.36,
    perimeter: 12.4,
    ceilingHeight: 2.4,
    ceilingHeightMin: null,
    volume: 22.46,
  },
  ...overrides,
})

export const hall = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
  id: 'room-gang',
  name: 'Gang',
  category: null,
  floorColor: null,
  wallColor: null,
  ceilingColor: null,
  outline: [
    { x: 0, y: 2.6 },
    { x: 6, y: 2.6 },
    { x: 6, y: 4.2 },
    { x: 0, y: 4.2 },
  ],
  walls: [
    // Delt med badet og kjøkkenet.
    { id: 'gang-n', start: { x: 0, y: 2.6 }, end: { x: 6, y: 2.6 }, height: 2.4, profile: null, color: null },
    { id: 'gang-e', start: { x: 6, y: 2.6 }, end: { x: 6, y: 4.2 }, height: 2.4, profile: null, color: null },
    { id: 'gang-s', start: { x: 6, y: 4.2 }, end: { x: 0, y: 4.2 }, height: 2.4, profile: null, color: null },
    { id: 'gang-w', start: { x: 0, y: 4.2 }, end: { x: 0, y: 2.6 }, height: 2.4, profile: null, color: null },
  ],
  openings: [
    // Inngangsdøra i ytterveggen, og en åpen passasje i østveggen.
    { id: 'gang-door', kind: 'door', start: { x: 2.6, y: 4.2 }, end: { x: 3.5, y: 4.2 }, height: 2.1, sill: 0, hinge: null, swing: null },
    { id: 'gang-passage', kind: 'opening', start: { x: 6, y: 3 }, end: { x: 6, y: 3.9 }, height: 2.1, sill: 0, hinge: null, swing: null },
  ],
  objects: [{ id: 'object-storage', category: 'storage', center: { x: 0.8, y: 3.95 }, width: 1.2, depth: 0.4, rotation: 0, height: null }],
  measurements: {
    floorArea: 9.6,
    wallArea: 32.7,
    wallAreaGross: 36.48,
    ceilingArea: 9.6,
    perimeter: 15.2,
    ceilingHeight: 2.4,
    ceilingHeightMin: null,
    volume: 23.04,
  },
  ...overrides,
})

export const floorPlan = (overrides: Partial<FixturePlan> = {}): FixturePlan => ({
  id: 'plan-1',
  caseId: 'case-1',
  clientReference: 'client-ref-1',
  name: '1. etasje',
  source: 'lidar',
  capturedAt: '2026-11-24T09:12:00Z',
  rooms: [bathroom(), kitchen(), hall()],
  hasModel: true,
  modelUrl: 'https://storage.nordikode.test/tenants/t1/cases/case-1/floor-plans/plan-1.usdz?signature=abc',
  createdByUserId: 'user-1',
  createdAt: '2026-11-24T09:12:30Z',
  updatedAt: '2026-11-24T09:12:30Z',
  ...overrides,
})

/** Et rom lagt inn for hånd: bare gulvet og høyden er kjent, og ingen åpninger. */
export const manualPlan = (overrides: Partial<FixturePlan> = {}): FixturePlan =>
  floorPlan({
    id: 'plan-2',
    clientReference: 'client-ref-2',
    name: 'Bod',
    source: 'manual',
    capturedAt: null,
    hasModel: false,
    modelUrl: null,
    rooms: [
      {
        id: 'room-bod',
        name: 'Bod',
        category: null,
        floorColor: null,
        wallColor: null,
        ceilingColor: null,
        outline: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 1.5 },
          { x: 0, y: 1.5 },
        ],
        walls: [
          { id: 'bod-n', start: { x: 0, y: 0 }, end: { x: 2, y: 0 }, height: null, profile: null, color: null },
          { id: 'bod-e', start: { x: 2, y: 0 }, end: { x: 2, y: 1.5 }, height: null, profile: null, color: null },
          { id: 'bod-s', start: { x: 2, y: 1.5 }, end: { x: 0, y: 1.5 }, height: null, profile: null, color: null },
          { id: 'bod-w', start: { x: 0, y: 1.5 }, end: { x: 0, y: 0 }, height: null, profile: null, color: null },
        ],
        openings: [],
        objects: [],
        measurements: {
          floorArea: 3,
          wallArea: null,
          wallAreaGross: null,
          ceilingArea: null,
          perimeter: 7,
          ceilingHeight: null,
          ceilingHeightMin: null,
          volume: null,
        },
      },
    ],
    ...overrides,
  })
