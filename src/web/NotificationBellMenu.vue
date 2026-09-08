<script setup lang="ts">
/**
 * Varslingsbjellen i headeren (SIGN-459) — global, på linje med konto- og
 * firmamenyen, felles for alle apper. Ren presentasjon som de andre
 * web-menyene: appen eier feeden (app-core `useNotificationStore`),
 * oversetter hendelsene til tekst og navigerer selv; her kommer alt inn
 * som props og går ut som events.
 *
 * Tilgjengelighet: bjellen er en knapp med `aria-label` som inkluderer
 * antall uleste, panelet er en `menu` med piltast-navigasjon, og ulest-
 * markeringen bæres av tekst (`labels.unread`) i tillegg til prikken.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export type NotificationBellItem = {
  id: string
  title: string
  body?: string | null
  /** Ferdig formatert tidspunkt («2 min siden», «i går»). */
  timeLabel: string
  read: boolean
}

export type NotificationBellLabels = {
  /** aria-label på bjellen uten uleste. */
  menu: string
  /** aria-label på bjellen med uleste; `{count}` erstattes. */
  menuWithUnread: string
  title: string
  empty: string
  markAllRead: string
  /** Skjermleser-tekst på uleste rader. */
  unread: string
}

const props = defineProps<{
  items: NotificationBellItem[]
  unreadCount: number
  labels: NotificationBellLabels
  /** Viser en stille lasteindikator i panelet (første last). */
  loading?: boolean
}>()

const emit = defineEmits<{
  /** Panelet ble åpnet — appen kan friske feeden. */
  open: []
  select: [item: NotificationBellItem]
  markAllRead: []
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)

const hasUnread = computed(() => props.unreadCount > 0)
const badge = computed(() => (props.unreadCount > 99 ? '99+' : String(props.unreadCount)))
const triggerLabel = computed(() =>
  hasUnread.value ? props.labels.menuWithUnread.replace('{count}', String(props.unreadCount)) : props.labels.menu,
)

const BELL_ICON = [
  'M15 17.5H9m6 0h3.5a1 1 0 0 0 .8-1.6l-1.3-1.7V10.5a6 6 0 0 0-12 0v3.7l-1.3 1.7a1 1 0 0 0 .8 1.6H9m6 0a3 3 0 0 1-6 0',
]

function toggle() {
  open.value = !open.value
  if (open.value) {
    emit('open')
    void nextTick(() => focusItem(0))
  }
}

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function menuItems(): HTMLElement[] {
  return Array.from(menuEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function focusItem(index: number) {
  const items = menuItems()
  if (items.length === 0) return
  const target = ((index % items.length) + items.length) % items.length
  items[target]?.focus()
}

function onMenuKeydown(event: KeyboardEvent) {
  const items = menuItems()
  const current = items.indexOf(document.activeElement as HTMLElement)

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusItem(current + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusItem(current - 1)
      break
    case 'Home':
      event.preventDefault()
      focusItem(0)
      break
    case 'End':
      event.preventDefault()
      focusItem(items.length - 1)
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

function onSelect(item: NotificationBellItem) {
  close()
  emit('select', item)
}

function onMarkAllRead() {
  emit('markAllRead')
}
</script>

<template>
  <div ref="root" class="nk-bell">
    <button
      ref="trigger"
      type="button"
      class="nk-bell__trigger"
      :class="{ 'nk-bell__trigger--unread': hasUnread }"
      :aria-label="triggerLabel"
      :title="triggerLabel"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="nk-bell__icon"
        aria-hidden="true"
      >
        <path v-for="(d, index) in BELL_ICON" :key="index" :d="d" />
      </svg>
      <span v-if="hasUnread" class="nk-bell__badge" aria-hidden="true">{{ badge }}</span>
    </button>

    <Transition name="nk-pop">
      <div v-if="open" ref="menuEl" role="menu" class="nk-bell__panel" :aria-label="labels.title" @keydown="onMenuKeydown">
        <div class="nk-bell__header">
          <p class="nk-bell__title">{{ labels.title }}</p>
          <button
            v-if="hasUnread"
            type="button"
            role="menuitem"
            class="nk-bell__mark-all"
            @click="onMarkAllRead"
          >
            {{ labels.markAllRead }}
          </button>
        </div>

        <p v-if="items.length === 0" class="nk-bell__empty" aria-live="polite">
          {{ loading ? '…' : labels.empty }}
        </p>

        <ul v-else class="nk-bell__list">
          <li v-for="item in items" :key="item.id">
            <button
              type="button"
              role="menuitem"
              class="nk-bell__item"
              :class="{ 'nk-bell__item--unread': !item.read }"
              @click="onSelect(item)"
            >
              <span class="nk-bell__dot" aria-hidden="true" />
              <span class="nk-bell__text">
                <span class="nk-bell__item-title">
                  {{ item.title }}<span v-if="!item.read" class="nk-sr-only"> ({{ labels.unread }})</span>
                </span>
                <span v-if="item.body" class="nk-bell__item-body">{{ item.body }}</span>
                <span class="nk-bell__item-time">{{ item.timeLabel }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nk-bell {
  position: relative;
}

.nk-bell__trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-ink-secondary);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.nk-bell__trigger:hover,
.nk-bell__trigger:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-bell__trigger--unread {
  color: var(--color-ink);
}

.nk-bell__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.nk-bell__badge {
  position: absolute;
  top: 0.125rem;
  inset-inline-end: 0.125rem;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  border-radius: 9999px;
  background: var(--nk-chrome-accent, var(--color-ink));
  color: var(--color-surface, #fff);
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1rem;
  text-align: center;
  box-shadow: 0 0 0 2px var(--color-surface, #fff);
}

.nk-bell__panel {
  position: absolute;
  inset-inline-end: 0;
  top: 100%;
  z-index: 50;
  margin-top: 0.5rem;
  width: 22rem;
  max-width: calc(100vw - 1rem);
  transform-origin: top right;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard);
  background: var(--color-surface-raised);
  padding: 0.375rem;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.nk-bell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-line);
  padding: 0.5rem 0.75rem 0.625rem;
}

.nk-bell__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink);
}

.nk-bell__mark-all {
  border: 0;
  border-radius: var(--radius-compact);
  background: transparent;
  padding: 0.25rem 0.5rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--nk-chrome-accent, var(--color-ink-secondary));
  cursor: pointer;
  outline: none;
}

.nk-bell__mark-all:hover,
.nk-bell__mark-all:focus-visible {
  background: var(--color-surface-alt);
}

.nk-bell__empty {
  margin: 0;
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-ink-tertiary);
}

.nk-bell__list {
  margin: 0;
  padding: 0.25rem 0 0;
  list-style: none;
  max-height: 24rem;
  overflow-y: auto;
}

.nk-bell__item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.625rem;
  border: 0;
  border-radius: var(--radius-compact);
  background: transparent;
  padding: 0.5rem 0.75rem;
  text-align: start;
  font-family: inherit;
  color: var(--color-ink-secondary);
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s, color 0.15s;
}

.nk-bell__item:hover,
.nk-bell__item:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-bell__item--unread {
  color: var(--color-ink);
}

.nk-bell__dot {
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  margin-top: 0.4375rem;
  border-radius: 9999px;
  background: transparent;
}

.nk-bell__item--unread .nk-bell__dot {
  background: var(--nk-chrome-accent, var(--color-ink));
}

.nk-bell__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
}

.nk-bell__item-title {
  font-size: 0.875rem;
  line-height: 1.35;
}

.nk-bell__item--unread .nk-bell__item-title {
  font-weight: 600;
}

.nk-bell__item-body {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--color-ink-secondary);
}

.nk-bell__item-time {
  font-size: 0.75rem;
  color: var(--color-ink-tertiary);
}

.nk-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.nk-pop-enter-active {
  transition: transform 0.1s ease-out, opacity 0.1s ease-out;
}

.nk-pop-leave-active {
  transition: transform 75ms ease-in, opacity 75ms ease-in;
}

.nk-pop-enter-from,
.nk-pop-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nk-bell__trigger,
  .nk-bell__item,
  .nk-pop-enter-active,
  .nk-pop-leave-active {
    transition: none;
  }
}
</style>

<!-- Uscopet med vilje — se AccountIdentityMenu.vue (LightningCSS og :global()). -->
<style>
.dark .nk-bell .nk-bell__trigger:hover,
.dark .nk-bell .nk-bell__trigger:focus-visible {
  background: var(--color-surface-raised);
}

.dark .nk-bell .nk-bell__item:hover,
.dark .nk-bell .nk-bell__item:focus-visible,
.dark .nk-bell .nk-bell__mark-all:hover,
.dark .nk-bell .nk-bell__mark-all:focus-visible {
  background: color-mix(in srgb, var(--color-surface-alt) 20%, transparent);
}
</style>
