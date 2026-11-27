<script setup lang="ts" generic="P extends FloorPlanDocument">
import { computed, nextTick, ref, watch } from 'vue'
import FloorPlanColorField from './FloorPlanColorField.vue'
import MeasurementField from './MeasurementField.vue'
import type { FloorPlanEditor } from './useFloorPlanEditor'
import {
  FLOOR_PLAN_OBJECT_CATEGORIES,
  FLOOR_PLAN_OPENING_KINDS,
  FLOOR_PLAN_ROOM_CATEGORIES,
  toFloorPlanObjectCategory,
  toFloorPlanOpeningKind,
  toFloorPlanRoomCategory,
  type FloorPlanDocument,
  type FloorPlanOpeningKind,
} from './model'
import {
  OPENING_MIN_WALL,
  ROOM_NAME_MAX_LENGTH,
  WALL_PROFILE_MAX_POINTS,
  addWallProfilePoint,
  deleteRoom,
  doorHingeSide,
  doorOpensInward,
  faceObject,
  hasFurniture,
  mergeableRoomIds,
  moveOpening,
  moveWallProfilePoint,
  openingSeat,
  removeAllObjects,
  removeWallProfilePoint,
  renameRoom,
  resizeObject,
  resizeOpening,
  setCeilingHeight,
  setDoorHingeSide,
  setDoorOpensInward,
  setObjectCategory,
  setObjectElevation,
  setObjectHeight,
  setObjectVariant,
  setOpeningHeight,
  setOpeningKind,
  setOpeningSill,
  setRoomCategory,
  setRoomCeilingColor,
  setRoomFloorColor,
  setRoomWallColor,
  setWallColor,
  setWallHeight,
  setWallLength,
  setWallProfile,
  setWallProfileHeight,
  turnObject,
  wallProfile,
  type FloorPlanSelection,
} from './floorPlanEditing'
import { isSlopedRoom } from './floorPlanCeiling'
import { objectVariantsFor, toFloorPlanObjectVariant } from './floorPlanFurniture'
import { distance, midpoint, roomMeasurements } from './floorPlanGeometry'
import { formatLength } from './measurements'
import { floorPlanEditorTexts, newFloorPlanRoomName } from './floorPlanEditorTexts'
import { floorPlanNames } from './floorPlanNames'
import { fillFloorPlanText } from './textFiles'

/**
 * Feltene for det som er valgt i redigeringen av en plantegning (SIGN-1980):
 * rom, vegg, åpning eller inventar. Alt som kan dras i tegningen kan også
 * skrives her, så ingenting KREVER å dra. Hver endring går gjennom
 * redigeringsreglene og er ett angresteg.
 *
 * Øverst står en liste over alt i planen, så det også kan velges uten å
 * treffe det i tegningen — med tastatur eller skjermleser.
 *
 * SIGN-1982: en vegg kan ha skrå overkant (høyde ved A og B, og knekkpunkter
 * imellom), en dør sier hvilken side hengslene er på og hvilken vei den
 * slår, og et rom kan deles i to eller slås sammen med et naborom. Delingen
 * gjøres ved å velge to steder på omrisset — i tegningen, eller her, fra
 * lista over hjørner og vegger, så den heller ikke krever en peker.
 */
const props = defineProps<{
  editor: FloorPlanEditor<P>
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the texts, and how the measurements are written and read. */
  locale: string
}>()

const emit = defineEmits<{
  /** Rommet kunne ikke deles med den linja som ble valgt. */
  splitRefused: []
}>()

const text = computed(() => floorPlanEditorTexts(props.locale))
const names = computed(() => floorPlanNames(props.locale))

const plan = computed(() => props.editor.plan.value)
const selection = computed(() => props.editor.selection.value)
const room = computed(() => props.editor.selectedRoom.value)

const length = (meters: number): string => formatLength(meters, props.locale)

const openingKindName = (kind: string): string => {
  const known = toFloorPlanOpeningKind(kind)

  // En type appen ikke kjenner har ikke noe navn her: den vises som «åpning».
  return names.value.openingKinds[known ?? 'opening']
}

const objectName = (category: string): string => {
  const known = toFloorPlanObjectCategory(category)

  return known === null ? names.value.furniture : names.value.objects[known]
}

/* ---------- lista over alt i planen ---------- */

const keyOf = (target: FloorPlanSelection): string => {
  switch (target.kind) {
    case 'room':
      return `room|${target.roomId}`
    case 'wall':
      return `wall|${target.roomId}|${target.wallId}`
    case 'corner':
      return `corner|${target.roomId}|${target.index}`
    case 'opening':
      return `opening|${target.roomId}|${target.openingId}`
    case 'object':
      return `object|${target.roomId}|${target.objectId}`
  }
}

const parts = computed(() =>
  (plan.value?.rooms ?? []).flatMap((entry) => {
    const item = (target: FloorPlanSelection, title: string) => ({ value: keyOf(target), title, target })

    return [
      item({ kind: 'room', roomId: entry.id }, entry.name),
      ...entry.walls.map((wall, index) =>
        item(
          { kind: 'wall', roomId: entry.id, wallId: wall.id },
          fillFloorPlanText(text.value.inspector.wallItem, { room: entry.name, number: index + 1, length: length(distance(wall.start, wall.end)) }),
        ),
      ),
      ...entry.openings.map((opening) =>
        item(
          { kind: 'opening', roomId: entry.id, openingId: opening.id },
          fillFloorPlanText(text.value.inspector.partItem, { room: entry.name, part: openingKindName(opening.kind) }),
        ),
      ),
      ...entry.objects.map((object) =>
        item(
          { kind: 'object', roomId: entry.id, objectId: object.id },
          fillFloorPlanText(text.value.inspector.partItem, { room: entry.name, part: objectName(object.category) }),
        ),
      ),
      ...entry.outline.map((_, index) =>
        item({ kind: 'corner', roomId: entry.id, index }, fillFloorPlanText(text.value.inspector.cornerItem, { room: entry.name, number: index + 1 })),
      ),
    ]
  }),
)

const selectedKey = computed(() => (selection.value === null ? null : keyOf(selection.value)))

const pick = (key: string | null): void => {
  props.editor.select(parts.value.find((part) => part.value === key)?.target ?? null)
}

/* ---------- rom ---------- */

const NO_KIND = ''

const roomKinds = computed(() => [
  { value: NO_KIND, title: text.value.inspector.noKind },
  ...FLOOR_PLAN_ROOM_CATEGORIES.map((category) => ({ value: category, title: names.value.roomKinds[category] })),
])

const nameDraft = ref('')

watch(
  () => [room.value?.id, room.value?.name] as const,
  () => {
    nameDraft.value = room.value?.name ?? ''
  },
  { immediate: true },
)

const commitName = (): void => {
  const target = room.value

  if (target === null) {
    return
  }

  props.editor.editRoom(target.id, (current) => renameRoom(current, nameDraft.value))
  // Det som gjelder står i feltet etterpå: navnet uten mellomrom i endene,
  // eller det gamle når det nye ikke kunne brukes (tomt, for langt).
  void nextTick(() => {
    nameDraft.value = props.editor.selectedRoom.value?.name ?? ''
  })
}

const measurements = computed(() => (room.value === null ? null : roomMeasurements(room.value)))
const ceilingHeight = computed(() => measurements.value?.ceilingHeight ?? null)
const isLastRoom = computed(() => (plan.value?.rooms.length ?? 0) <= 1)

const editRoom = props.editor.editRoom

/** Under skråtak: fra det laveste til det høyeste punktet på veggene. */
const ceilingRange = computed(() => {
  const low = measurements.value?.ceilingHeightMin ?? null
  const high = measurements.value?.ceilingHeight ?? null

  return room.value === null || !isSlopedRoom(room.value) || low === null || high === null ? null : `${length(low)}–${length(high)}`
})

/* ---------- dele rommet, og slå det sammen med et annet ---------- */

const split = computed(() => props.editor.split.value)
const splitting = computed(() => split.value !== null && split.value.roomId === room.value?.id)

const newRoomName = (): string => newFloorPlanRoomName(plan.value, props.locale)

/** Stedene en skillelinje kan gå mellom uten å peke i tegningen: hvert hjørne, og midten av hver kant. */
const splitSpots = computed(() => {
  const outline = room.value?.outline ?? []

  return outline.flatMap((corner, index) => {
    const next = outline[(index + 1) % outline.length]

    return [
      { value: `corner:${index}`, title: fillFloorPlanText(text.value.split.cornerSpot, { number: index + 1 }), point: corner },
      {
        value: `edge:${index}`,
        title: fillFloorPlanText(text.value.split.edgeSpot, { from: index + 1, to: ((index + 1) % outline.length) + 1, length: length(distance(corner, next)) }),
        point: midpoint(corner, next),
      },
    ]
  })
})

const splitFrom = ref<string | null>(null)
const splitTo = ref<string | null>(null)

watch(splitting, () => {
  splitFrom.value = null
  splitTo.value = null
})

const splitFromList = (): void => {
  const target = room.value
  const from = splitSpots.value.find((spot) => spot.value === splitFrom.value)
  const to = splitSpots.value.find((spot) => spot.value === splitTo.value)

  if (target === null || from === undefined || to === undefined) {
    return
  }

  if (!props.editor.splitRoom(target.id, from.point, to.point, newRoomName())) {
    emit('splitRefused')
  }
}

const neighbours = computed(() => {
  const current = plan.value
  const target = room.value

  if (current === null || target === null) {
    return []
  }

  const ids = mergeableRoomIds(current, target.id)

  return current.rooms.filter((candidate) => ids.includes(candidate.id)).map((candidate) => ({ id: candidate.id, name: candidate.name }))
})


/* ---------- vegg ---------- */

const wall = computed(() => {
  const target = selection.value

  return target?.kind === 'wall' ? (room.value?.walls.find((candidate) => candidate.id === target.wallId) ?? null) : null
})

const wallLength = computed(() => (wall.value === null ? null : distance(wall.value.start, wall.value.end)))
const wallTakesOpening = computed(() => (wallLength.value ?? 0) >= OPENING_MIN_WALL)

// Skrå overkant: bryteren viser feltene for høyden i hver ende. Den står på
// når veggen ER skrå; slått på for en vannrett vegg viser den bare feltene —
// veggen blir skrå i det endene får ulik høyde.
const slopedOpen = ref(false)

watch(
  () => wall.value?.id,
  () => {
    slopedOpen.value = false
  },
)

const wallIsSloped = computed(() => (wall.value?.profile ?? null) !== null)
const slopedTop = computed(() => slopedOpen.value || wallIsSloped.value)

/** Overkanten som punkter: A er veggens start, B er slutten, og knekkpunktene ligger imellom. */
const topEdge = computed(() => (wall.value === null ? null : wallProfile(wall.value)))
const bends = computed(() => (topEdge.value ?? []).slice(1, -1).map((point, index) => ({ ...point, index: index + 1 })))
const canAddBend = computed(() => wallIsSloped.value && (topEdge.value?.length ?? 0) < WALL_PROFILE_MAX_POINTS)

const toggleSloped = (on: boolean | null): void => {
  slopedOpen.value = on === true

  // Av: veggen blir et rektangel i høyden den har (det høyeste punktet).
  if (on !== true && room.value !== null && wall.value !== null) {
    const wallId = wall.value.id

    editRoom(room.value.id, (current) => setWallProfile(current, wallId, null))
  }
}

/** Høyden i punkt `index` på overkanten. En vegg uten høyde får først én høyde. */
const setTopHeight = (index: number, height: number | null): void => {
  const target = room.value
  const current = wall.value

  if (target === null || current === null || height === null) {
    return
  }

  editRoom(target.id, (edited) => (wallProfile(current) === null ? setWallHeight(edited, current.id, height) : setWallProfileHeight(edited, current.id, index, height)))
}

const addOpening = (kind: FloorPlanOpeningKind): void => {
  if (room.value !== null && wall.value !== null) {
    props.editor.addOpening(room.value.id, wall.value.id, kind)
  }
}

/* ---------- åpning ---------- */

const opening = computed(() => {
  const target = selection.value

  return target?.kind === 'opening' ? (room.value?.openings.find((candidate) => candidate.id === target.openingId) ?? null) : null
})

const seat = computed(() => (room.value === null || opening.value === null ? null : openingSeat(room.value, opening.value)))

const openingKinds = computed(() => FLOOR_PLAN_OPENING_KINDS.map((kind) => ({ value: kind, title: names.value.openingKinds[kind] })))

// Døra, slik et menneske sier det: stående i rommet med ansiktet mot den.
const isDoor = computed(() => toFloorPlanOpeningKind(opening.value?.kind) === 'door')
const hingeSide = computed(() => (room.value === null || opening.value === null ? null : doorHingeSide(room.value, opening.value)))
const opensInward = computed(() => (room.value === null || opening.value === null ? null : doorOpensInward(room.value, opening.value)))

/* ---------- inventar ---------- */

const object = computed(() => {
  const target = selection.value

  return target?.kind === 'object' ? (room.value?.objects.find((candidate) => candidate.id === target.objectId) ?? null) : null
})

const objectKinds = computed(() =>
  FLOOR_PLAN_OBJECT_CATEGORIES.map((category) => ({ value: category, title: names.value.objects[category] })).sort((left, right) =>
    left.title.localeCompare(right.title, props.locale),
  ),
)

/** Utformingene den valgte typen kan ha (SIGN-1987), med «Ikke angitt» først; tom for en type uten utforminger. */
const objectVariants = computed(() => {
  const category = object.value?.category ?? null
  const variants = objectVariantsFor(category)

  return variants.length === 0
    ? []
    : [
        { value: NO_KIND, title: text.value.inspector.noVariant },
        ...variants.map((variant) => ({ value: variant, title: names.value.objectVariants[category ?? '']?.[variant] ?? variant })),
      ]
})

const heading = computed(() => {
  const target = selection.value

  if (target === null || room.value === null) {
    return text.value.inspector.nothing
  }

  switch (target.kind) {
    case 'room':
      return room.value.name
    case 'wall':
      return text.value.inspector.wall
    case 'corner':
      return text.value.inspector.corner
    case 'opening':
      return opening.value === null ? '' : openingKindName(opening.value.kind)
    case 'object':
      return object.value === null ? '' : objectName(object.value.category)
  }
})
</script>

<template>
  <aside :aria-label="text.inspector.title" class="inspector" data-testid="floor-plan-inspector">
    <v-select
      clearable
      data-testid="inspector-pick"
      density="compact"
      hide-details
      :items="parts"
      :label="text.inspector.pick"
      :model-value="selectedKey"
      @update:model-value="pick"
    />

    <h2 class="inspector-heading" data-testid="inspector-heading">{{ heading }}</h2>

    <p v-if="selection === null || room === null" class="inspector-hint">{{ text.inspector.nothingBody }}</p>

    <!-- Rom: navn, type, takhøyde, farger, og det som fjerner. -->
    <div v-else-if="selection.kind === 'room'" class="inspector-fields" data-inspector="room">
      <v-text-field
        v-model="nameDraft"
        data-testid="room-name"
        density="compact"
        hide-details
        :label="text.inspector.name"
        :maxlength="ROOM_NAME_MAX_LENGTH"
        @blur="commitName"
        @keydown.enter.prevent="commitName"
      />
      <v-select
        data-testid="room-kind"
        density="compact"
        hide-details
        :items="roomKinds"
        :label="text.inspector.kind"
        :model-value="toFloorPlanRoomCategory(room.category) ?? NO_KIND"
        @update:model-value="editRoom(room.id, (current) => setRoomCategory(current, $event === NO_KIND ? null : $event))"
      />
      <MeasurementField
        data-testid="room-ceiling-height"
        :label="text.inspector.ceilingHeight"
        :locale="locale"
        :model-value="ceilingHeight"
        @update:model-value="$event !== null && editRoom(room.id, (current) => setCeilingHeight(current, $event))"
      />
      <!-- Under skråtak: takhøyden er et spenn, og én takhøyde ville gjort taket flatt. -->
      <p v-if="ceilingRange" class="inspector-hint" data-testid="room-sloped-hint">
        {{ fillFloorPlanText(text.inspector.slopedCeiling, { range: ceilingRange }) }}
      </p>
      <!-- Dele rommet: to steder på omrisset, valgt i tegningen eller her. -->
      <div v-if="splitting" class="inspector-group inspector-split" data-testid="room-split-panel">
        <span class="inspector-group-label">{{ text.split.action }}</span>
        <p aria-live="polite" class="inspector-hint" data-testid="room-split-step">
          {{ split?.from ? text.split.second : text.split.first }}
        </p>
        <v-select
          v-model="splitFrom"
          data-testid="room-split-from"
          density="compact"
          hide-details
          :items="splitSpots"
          :label="text.split.from"
        />
        <v-select
          v-model="splitTo"
          data-testid="room-split-to"
          density="compact"
          hide-details
          :items="splitSpots"
          :label="text.split.to"
        />
        <div class="inspector-actions">
          <v-btn color="primary" data-testid="room-split-confirm" :disabled="!splitFrom || !splitTo" size="small" variant="tonal" @click="splitFromList">
            {{ text.split.confirm }}
          </v-btn>
          <v-btn data-testid="room-split-cancel" size="small" variant="text" @click="editor.cancelSplit()">{{ text.cancel }}</v-btn>
        </div>
      </div>

      <div v-else class="inspector-actions">
        <v-btn data-testid="room-split" prepend-icon="mdi-vector-line" size="small" variant="tonal" @click="editor.startSplit(room.id)">
          {{ text.split.action }}
        </v-btn>
        <v-menu v-if="neighbours.length > 0">
          <template #activator="{ props: activator }">
            <v-btn v-bind="activator" append-icon="mdi-menu-down" data-testid="room-merge" prepend-icon="mdi-vector-union" size="small" variant="tonal">
              {{ text.merge.action }}
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="neighbour in neighbours"
              :key="neighbour.id"
              :data-testid="`room-merge-${neighbour.id}`"
              :title="neighbour.name"
              @click="editor.mergeRooms(room.id, neighbour.id)"
            />
          </v-list>
        </v-menu>
      </div>

      <FloorPlanColorField
        data-testid="room-floor-color"
        :label="text.inspector.floorColor"
        :locale="locale"
        :model-value="room.floorColor ?? null"
        @change="(color, continuous) => editRoom(room!.id, (current) => setRoomFloorColor(current, color), continuous ? `floor-color:${room!.id}` : undefined)"
      />
      <FloorPlanColorField
        data-testid="room-wall-color"
        :label="text.inspector.wallColor"
        :locale="locale"
        :model-value="room.wallColor ?? null"
        @change="(color, continuous) => editRoom(room!.id, (current) => setRoomWallColor(current, color), continuous ? `wall-color:${room!.id}` : undefined)"
      />
      <!-- Taket tegnes ikke i planen: fargen vises i 3D-visningen (SIGN-1981). -->
      <FloorPlanColorField
        data-testid="room-ceiling-color"
        :label="text.inspector.ceilingColor"
        :locale="locale"
        :model-value="room.ceilingColor ?? null"
        @change="(color, continuous) => editRoom(room!.id, (current) => setRoomCeilingColor(current, color), continuous ? `ceiling-color:${room!.id}` : undefined)"
      />

      <div class="inspector-actions">
        <v-btn
          data-testid="room-remove-furniture"
          :disabled="!hasFurniture(room)"
          prepend-icon="mdi-package-variant-remove"
          size="small"
          variant="tonal"
          @click="editRoom(room.id, removeAllObjects)"
        >
          {{ text.removeRoomFurniture }}
        </v-btn>
        <v-btn
          data-testid="room-delete"
          :disabled="isLastRoom"
          prepend-icon="mdi-trash-can-outline"
          size="small"
          variant="tonal"
          @click="editor.apply((current) => deleteRoom(current, room!.id))"
        >
          {{ text.deleteRoom }}
        </v-btn>
      </div>
      <p v-if="isLastRoom" class="inspector-hint">{{ text.lastRoom }}</p>
    </div>

    <!-- Vegg: lengde, høyde, egen farge, og ny dør, nytt vindu eller ny åpning. -->
    <div v-else-if="selection.kind === 'wall' && wall" class="inspector-fields" data-inspector="wall">
      <MeasurementField
        data-testid="wall-length"
        :label="text.inspector.length"
        :locale="locale"
        :model-value="wallLength"
        @update:model-value="$event !== null && editRoom(room.id, (current) => setWallLength(current, wall!.id, $event))"
      />
      <v-switch
        color="primary"
        data-testid="wall-sloped"
        density="compact"
        hide-details
        :label="text.inspector.slopedTop"
        :model-value="slopedTop"
        @update:model-value="toggleSloped"
      />
      <MeasurementField
        v-if="!slopedTop"
        data-testid="wall-height"
        :label="text.inspector.height"
        :locale="locale"
        :model-value="wall.height ?? null"
        nullable
        @update:model-value="editRoom(room.id, (current) => setWallHeight(current, wall!.id, $event))"
      />
      <!-- Skrå overkant: høyden ved A (veggens start) og B (slutten), og knekkpunktene imellom. A og B står på veggen i tegningen. -->
      <div v-else class="inspector-group" data-testid="wall-top-edge">
        <p class="inspector-hint">{{ text.inspector.slopedHint }}</p>
        <MeasurementField
          data-testid="wall-height-a"
          :label="fillFloorPlanText(text.inspector.heightAt, { end: 'A' })"
          :locale="locale"
          :model-value="topEdge?.[0]?.height ?? null"
          @update:model-value="setTopHeight(0, $event)"
        />
        <div v-for="bend in bends" :key="bend.index" class="inspector-bend" :data-testid="`wall-bend-${bend.index}`">
          <span class="inspector-group-label">{{ fillFloorPlanText(text.inspector.bend, { number: bend.index }) }}</span>
          <div class="inspector-bend-fields">
            <MeasurementField
              :data-testid="`wall-bend-${bend.index}-at`"
              :label="text.inspector.distanceFromA"
              :locale="locale"
              :model-value="wallLength === null ? null : bend.at * wallLength"
              @update:model-value="$event !== null && wallLength && editRoom(room.id, (current) => moveWallProfilePoint(current, wall!.id, bend.index, $event / wallLength!))"
            />
            <MeasurementField
              :data-testid="`wall-bend-${bend.index}-height`"
              :label="text.inspector.height"
              :locale="locale"
              :model-value="bend.height"
              @update:model-value="setTopHeight(bend.index, $event)"
            />
            <v-btn
              :aria-label="fillFloorPlanText(text.inspector.removeBend, { number: bend.index })"
              :data-testid="`wall-bend-${bend.index}-remove`"
              icon="mdi-close"
              size="small"
              variant="text"
              @click="editRoom(room.id, (current) => removeWallProfilePoint(current, wall!.id, bend.index))"
            />
          </div>
        </div>
        <MeasurementField
          data-testid="wall-height-b"
          :label="fillFloorPlanText(text.inspector.heightAt, { end: 'B' })"
          :locale="locale"
          :model-value="topEdge?.[topEdge.length - 1]?.height ?? null"
          @update:model-value="setTopHeight((topEdge?.length ?? 2) - 1, $event)"
        />
        <div class="inspector-actions">
          <v-btn
            data-testid="wall-add-bend"
            :disabled="!canAddBend"
            prepend-icon="mdi-plus"
            size="small"
            variant="tonal"
            @click="editRoom(room.id, (current) => addWallProfilePoint(current, wall!.id))"
          >
            {{ text.inspector.addBend }}
          </v-btn>
        </div>
      </div>
      <FloorPlanColorField
        data-testid="wall-color"
        :label="text.inspector.wallOwnColor"
        :locale="locale"
        :model-value="wall.color ?? null"
        @change="(color, continuous) => editRoom(room!.id, (current) => setWallColor(current, wall!.id, color), continuous ? `wall-own-color:${wall!.id}` : undefined)"
      />

      <div class="inspector-group">
        <span class="inspector-group-label">{{ text.add }}</span>
        <div class="inspector-actions">
          <v-btn
            v-for="kind in FLOOR_PLAN_OPENING_KINDS"
            :key="kind"
            :data-testid="`wall-add-${kind}`"
            :disabled="!wallTakesOpening"
            prepend-icon="mdi-plus"
            size="small"
            variant="tonal"
            @click="addOpening(kind)"
          >
            {{ names.openingKinds[kind] }}
          </v-btn>
        </div>
        <p v-if="!wallTakesOpening" class="inspector-hint">{{ text.inspector.wallTooShort }}</p>
      </div>
    </div>

    <!-- Åpning: type, bredde, høyde, brystning og avstanden fra veggens start. -->
    <div v-else-if="selection.kind === 'opening' && opening" class="inspector-fields" data-inspector="opening">
      <v-select
        data-testid="opening-kind"
        density="compact"
        hide-details
        :items="openingKinds"
        :label="text.inspector.kind"
        :model-value="toFloorPlanOpeningKind(opening.kind)"
        @update:model-value="editRoom(room.id, (current) => setOpeningKind(current, opening!.id, $event))"
      />
      <MeasurementField
        data-testid="opening-width"
        :disabled="seat === null"
        :label="text.inspector.width"
        :locale="locale"
        :model-value="seat?.width ?? distance(opening.start, opening.end)"
        @update:model-value="$event !== null && editRoom(room.id, (current) => resizeOpening(current, opening!.id, $event))"
      />
      <MeasurementField
        data-testid="opening-height"
        :label="text.inspector.height"
        :locale="locale"
        :model-value="opening.height ?? null"
        nullable
        @update:model-value="editRoom(room.id, (current) => setOpeningHeight(current, opening!.id, $event))"
      />
      <MeasurementField
        data-testid="opening-sill"
        :label="text.inspector.sill"
        :locale="locale"
        :model-value="opening.sill ?? null"
        nullable
        @update:model-value="editRoom(room.id, (current) => setOpeningSill(current, opening!.id, $event))"
      />
      <!-- Dør: hvilken side hengslene er på, og hvilken vei den slår — sett fra rommet. -->
      <template v-if="isDoor && hingeSide !== null && opensInward !== null">
        <div class="inspector-group">
          <span class="inspector-group-label">{{ text.door.hinges }}</span>
          <v-btn-toggle
            :aria-label="text.door.hinges"
            color="primary"
            data-testid="door-hinges"
            density="compact"
            mandatory
            :model-value="hingeSide"
            variant="outlined"
            @update:model-value="editRoom(room.id, (current) => setDoorHingeSide(current, opening!.id, $event))"
          >
            <v-btn data-testid="door-hinges-left" size="small" value="left">{{ text.door.left }}</v-btn>
            <v-btn data-testid="door-hinges-right" size="small" value="right">{{ text.door.right }}</v-btn>
          </v-btn-toggle>
        </div>
        <div class="inspector-group">
          <span class="inspector-group-label">{{ text.door.opens }}</span>
          <v-btn-toggle
            :aria-label="text.door.opens"
            color="primary"
            data-testid="door-opens"
            density="compact"
            mandatory
            :model-value="opensInward ? 'inward' : 'outward'"
            variant="outlined"
            @update:model-value="editRoom(room.id, (current) => setDoorOpensInward(current, opening!.id, $event === 'inward'))"
          >
            <v-btn data-testid="door-opens-inward" size="small" value="inward">{{ text.door.inward }}</v-btn>
            <v-btn data-testid="door-opens-outward" size="small" value="outward">{{ text.door.outward }}</v-btn>
          </v-btn-toggle>
          <p class="inspector-hint">{{ fillFloorPlanText(text.door.seenFrom, { room: room.name }) }}</p>
        </div>
      </template>
      <MeasurementField
        v-if="seat"
        data-testid="opening-distance"
        :label="text.inspector.distance"
        :locale="locale"
        :model-value="seat.distance"
        @update:model-value="$event !== null && editRoom(room.id, (current) => moveOpening(current, opening!.id, $event))"
      />

      <div class="inspector-actions">
        <v-btn data-testid="opening-delete" prepend-icon="mdi-trash-can-outline" size="small" variant="tonal" @click="editor.remove(selection)">
          {{ text.delete }}
        </v-btn>
      </div>
    </div>

    <!-- Inventar: type og utforming, bredde, dybde, høyde, «Snu 90°», «Bytt forside» og slett. -->
    <div v-else-if="selection.kind === 'object' && object" class="inspector-fields" data-inspector="object">
      <v-select
        data-testid="object-kind"
        density="compact"
        hide-details
        :items="objectKinds"
        :label="text.inspector.kind"
        :model-value="toFloorPlanObjectCategory(object.category)"
        @update:model-value="editRoom(room.id, (current) => setObjectCategory(current, object!.id, $event))"
      />
      <!-- Utformingen (SIGN-1987) er et eget valg — et rundt bord, en lenestol — og vises bare for typene som har noen. -->
      <v-select
        v-if="objectVariants.length > 0"
        data-testid="object-variant"
        density="compact"
        hide-details
        :items="objectVariants"
        :label="text.inspector.variant"
        :model-value="toFloorPlanObjectVariant(object.category, object.variant) ?? NO_KIND"
        @update:model-value="editRoom(room.id, (current) => setObjectVariant(current, object!.id, $event === NO_KIND ? null : $event))"
      />
      <MeasurementField
        data-testid="object-width"
        :label="text.inspector.width"
        :locale="locale"
        :model-value="object.width"
        @update:model-value="$event !== null && editRoom(room.id, (current) => resizeObject(current, object!.id, { width: $event }))"
      />
      <MeasurementField
        data-testid="object-depth"
        :label="text.inspector.depth"
        :locale="locale"
        :model-value="object.depth"
        @update:model-value="$event !== null && editRoom(room.id, (current) => resizeObject(current, object!.id, { depth: $event }))"
      />
      <!-- Høyden kan stå tom: 3D-visningen bruker da typens vanlige høyde (SIGN-1981). -->
      <MeasurementField
        data-testid="object-height"
        :label="text.inspector.height"
        :locale="locale"
        :model-value="object.height ?? null"
        nullable
        @update:model-value="editRoom(room.id, (current) => setObjectHeight(current, object!.id, $event))"
      />
      <!-- Tomt = står på gulvet. En servant eller en TV på veggen henger så høyt over det (SIGN-1987). -->
      <MeasurementField
        data-testid="object-elevation"
        :label="text.inspector.elevation"
        :locale="locale"
        :model-value="object.elevation ?? null"
        nullable
        @update:model-value="editRoom(room.id, (current) => setObjectElevation(current, object!.id, $event))"
      />

      <div class="inspector-actions">
        <v-btn data-testid="object-turn" prepend-icon="mdi-rotate-right" size="small" variant="tonal" @click="editRoom(room.id, (current) => turnObject(current, object!.id))">
          {{ text.inspector.turn }}
        </v-btn>
        <!-- Samme flate, men baksiden (sisternen, hodeenden) mot neste side: skannet vet ikke alltid hvilken side som er forsiden. -->
        <v-btn
          data-testid="object-face"
          prepend-icon="mdi-swap-horizontal"
          size="small"
          :title="text.inspector.faceHint"
          variant="tonal"
          @click="editRoom(room.id, (current) => faceObject(current, object!.id))"
        >
          {{ text.inspector.face }}
        </v-btn>
        <v-btn data-testid="object-delete" prepend-icon="mdi-trash-can-outline" size="small" variant="tonal" @click="editor.remove(selection)">
          {{ text.delete }}
        </v-btn>
      </div>
    </div>

    <!-- Hjørne: dras i tegningen eller flyttes med piltastene; veggens lengde skrives på veggen. -->
    <p v-else-if="selection.kind === 'corner'" class="inspector-hint" data-inspector="corner">
      {{ text.inspector.cornerHint }}
    </p>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 1.5);
  min-width: 0;
}

.inspector-heading {
  color: var(--nk-text-title);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: var(--nk-space-unit) 0 0;
  overflow-wrap: anywhere;
}

.inspector-hint {
  color: var(--nk-text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.inspector-fields {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 1.75);
}

.inspector-group {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.75);
}

.inspector-group-label {
  color: var(--nk-text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
}

.inspector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
}

.inspector-bend {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.75);
}

/* Avstanden og høyden side om side, og krysset som fjerner punktet bak dem. */
.inspector-bend-fields {
  align-items: center;
  display: grid;
  gap: var(--nk-space-unit);
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
}
</style>
