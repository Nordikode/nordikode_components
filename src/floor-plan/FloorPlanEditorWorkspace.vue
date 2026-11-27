<script setup lang="ts" generic="P extends FloorPlanDocument">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FloorPlanDrawing from './FloorPlanDrawing.vue'
import FloorPlanInspector from './FloorPlanInspector.vue'
import type { FloorPlanEditor } from './useFloorPlanEditor'
import { FLOOR_PLAN_OBJECT_CATEGORIES, FLOOR_PLAN_OPENING_KINDS, type FloorPlanDocument } from './model'
import { floorPlanEditorTexts, newFloorPlanRoomName } from './floorPlanEditorTexts'
import { floorPlanNames } from './floorPlanNames'
import { fillFloorPlanText } from './textFiles'
import { OPENING_MIN_WALL, hasFurniture as roomHasFurniture, removeAllObjectsInPlan } from './floorPlanEditing'
import { distance } from './floorPlanGeometry'
import { formatLength } from './measurements'

/**
 * The work surface of the room editor (SIGN-1980, shared since SIGN-2014):
 * the toolbar, the drawing and the fields for what is selected. The same
 * editor edits a floor plan and a sketch by hand — the page that shows it
 * owns what is loaded and how it is saved; this component only changes the
 * rooms through `editor`. It shows no messages of its own: when a room could
 * not be split where the person chose, it says so (`splitRefused`, with the
 * text in the user's language) and the page shows it the way the app does.
 *
 * Tegningen er arbeidsflaten — et trykk velger et rom, en vegg, en åpning
 * eller et inventar, og hjørner, inventar og åpninger kan dras — og feltene
 * ved siden av endrer det som er valgt, så ingenting KREVER å dra. Reglene er
 * de samme som i Sign-appen (`floorPlanEditing`).
 */
const props = defineProps<{
  editor: FloorPlanEditor<P>
  /** Navnet på tegningen for skjermlesere. */
  drawingLabel: string
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the texts, and how the measurements are written. */
  locale: string
}>()

const emit = defineEmits<{
  /** Cmd/Ctrl+S: siden som eier planen, lagrer. */
  save: []
  /** The room could not be split there: the page shows `message` as an error, the way the app shows errors. */
  splitRefused: [message: string]
}>()

const text = computed(() => floorPlanEditorTexts(props.locale))
const names = computed(() => floorPlanNames(props.locale))

/** Ett trykk på en piltast i tegningen flytter så mange meter. */
const NUDGE_STEP = 0.01

// The page hands the editor over once, and it stays the same for the life of the page; its parts are refs of their own.
const editor = props.editor
const plan = editor.plan

const save = (): void => {
  emit('save')
}

/* ---------- verktøylinja ---------- */

const selection = editor.selection

const selectedWall = computed(() => {
  const target = selection.value

  return target?.kind === 'wall' ? (editor.selectedRoom.value?.walls.find((wall) => wall.id === target.wallId) ?? null) : null
})

/** Dør, vindu og åpning settes på den valgte veggen — når den er lang nok. */
const canAddOpening = computed(() => selectedWall.value !== null && distance(selectedWall.value.start, selectedWall.value.end) >= OPENING_MIN_WALL)

/** Inventar settes i rommet det valgte hører til; har planen bare ett rom, er det rommet. */
const furnitureRoomId = computed(() => editor.selectedRoom.value?.id ?? (plan.value?.rooms.length === 1 ? plan.value.rooms[0].id : null))

const objectChoices = computed(() =>
  FLOOR_PLAN_OBJECT_CATEGORIES.map((category) => ({ category, name: names.value.objects[category] })).sort((left, right) =>
    left.name.localeCompare(right.name, props.locale),
  ),
)

// Søyler og bjelker er en del av bygget, ikke inventar (SIGN-2014).
const hasFurniture = computed(() => plan.value?.rooms.some(roomHasFurniture) ?? false)

/* ---------- dele et rom (SIGN-1982) ---------- */

const newRoomName = (): string => newFloorPlanRoomName(plan.value, props.locale)
const canvas = ref<HTMLElement | null>(null)

// Delingen starter i feltene, men gjøres i tegningen: den rulles fram, så
// hele rommet synes når neste trykk skal velge et sted på omrisset.
watch(
  () => editor.split.value?.roomId ?? null,
  (roomId) => {
    if (roomId !== null) {
      void nextTick(() => canvas.value?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }))
    }
  },
)

const splitRefused = (): void => {
  emit('splitRefused', text.value.split.refused)
}

/** Et sted i tegningen er valgt for skillelinja: det første huskes, det andre deler rommet. */
const pickSplitPoint = (point: { x: number; y: number }): void => {
  if (editor.pickSplitPoint(point, newRoomName()) === 'refused') {
    splitRefused()
  }
}

/* ---------- tastaturet ---------- */

// Snarveiene fra «Se tilbud» (SIGN-1957). Mens man skriver i et felt, angrer
// Cmd/Ctrl+Z tegn for tegn i feltet (nettleserens egen angring); ellers
// angres forrige endring i planen. Cmd/Ctrl+S lagrer, og åpner aldri
// nettleserens lagre-dialog. Tegningen tar de samme tastene selv når den har
// fokus, og stopper dem før de kommer hit.
const onShortcut = (event: KeyboardEvent): void => {
  if (plan.value === null || !(event.metaKey || event.ctrlKey) || event.altKey) {
    return
  }

  const key = event.key.toLowerCase()

  if (key === 's') {
    event.preventDefault()

    const active = window.document.activeElement

    // Det som står i feltet meldes først, så det er med i lagringen.
    if (active instanceof HTMLElement && active.closest('input, textarea') !== null) {
      active.blur()
    }

    save()

    return
  }

  if (key !== 'z' && key !== 'y') {
    return
  }

  const target = event.target

  if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, [contenteditable]') !== null)) {
    return
  }

  event.preventDefault()

  if (key === 'y' || event.shiftKey) {
    editor.redo()
  } else {
    editor.undo()
  }
}

onMounted(() => window.addEventListener('keydown', onShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', onShortcut))
</script>

<template>
  <div v-if="plan" class="floor-plan-editor">
    <div :aria-label="text.toolbar" class="floor-plan-edit-toolbar" role="toolbar">
      <v-btn
        data-testid="floor-plan-edit-undo"
        :disabled="!editor.canUndo.value"
        prepend-icon="mdi-undo"
        size="small"
        variant="text"
        @click="editor.undo()"
      >
        {{ text.undo }}
      </v-btn>
      <v-btn
        data-testid="floor-plan-edit-redo"
        :disabled="!editor.canRedo.value"
        prepend-icon="mdi-redo"
        size="small"
        variant="text"
        @click="editor.redo()"
      >
        {{ text.redo }}
      </v-btn>

      <v-menu>
        <template #activator="{ props: activator }">
          <v-btn v-bind="activator" append-icon="mdi-menu-down" data-testid="floor-plan-edit-add" prepend-icon="mdi-plus" size="small" variant="tonal">
            {{ text.add }}
          </v-btn>
        </template>
        <v-list class="floor-plan-edit-add-list" density="compact">
          <!-- Dør, vindu og åpning settes midt på den valgte veggen. -->
          <v-list-subheader>{{ canAddOpening ? text.onSelectedWall : text.selectWallFirst }}</v-list-subheader>
          <v-list-item
            v-for="kind in FLOOR_PLAN_OPENING_KINDS"
            :key="kind"
            :data-testid="`floor-plan-edit-add-${kind}`"
            :disabled="!canAddOpening"
            :title="names.openingKinds[kind]"
            @click="selection?.kind === 'wall' && editor.addOpening(selection.roomId, selection.wallId, kind)"
          />
          <v-divider />
          <!-- Inventar settes midt i rommet det valgte hører til. -->
          <v-list-subheader>{{ furnitureRoomId ? names.furniture : text.selectRoomFirst }}</v-list-subheader>
          <v-list-item
            v-for="choice in objectChoices"
            :key="choice.category"
            :data-testid="`floor-plan-edit-add-${choice.category}`"
            :disabled="!furnitureRoomId"
            :title="choice.name"
            @click="furnitureRoomId && editor.addObject(furnitureRoomId, choice.category)"
          />
        </v-list>
      </v-menu>

      <v-btn
        data-testid="floor-plan-edit-remove-furniture"
        :disabled="!hasFurniture"
        prepend-icon="mdi-package-variant-remove"
        size="small"
        variant="text"
        @click="editor.apply(removeAllObjectsInPlan)"
      >
        {{ text.removeAllFurniture }}
      </v-btn>
    </div>

    <!-- Tegningen er arbeidsflaten; feltene for det valgte står ved siden av (under på smale skjermer). -->
    <div class="floor-plan-edit-work">
      <div ref="canvas" class="floor-plan-edit-canvas">
        <FloorPlanDrawing
          interactive
          :label="drawingLabel"
          :locale="locale"
          :max-height="640"
          :plan="plan"
          :selection="selection"
          :split="editor.split.value"
          @drag="editor.drag"
          @nudge="editor.nudge"
          @redo="editor.redo"
          @remove="editor.remove"
          @select="editor.select"
          @split-cancel="editor.cancelSplit"
          @split-pick="pickSplitPoint"
          @undo="editor.undo"
        />
        <!-- Mens et rom deles, sier linja under tegningen hva neste trykk gjør. -->
        <p v-if="editor.split.value" aria-live="polite" class="floor-plan-edit-hint floor-plan-edit-hint--split" data-testid="floor-plan-edit-split-hint">
          {{ editor.split.value.from ? text.split.second : text.split.first }}
        </p>
        <p v-else class="floor-plan-edit-hint">{{ fillFloorPlanText(text.keyboardHint, { step: formatLength(NUDGE_STEP, locale) }) }}</p>
      </div>

      <FloorPlanInspector class="floor-plan-edit-inspector" :editor="editor" :locale="locale" @split-refused="splitRefused" />
    </div>
  </div>
</template>

<style scoped>
.floor-plan-editor {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 2);
  min-width: 0;
}

.floor-plan-edit-toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) / 2) var(--nk-space-unit);
}

.floor-plan-edit-add-list {
  max-height: 60vh;
}

.floor-plan-edit-work {
  align-items: start;
  display: grid;
  gap: calc(var(--nk-space-unit) * 3);
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

/* Bred side: arbeidsflaten til venstre, feltene i en fast spalte til høyre. */
@container (min-width: 960px) {
  .floor-plan-edit-work {
    grid-template-columns: minmax(0, 1fr) calc(var(--nk-space-unit) * 44);
  }
}

.floor-plan-edit-canvas {
  /* Når tegningen rulles fram, stopper den under toppfeltet og over lagre-raden. */
  scroll-margin-block: calc(var(--nk-space-unit) * 16);
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md);
  min-width: 0;
  padding: calc(var(--nk-space-unit) * 2);
}

.floor-plan-edit-hint {
  color: var(--nk-text-secondary);
  font-size: 0.8rem;
  margin: var(--nk-space-unit) 0 0;
  text-align: center;
}

.floor-plan-edit-hint--split {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.floor-plan-edit-inspector {
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md);
  padding: calc(var(--nk-space-unit) * 2);
}
</style>
