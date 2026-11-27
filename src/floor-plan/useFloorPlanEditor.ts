import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue'
import type { FloorPlanDocument, FloorPlanObjectCategory, FloorPlanOpeningKind, FloorPlanPoint, FloorPlanRoom } from './model'
import { toFloorPlanRoomInput } from './model'
import {
  addObject,
  addOpening,
  deleteObject,
  deleteOpening,
  mergeRooms,
  moveCorner,
  moveObject,
  moveOpening,
  newFloorPlanId,
  openingDistanceAt,
  outlineSpot,
  selectionExists,
  snapCorner,
  splitRoom,
  updateRoom,
  type FloorPlanSelection,
} from './floorPlanEditing'
import { roomMeasurements } from './floorPlanGeometry'
import { canRedo, canUndo, commit, createHistory, isDirty, redo, undo, type EditHistory } from './floorPlanHistory'

/**
 * Redigeringen av én plantegning (SIGN-1980): planen slik den står nå, det
 * som er valgt, og angre/gjør om. Selve endringene er redigeringsreglene i
 * `support/floorPlanEditing` — her holdes de sammen med historikken, så hver
 * endring er ett steg som kan angres.
 *
 * Målene på et rom som er endret regnes på nytt av geometrien med en gang
 * (`roomMeasurements`), bare for visning: serveren regner dem ved lagring, og
 * svaret derfra er fasiten.
 *
 * `P` is the app's own plan type (SIGN-2041): the editor only reads and
 * changes `rooms`, and every other field the app has on its plan (id, name,
 * timestamps) follows along untouched.
 */
export interface FloorPlanEditor<P extends FloorPlanDocument = FloorPlanDocument> {
  /** Planen slik den står nå; null til en plan er lastet. */
  plan: ComputedRef<P | null>
  selection: Ref<FloorPlanSelection | null>
  /** Rommet det valgte hører til. */
  selectedRoom: ComputedRef<FloorPlanRoom | null>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  /** Er planen en annen enn den som sist ble lagret eller lastet? */
  dirty: ComputedRef<boolean>
  /** Starter på nytt fra `plan` (lastet, lagret eller hentet på nytt): historikken tømmes. */
  load: (plan: P) => void
  select: (selection: FloorPlanSelection | null) => void
  /** Én endring av planen. Endringer med samme `coalesceKey` rett etter hverandre blir ett steg. */
  apply: (edit: (plan: P) => P, coalesceKey?: string) => void
  /** Én endring av ett rom. */
  editRoom: (roomId: string, edit: (room: FloorPlanRoom) => FloorPlanRoom, coalesceKey?: string) => void
  undo: () => void
  redo: () => void
  /** Et hjørne, et inventar eller en åpning dras til `to`. */
  drag: (payload: { selection: FloorPlanSelection; to: FloorPlanPoint }) => void
  /** Piltastene: det valgte hjørnet eller inventaret flyttes så mange meter. */
  nudge: (payload: { selection: FloorPlanSelection; dx: number; dy: number }) => void
  /** Fjerner den valgte åpningen eller det valgte inventaret; rommet det sto i blir valgt. */
  remove: (selection: FloorPlanSelection) => void
  /** Ny dør, nytt vindu eller ny åpning midt på veggen; den nye blir valgt. Uten plass på veggen skjer ingenting. */
  addOpening: (roomId: string, wallId: string, kind: FloorPlanOpeningKind) => void
  /** Nytt inventar midt i rommet; det nye blir valgt. */
  addObject: (roomId: string, category: FloorPlanObjectCategory) => void
  /** Delingen som pågår (SIGN-1982): rommet som deles, og stedet skillelinja starter når det er valgt. */
  split: Ref<FloorPlanSplit | null>
  /** Starter delingen av et rom: de to neste stedene som velges, er skillelinjas ender. */
  startSplit: (roomId: string) => void
  cancelSplit: () => void
  /**
   * Et sted for skillelinja er valgt. Det første legges på rommets omriss og
   * huskes (`started`); det andre deler rommet (`split`) — eller ikke, når
   * linja ikke går gjennom rommet (`refused`, og delingen står klar for et
   * nytt forsøk fra samme start). `name` er navnet det nye rommet får.
   */
  pickSplitPoint: (point: FloorPlanPoint, name: string) => 'started' | 'split' | 'refused' | 'idle'
  /** Deler rommet med en skillelinje mellom to steder på omrisset; det nye rommet blir valgt. Usann når rommet ikke kunne deles slik. */
  splitRoom: (roomId: string, from: FloorPlanPoint, to: FloorPlanPoint, name: string) => boolean
  /** Slår rommet sammen med et rom det møter langs en kant; rommet som består blir valgt. Usann når de ikke møtes. */
  mergeRooms: (roomId: string, otherRoomId: string) => boolean
}

export interface FloorPlanSplit {
  roomId: string
  from: FloorPlanPoint | null
}

export interface FloorPlanEditorOptions<P extends FloorPlanDocument> {
  /**
   * What is saved, as a text: two plans with the same text are the same plan,
   * and `dirty` is false. The default is the rooms as they are saved (without
   * measurements). An app that saves more than the rooms — the plan's name —
   * gives its own, so a change of that also counts.
   */
  signature?: (plan: P) => string
}

/** Det som lagres, som tekst: to planer med samme innhold er like, uansett mål og tidsstempler. */
const roomsSignature = (plan: FloorPlanDocument): string => JSON.stringify(plan.rooms.map(toFloorPlanRoomInput))

/** Rommene som er endret får målene regnet på nytt av geometrien, for visning. */
const withPreview = <P extends FloorPlanDocument>(before: P, after: P): P =>
  after === before
    ? after
    : {
        ...after,
        rooms: after.rooms.map((room) => (before.rooms.includes(room) ? room : { ...room, measurements: { ...room.measurements, ...roomMeasurements(room) } })),
      }

/** Nøkkelen som slår sammen endringer av samme håndtak til ett steg. */
const handleKey = (selection: FloorPlanSelection): string => {
  switch (selection.kind) {
    case 'corner':
      return `corner:${selection.roomId}:${selection.index}`
    case 'object':
      return `object:${selection.roomId}:${selection.objectId}`
    case 'opening':
      return `opening:${selection.roomId}:${selection.openingId}`
    case 'wall':
      return `wall:${selection.roomId}:${selection.wallId}`
    case 'room':
      return `room:${selection.roomId}`
  }
}

export const useFloorPlanEditor = <P extends FloorPlanDocument = FloorPlanDocument>(options: FloorPlanEditorOptions<P> = {}): FloorPlanEditor<P> => {
  const signature = options.signature ?? roomsSignature
  const history = shallowRef<EditHistory<P> | null>(null)
  const selection = ref<FloorPlanSelection | null>(null)
  const split = ref<FloorPlanSplit | null>(null)

  const plan = computed(() => history.value?.present ?? null)

  /** Etter angring kan det valgte være borte: da er ingenting valgt. Det samme gjelder rommet som er i ferd med å deles. */
  const keepSelection = (): void => {
    if (plan.value === null || !selectionExists(plan.value, selection.value)) {
      selection.value = null
    }

    if (split.value !== null && !(plan.value?.rooms.some((room) => room.id === split.value?.roomId) ?? false)) {
      split.value = null
    }
  }

  const apply: FloorPlanEditor<P>['apply'] = (edit, coalesceKey) => {
    const current = history.value

    if (current === null) {
      return
    }

    history.value = commit(current, withPreview(current.present, edit(current.present)), coalesceKey ?? null)
    keepSelection()
  }

  const editRoom: FloorPlanEditor<P>['editRoom'] = (roomId, edit, coalesceKey) => apply((current) => updateRoom(current, roomId, edit), coalesceKey)

  const splitSelectedRoom: FloorPlanEditor<P>['splitRoom'] = (roomId, from, to, name) => {
    const before = plan.value
    const newRoomId = newFloorPlanId()

    apply((current) => splitRoom(current, roomId, from, to, { name, roomId: newRoomId }))

    if (plan.value === before || !(plan.value?.rooms.some((room) => room.id === newRoomId) ?? false)) {
      return false
    }

    split.value = null
    selection.value = { kind: 'room', roomId: newRoomId }

    return true
  }

  return {
    plan,
    selection,
    selectedRoom: computed(() => plan.value?.rooms.find((room) => room.id === selection.value?.roomId) ?? null),
    canUndo: computed(() => history.value !== null && canUndo(history.value)),
    canRedo: computed(() => history.value !== null && canRedo(history.value)),
    dirty: computed(() => history.value !== null && isDirty(history.value, signature)),
    load: (source) => {
      history.value = createHistory(source)
      keepSelection()
    },
    select: (next) => {
      selection.value = next
    },
    apply,
    editRoom,
    undo: () => {
      if (history.value !== null) {
        history.value = undo(history.value)
        keepSelection()
      }
    },
    redo: () => {
      if (history.value !== null) {
        history.value = redo(history.value)
        keepSelection()
      }
    },
    drag: ({ selection: target, to }) => {
      if (target.kind === 'corner') {
        // Mens et hjørne dras, legger det seg på nabohjørnets x eller y når det er nær nok.
        editRoom(target.roomId, (room) => moveCorner(room, target.index, snapCorner(room, target.index, to)), handleKey(target))
      } else if (target.kind === 'object') {
        editRoom(target.roomId, (room) => moveObject(room, target.objectId, to), handleKey(target))
      } else if (target.kind === 'opening') {
        editRoom(
          target.roomId,
          (room) => {
            const distance = openingDistanceAt(room, target.openingId, to)

            return distance === null ? room : moveOpening(room, target.openingId, distance)
          },
          handleKey(target),
        )
      }
    },
    nudge: ({ selection: target, dx, dy }) => {
      if (target.kind === 'corner') {
        editRoom(
          target.roomId,
          (room) => {
            const corner = room.outline[target.index]

            return corner === undefined ? room : moveCorner(room, target.index, { x: corner.x + dx, y: corner.y + dy })
          },
          handleKey(target),
        )
      } else if (target.kind === 'object') {
        editRoom(
          target.roomId,
          (room) => {
            const object = room.objects.find((candidate) => candidate.id === target.objectId)

            return object === undefined ? room : moveObject(room, target.objectId, { x: object.center.x + dx, y: object.center.y + dy })
          },
          handleKey(target),
        )
      }
    },
    remove: (target) => {
      if (target.kind === 'opening') {
        editRoom(target.roomId, (room) => deleteOpening(room, target.openingId))
      } else if (target.kind === 'object') {
        editRoom(target.roomId, (room) => deleteObject(room, target.objectId))
      } else {
        return
      }

      selection.value = plan.value?.rooms.some((room) => room.id === target.roomId) ? { kind: 'room', roomId: target.roomId } : null
    },
    addOpening: (roomId, wallId, kind) => {
      const openingId = newFloorPlanId()
      const added: FloorPlanSelection = { kind: 'opening', roomId, openingId }

      editRoom(roomId, (room) => addOpening(room, wallId, kind, openingId))

      if (plan.value !== null && selectionExists(plan.value, added)) {
        selection.value = added
      }
    },
    addObject: (roomId, category) => {
      const objectId = newFloorPlanId()
      const added: FloorPlanSelection = { kind: 'object', roomId, objectId }

      editRoom(roomId, (room) => addObject(room, category, objectId))

      if (plan.value !== null && selectionExists(plan.value, added)) {
        selection.value = added
      }
    },
    split,
    startSplit: (roomId) => {
      if (plan.value?.rooms.some((room) => room.id === roomId)) {
        split.value = { roomId, from: null }
        selection.value = { kind: 'room', roomId }
      }
    },
    cancelSplit: () => {
      split.value = null
    },
    pickSplitPoint: (point, name) => {
      const current = split.value
      const room = current === null ? undefined : plan.value?.rooms.find((candidate) => candidate.id === current.roomId)

      if (current === null || room === undefined) {
        return 'idle'
      }

      const spot = outlineSpot(room, point)

      if (spot === null) {
        return 'refused'
      }

      if (current.from === null) {
        split.value = { roomId: current.roomId, from: { x: spot.point.x, y: spot.point.y } }

        return 'started'
      }

      return splitSelectedRoom(current.roomId, current.from, spot.point, name) ? 'split' : 'refused'
    },
    splitRoom: splitSelectedRoom,
    mergeRooms: (roomId, otherRoomId) => {
      const before = plan.value

      apply((current) => mergeRooms(current, roomId, otherRoomId))

      if (plan.value === before) {
        return false
      }

      split.value = null
      selection.value = { kind: 'room', roomId }

      return true
    },
  }
}
