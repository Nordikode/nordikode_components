<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { mdiDragVertical, mdiFolderMoveOutline } from '@mdi/js'

/**
 * Liste gruppert per gruppe der radene kan flyttes mellom gruppene
 * (SIGN-1395): ansatte mellom avdelinger i firmaappen og i firmaveiviseren.
 * Komponenten eier bare flyttingen — hva en rad er, tegner eieren i
 * `item`-sloten, og hva flyttingen betyr (lagring, angre) avgjør eieren i
 * `move`-hendelsen. Den lagrer ingenting selv.
 *
 * To likeverdige veier: dra håndtaket til en annen gruppe (mus), eller
 * menyen «Flytt til …» på raden (tastatur og mobil, der dra og slipp ikke
 * finnes). Mens noe dras, vises «uten gruppe» som slippmål også når den er
 * tom, så en rad kan tas ut av gruppen sin.
 */

export interface NkMoveGroup {
  id: string
  name: string
}

export interface NkMoveItem {
  id: string
  /** null = uten gruppe. */
  groupId: string | null
  /** Brukes i tilgjengelige navn («Flytt {name}»). */
  name: string
  /** false = raden står i listen, men kan ikke flyttes. */
  movable?: boolean
}

export interface NkMoveEvent {
  itemId: string
  fromGroupId: string | null
  toGroupId: string | null
}

export interface NkGroupedMoveListLabels {
  /** Gruppenavnet for radene uten gruppe. */
  ungrouped: string
  /** Menyknappen på raden; `{name}` byttes med radens navn. */
  move: string
  /** Dra-håndtaket; `{name}` byttes med radens navn. */
  drag: string
}

export interface NkMoveSection extends NkMoveGroup {
  id: string
  /** Nøkkelen i templaten — gruppen uten id har tom streng. */
  key: string
  items: NkMoveItem[]
}

const props = withDefaults(
  defineProps<{
    groups: NkMoveGroup[]
    items: NkMoveItem[]
    labels: NkGroupedMoveListLabels
    /** false = ren gruppert liste uten håndtak og meny. */
    canMove?: boolean
    /** false når eieren har sin egen vei for tastatur (f.eks. et avdelingsfelt på raden). */
    menu?: boolean
    /** Ekstra klasse per gruppe (null = uten gruppe), f.eks. for å framheve en ny gruppe. */
    groupClass?: (groupId: string | null) => string | undefined
    /** Overgangsklasser for radene (TransitionGroup). */
    transition?: { move?: string; leaveActive?: string; leaveFrom?: string; leaveTo?: string }
  }>(),
  { canMove: true, menu: true, groupClass: undefined, transition: undefined },
)

const emit = defineEmits<{ move: [event: NkMoveEvent] }>()

const UNGROUPED_KEY = ''

const dragging = ref<NkMoveItem | null>(null)
const over = ref<string | null>(null)
const openMenuFor = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)
let menuEl: HTMLElement | null = null
let menuTrigger: HTMLElement | null = null

const fill = (template: string, name: string): string => template.replace('{name}', name)

const keyOf = (groupId: string | null): string => groupId ?? UNGROUPED_KEY

const sections = computed<NkMoveSection[]>(() => {
  const named = props.groups.map((group) => ({
    ...group,
    key: group.id,
    items: props.items.filter((item) => item.groupId === group.id),
  }))
  const known = new Set(props.groups.map((group) => group.id))
  const loose = props.items.filter((item) => item.groupId === null || !known.has(item.groupId))
  // «Uten gruppe» vises når noen står der — og mens noe dras, så raden kan tas ut.
  const showLoose = loose.length > 0 || (dragging.value !== null && dragging.value.groupId !== null)

  return showLoose ? [...named, { id: UNGROUPED_KEY, key: UNGROUPED_KEY, name: props.labels.ungrouped, items: loose }] : named
})

const groupIdOf = (section: NkMoveSection): string | null => (section.key === UNGROUPED_KEY ? null : section.id)

const isMovable = (item: NkMoveItem): boolean => props.canMove && item.movable !== false

const targetsFor = (item: NkMoveItem): { id: string | null; name: string }[] => {
  const targets: { id: string | null; name: string }[] = props.groups.filter((group) => group.id !== item.groupId)
  if (item.groupId !== null) targets.push({ id: null, name: props.labels.ungrouped })
  return targets
}

const canDropIn = (groupId: string | null): boolean => dragging.value !== null && dragging.value.groupId !== groupId

function onDragStart(event: DragEvent, item: NkMoveItem) {
  closeMenu()
  dragging.value = item
  over.value = null
  const transfer = event.dataTransfer
  if (transfer) {
    transfer.effectAllowed = 'move'
    transfer.setData('text/plain', item.id)
    const row = (event.currentTarget as HTMLElement | null)?.closest('li')
    if (row && typeof transfer.setDragImage === 'function') transfer.setDragImage(row, 16, 16)
  }
}

function onDragEnd() {
  dragging.value = null
  over.value = null
}

function onDragEnter(groupId: string | null) {
  if (canDropIn(groupId)) over.value = keyOf(groupId)
}

function onDragOver(event: DragEvent, groupId: string | null) {
  if (!canDropIn(groupId)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  over.value = keyOf(groupId)
}

function onDragLeave(event: DragEvent, groupId: string | null) {
  const section = event.currentTarget as HTMLElement | null
  const next = event.relatedTarget as Node | null
  if (section && next && section.contains(next)) return
  if (over.value === keyOf(groupId)) over.value = null
}

function onDrop(event: DragEvent, groupId: string | null) {
  const item = dragging.value
  if (item === null || !canDropIn(groupId)) return
  event.preventDefault()
  onDragEnd()
  emit('move', { itemId: item.id, fromGroupId: item.groupId, toGroupId: groupId })
}

function toggleMenu(event: MouseEvent, item: NkMoveItem) {
  if (openMenuFor.value === item.id) {
    closeMenu(true)
    return
  }
  menuTrigger = event.currentTarget as HTMLElement
  openMenuFor.value = item.id
  void nextTick(() => focusOption(0))
}

function closeMenu(returnFocus = false) {
  if (openMenuFor.value === null) return
  openMenuFor.value = null
  if (returnFocus) menuTrigger?.focus()
  menuTrigger = null
}

async function choose(item: NkMoveItem, toGroupId: string | null) {
  closeMenu(true)
  // Menyen skal være tegnet bort før raden forlater gruppen: ellers henger
  // den åpne menyen igjen på raden mens utgangsovergangen spilles.
  await nextTick()
  emit('move', { itemId: item.id, fromGroupId: item.groupId, toGroupId })
}

function setMenuEl(el: unknown) {
  if (el instanceof HTMLElement) menuEl = el
}

function options(): HTMLElement[] {
  return Array.from(menuEl?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function focusOption(index: number) {
  const items = options()
  if (items.length === 0) return
  items[((index % items.length) + items.length) % items.length]?.focus()
}

function onMenuKeydown(event: KeyboardEvent) {
  const current = options().indexOf(document.activeElement as HTMLElement)
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusOption(current + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusOption(current - 1)
      break
    case 'Home':
      event.preventDefault()
      focusOption(0)
      break
    case 'End':
      event.preventDefault()
      focusOption(options().length - 1)
      break
    case 'Escape':
      event.preventDefault()
      closeMenu(true)
      break
    case 'Tab':
      closeMenu()
      break
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (openMenuFor.value !== null && root.value && !root.value.contains(event.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="nk-move" :class="{ 'nk-move--dragging': dragging !== null }">
    <section
      v-for="section in sections"
      :key="section.key"
      class="nk-move__group"
      :class="[
        {
          'nk-move__group--target': canDropIn(groupIdOf(section)),
          'nk-move__group--over': over === section.key,
        },
        groupClass?.(groupIdOf(section)),
      ]"
      :aria-label="section.name"
      :data-group="section.key"
      @dragenter.prevent="onDragEnter(groupIdOf(section))"
      @dragover="onDragOver($event, groupIdOf(section))"
      @dragleave="onDragLeave($event, groupIdOf(section))"
      @drop="onDrop($event, groupIdOf(section))"
    >
      <slot v-if="section.key !== UNGROUPED_KEY || groups.length > 0" name="group-head" :group="section" :count="section.items.length">
        <h3 class="nk-move__head">{{ section.name }}</h3>
      </slot>

      <TransitionGroup
        tag="ul"
        class="nk-move__list"
        :move-class="transition?.move"
        :leave-active-class="transition?.leaveActive"
        :leave-from-class="transition?.leaveFrom"
        :leave-to-class="transition?.leaveTo"
      >
        <li
          v-for="item in section.items"
          :key="item.id"
          class="nk-move__item"
          :class="{ 'nk-move__item--dragging': dragging?.id === item.id, 'nk-move__item--movable': isMovable(item) }"
        >
          <!-- Håndtaket er bare for mus: tastaturet har menyen. -->
          <span
            v-if="isMovable(item)"
            class="nk-move__handle"
            draggable="true"
            :title="fill(labels.drag, item.name)"
            aria-hidden="true"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
          >
            <svg viewBox="0 0 24 24" class="nk-move__icon"><path :d="mdiDragVertical" fill="currentColor" /></svg>
          </span>

          <div class="nk-move__body">
            <slot name="item" :item="item" />
          </div>

          <div v-if="menu && isMovable(item) && targetsFor(item).length > 0" class="nk-move__menu">
            <button
              type="button"
              class="nk-move__trigger"
              :aria-label="fill(labels.move, item.name)"
              :title="fill(labels.move, item.name)"
              aria-haspopup="menu"
              :aria-expanded="openMenuFor === item.id"
              @click="toggleMenu($event, item)"
            >
              <svg viewBox="0 0 24 24" class="nk-move__icon" aria-hidden="true"><path :d="mdiFolderMoveOutline" fill="currentColor" /></svg>
            </button>
            <div v-if="openMenuFor === item.id" :ref="setMenuEl" role="menu" class="nk-move__panel" :aria-label="fill(labels.move, item.name)" @keydown="onMenuKeydown">
              <button
                v-for="target in targetsFor(item)"
                :key="target.id ?? UNGROUPED_KEY"
                type="button"
                role="menuitem"
                class="nk-move__option"
                @click="choose(item, target.id)"
              >
                {{ target.name }}
              </button>
            </div>
          </div>
        </li>
      </TransitionGroup>

      <slot name="group-foot" :group="section" />
    </section>
  </div>
</template>

<style scoped>
.nk-move__group {
  border-radius: var(--radius-compact, 6px);
  transition: background-color 120ms ease;
}

.nk-move--dragging .nk-move__group--target {
  outline: 2px dashed color-mix(in srgb, var(--color-action, var(--color-ink-tertiary, #888)) 45%, transparent);
  outline-offset: -2px;
}

.nk-move--dragging .nk-move__group--over {
  background: color-mix(in srgb, var(--color-action, var(--color-ink-tertiary, #888)) 10%, transparent);
  outline-style: solid;
}

.nk-move__head {
  margin: 0;
  padding: 0.5rem 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-secondary);
}

.nk-move__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nk-move__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nk-move__item--dragging {
  opacity: 0.4;
}

.nk-move__body {
  flex: 1 1 0;
  min-width: 0;
}

.nk-move__handle {
  display: inline-flex;
  flex-shrink: 0;
  cursor: grab;
  color: var(--color-ink-tertiary, var(--color-ink-secondary));
  touch-action: none;
}

.nk-move__handle:active {
  cursor: grabbing;
}

.nk-move__icon {
  width: 20px;
  height: 20px;
}

.nk-move__menu {
  position: relative;
  flex-shrink: 0;
}

.nk-move__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-ink-secondary);
  cursor: pointer;
}

.nk-move__trigger:hover,
.nk-move__trigger[aria-expanded='true'] {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-move__trigger:focus-visible,
.nk-move__option:focus-visible {
  outline: 2px solid var(--color-action, var(--color-ink));
  outline-offset: 2px;
}

.nk-move__panel {
  position: absolute;
  inset-inline-end: 0;
  top: 100%;
  z-index: 50;
  margin-top: 0.25rem;
  min-width: 12rem;
  max-width: 18rem;
  padding: 0.375rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard, 10px);
  background: var(--color-surface-raised);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.nk-move__option {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: var(--radius-compact, 6px);
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.nk-move__option:hover {
  background: var(--color-surface-alt);
}
</style>
