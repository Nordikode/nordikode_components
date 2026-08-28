<script setup lang="ts">
/**
 * App-velgeren (Google-stil rutenett-meny) for webflatene — én komponent for
 * nettsiden, konto-appen og etter hvert produktappene (jf. SIGN-94). Ren
 * presentasjon: applisten kommer som props fra verts-appens adapter, ikonene
 * slås opp i det delte registeret (appIcons.ts) på app-nøkkelen.
 *
 * Tema: bruker verts-appens web-designtokens (`--color-*`, `--radius-*`) og
 * aksentkontrakten `--nk-chrome-accent` / `--nk-chrome-accent-ink`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { webAppIconFor } from './appIcons'

export type AppLauncherItem = {
  key: string
  label: string
  url: string
  /** Gruppenøkkel (`products`, `services`, `internal`) — apper uten gruppe havner i én felles seksjon. */
  group?: string
  /**
   * Antall-badge på oppføringen (f.eks. stacker til review). Summen av alle
   * badges vises også på selve rutenett-knappen. Null/0 = ingen badge.
   * Farger: kontraktvariablene `--nk-chrome-badge` / `--nk-chrome-badge-ink`
   * (verts-appen definerer dem fra error-tokenet, som chrome-aksenten).
   */
  badge?: number | null
}

const props = defineProps<{
  apps: AppLauncherItem[]
  /** aria-label på rutenett-knappen og panelet. */
  label: string
  /** Overskrift per gruppenøkkel (oversatt av verts-appen). Grupper uten oppføring vises uten overskrift. */
  groupLabels?: Record<string, string>
}>()

/** Seksjonene i innsettingsrekkefølge — backend eier rekkefølgen på listen. */
const sections = computed(() => {
  const byGroup = new Map<string, AppLauncherItem[]>()

  for (const app of props.apps) {
    const group = app.group ?? ''
    const bucket = byGroup.get(group)
    if (bucket) {
      bucket.push(app)
    } else {
      byGroup.set(group, [app])
    }
  }

  return Array.from(byGroup, ([group, apps]) => ({
    group,
    heading: props.groupLabels?.[group] ?? null,
    apps,
  }))
})

/** 3×3-rutenettet i utløser-knappen. */
const TRIGGER_DOTS = [5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => ({ x, y })))

/** Summen av alle badges — vises på rutenett-knappen så tallet synes uten å åpne panelet. */
const badgeTotal = computed(() =>
  props.apps.reduce((sum, app) => sum + Math.max(0, app.badge ?? 0), 0),
)

/** Badge-tekst med tak, så tallet aldri sprenger sirkelen. */
function badgeText(count: number): string {
  return count > 99 ? '99+' : String(count)
}

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
  if (open.value) void nextTick(() => focusItem(0))
}

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function menuItems(): HTMLElement[] {
  return Array.from(panelEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function focusItem(index: number) {
  const items = menuItems()
  if (items.length === 0) return
  const target = ((index % items.length) + items.length) % items.length
  items[target]?.focus()
}

function onPanelKeydown(event: KeyboardEvent) {
  const items = menuItems()
  const current = items.indexOf(document.activeElement as HTMLElement)

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault()
      focusItem(current + 1)
      break
    case 'ArrowUp':
    case 'ArrowLeft':
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
</script>

<template>
  <div ref="root" class="nk-launcher">
    <button
      ref="trigger"
      type="button"
      class="nk-launcher__trigger"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="nk-launcher__grid-icon" aria-hidden="true">
        <circle v-for="(pos, index) in TRIGGER_DOTS" :key="index" :cx="pos.x" :cy="pos.y" r="1.6" />
      </svg>
      <span v-if="badgeTotal > 0" class="nk-launcher__badge nk-launcher__badge--trigger">{{ badgeText(badgeTotal) }}</span>
    </button>

    <Transition name="nk-pop">
      <div
        v-if="open"
        ref="panelEl"
        role="menu"
        :aria-label="label"
        class="nk-launcher__panel"
        @keydown="onPanelKeydown"
      >
        <div
          v-for="(section, sectionIndex) in sections"
          :key="section.group"
          class="nk-launcher__section"
          :class="{ 'nk-launcher__section--first': sectionIndex === 0 }"
        >
          <p v-if="section.heading" class="nk-launcher__heading" role="presentation">{{ section.heading }}</p>
          <div class="nk-launcher__grid">
            <a
              v-for="app in section.apps"
              :key="app.key"
              role="menuitem"
              :href="app.url"
              rel="noopener"
              class="nk-launcher__item"
              @click="close()"
            >
              <span class="nk-launcher__chip">
                <span v-if="(app.badge ?? 0) > 0" class="nk-launcher__badge">{{ badgeText(app.badge!) }}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="nk-launcher__app-icon"
                  aria-hidden="true"
                >
                  <path v-for="(d, index) in webAppIconFor(app.key)" :key="index" :d="d" />
                </svg>
              </span>
              <span class="nk-launcher__label">{{ app.label }}</span>
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nk-launcher {
  position: relative;
}

.nk-launcher__trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-ink-secondary);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.nk-launcher__trigger:hover {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}


.nk-launcher__grid-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.nk-launcher__panel {
  position: absolute;
  inset-inline-end: 0;
  top: 100%;
  z-index: 50;
  margin-top: 0.5rem;
  width: 17rem;
  transform-origin: top right;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard);
  background: var(--color-surface-raised);
  padding: 0.75rem;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.nk-launcher__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.25rem;
}

.nk-launcher__section:not(.nk-launcher__section--first) {
  margin-top: 0.5rem;
  border-top: 1px solid var(--color-line);
  padding-top: 0.5rem;
}

.nk-launcher__heading {
  margin: 0 0 0.25rem;
  padding-inline: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-ink-tertiary);
}

.nk-launcher__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  border-radius: var(--radius-compact);
  padding: 0.75rem 0.5rem;
  text-align: center;
  text-decoration: none;
  outline: none;
  transition: background-color 0.15s;
}

.nk-launcher__item:hover,
.nk-launcher__item:focus-visible {
  background: var(--color-surface-alt);
}


.nk-launcher__chip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--nk-chrome-accent, var(--color-ink-tertiary)) 12%, transparent);
  color: var(--nk-chrome-accent-ink, var(--nk-chrome-accent, var(--color-ink-secondary)));
}

/* Antall-badge (oppføring + rutenett-knapp). Fargene er kontraktvariabler
   verts-appen definerer fra error-tokenet — fallback til Vuetify-tokenene
   for verter som allerede laster dem. */
.nk-launcher__badge {
  position: absolute;
  top: -0.25rem;
  inset-inline-end: -0.4375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0.9375rem;
  height: 0.9375rem;
  border-radius: 9999px;
  padding: 0 0.1875rem;
  background: var(--nk-chrome-badge, var(--nk-error));
  color: var(--nk-chrome-badge-ink, var(--nk-on-error));
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
}

.nk-launcher__badge--trigger {
  top: 0.0625rem;
  inset-inline-end: 0.0625rem;
}

.nk-launcher__app-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.nk-launcher__label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-ink);
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
  .nk-launcher__trigger,
  .nk-launcher__item,
  .nk-pop-enter-active,
  .nk-pop-leave-active {
    transition: none;
  }
}
</style>

<!-- Uscopet med vilje: `:global()` i scoped CSS knekker i pakkas
     LightningCSS-minifisering (selektoren `.dark .x` reduseres til `.dark`).
     Klassenavnene er nk-namespacet, så uscopede regler er trygge. -->
<style>
.dark .nk-launcher .nk-launcher__trigger:hover {
  background: var(--color-surface-raised);
}

.dark .nk-launcher .nk-launcher__item:hover,
.dark .nk-launcher .nk-launcher__item:focus-visible {
  background: color-mix(in srgb, var(--color-surface-alt) 20%, transparent);
}
</style>
