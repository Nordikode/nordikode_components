<script setup lang="ts">
import { computed, type Component } from 'vue'

/**
 * Seksjonsnavigasjon for områdesidene (company, account, developer —
 * SIGN-656; Sign-innstillingene — SIGN-417): områdets sider som sidemeny til
 * venstre, som en rullbar fanerad under sidehodet, eller som en gruppert
 * liste med piler (telefon, slik iOS Innstillinger gjør det).
 *
 * `layout` styrer formen:
 * - `auto` (standard): sidemeny fra 1280px og opp, fanerad under. Rent CSS.
 * - `side`: alltid sidemeny — for konsumenter som selv bestemmer bruddet
 *   (Sign holder menyen ved siden av innholdet ned til 600px, SIGN-417).
 * - `tabs`: alltid fanerad.
 * - `list`: gruppert liste i full bredde med pil på hver rad — menyen som
 *   egen skjerm på telefon; innholdet er neste skjerm.
 *
 * Punkter med samme `group` står sammen: luft mellom gruppene i sidemenyen,
 * eget kort per gruppe i listen, ingen synlig deling i faneraden.
 *
 * Punktene kan være lenker (`href`) eller valg (`select`-hendelsen, for
 * seksjoner i samme visning som i kontoinnstillingene). Konsumenter med
 * klient-side ruting (Inertia Link, RouterLink) sender lenkekomponenten sin
 * i `linkComponent` (og `hrefProp`: `href` for Inertia, `to` for RouterLink)
 * — pakka rendrer ikon, etikett og badge som ellers, uten reload.
 *
 * Fargene er web-lagets CSS-var-kontrakt: aktiv markering bruker
 * `--nk-chrome-accent` (appens handlingsfarge) og `--color-surface-alt`.
 */
export type SectionNavItem = {
  key: string
  label: string
  /** Lenke til siden. Utelates for seksjoner som velges i samme visning. */
  href?: string
  /** SVG-path (24×24, som @mdi/js) — valgfritt ikon foran etiketten. */
  icon?: string
  /** Antall-badge (f.eks. ubehandlede). Null/utelatt = ingen. */
  badge?: number | null
  /** Gruppenøkkel: punkter med samme gruppe står sammen. Utelatt = én gruppe. */
  group?: string
}

export type SectionNavLayout = 'auto' | 'side' | 'tabs' | 'list'

const props = withDefaults(
  defineProps<{
    items: SectionNavItem[]
    /** Nøkkelen til aktivt punkt (siden/seksjonen brukeren står i). */
    activeKey?: string | null
    /** Tilgjengelig navn på navigasjonen, f.eks. «Firma» eller «Innstillinger». */
    label: string
    /** Lenkekomponent for klient-side ruting (Inertia `Link`, `RouterLink`). Standard: `<a>`. */
    linkComponent?: Component | string | null
    /** Prop-navnet lenkekomponenten tar målet i: `href` (Inertia) eller `to` (RouterLink). */
    hrefProp?: string
    /** Formen: `auto` bytter selv på 1280px; `side`/`tabs`/`list` er faste. */
    layout?: SectionNavLayout
  }>(),
  { activeKey: null, linkComponent: null, hrefProp: 'href', layout: 'auto' },
)

const emit = defineEmits<{ select: [key: string] }>()

// Gruppene i rekkefølgen de først forekommer; punkter uten gruppe samles i én.
const groups = computed<{ key: string; items: SectionNavItem[] }[]>(() => {
  const order: string[] = []
  const byKey = new Map<string, SectionNavItem[]>()
  for (const item of props.items) {
    const key = item.group ?? ''
    if (!byKey.has(key)) {
      byKey.set(key, [])
      order.push(key)
    }
    byKey.get(key)!.push(item)
  }
  return order.map((key) => ({ key, items: byKey.get(key)! }))
})

const CHEVRON_PATH = 'M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z'

function isActive(item: SectionNavItem): boolean {
  return item.key === props.activeKey
}

function tag(item: SectionNavItem): Component | string {
  if (!item.href) return 'button'
  return props.linkComponent ?? 'a'
}

function linkAttrs(item: SectionNavItem): Record<string, unknown> {
  if (!item.href) return { type: 'button' }
  return { [props.hrefProp]: item.href }
}

function select(item: SectionNavItem): void {
  emit('select', item.key)
}
</script>

<template>
  <nav class="nk-section-nav" :class="`nk-section-nav--${layout}`" :aria-label="label">
    <div class="nk-section-nav__groups">
      <ul v-for="group in groups" :key="group.key" class="nk-section-nav__list">
        <li v-for="item in group.items" :key="item.key" class="nk-section-nav__item">
          <slot name="item" :item="item" :active="isActive(item)" :select="() => select(item)">
            <component
              :is="tag(item)"
              v-bind="linkAttrs(item)"
              class="nk-section-nav__link"
              :class="{ 'nk-section-nav__link--active': isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
              @click="select(item)"
            >
              <svg v-if="item.icon" class="nk-section-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="item.icon" fill="currentColor" />
              </svg>
              <span class="nk-section-nav__label">{{ item.label }}</span>
              <span v-if="item.badge" class="nk-section-nav__badge">{{ item.badge }}</span>
              <svg v-if="layout === 'list'" class="nk-section-nav__chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="CHEVRON_PATH" fill="currentColor" />
              </svg>
            </component>
          </slot>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.nk-section-nav {
  min-width: 0;
}

.nk-section-nav__groups,
.nk-section-nav__list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nk-section-nav__list {
  gap: 0.125rem;
}

/* :slotted() dekker lenker konsumentene rendrer selv i #item-sloten. */
.nk-section-nav__link,
:slotted(.nk-section-nav__link) {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  border: 0;
  background: transparent;
  color: var(--color-ink-secondary);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.2;
  /* Knapp-varianten (valg i samme visning) arver ellers nettleserens
     sentrerte knappetekst — punktene skal stå likt uansett element. */
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.nk-section-nav__link:hover,
.nk-section-nav__link:focus-visible,
:slotted(.nk-section-nav__link:hover),
:slotted(.nk-section-nav__link:focus-visible) {
  color: var(--color-ink);
}

.nk-section-nav__link:focus-visible,
:slotted(.nk-section-nav__link:focus-visible) {
  outline: 2px solid var(--nk-chrome-accent, var(--color-ink));
  outline-offset: 2px;
}

.nk-section-nav__link--active,
:slotted(.nk-section-nav__link--active) {
  color: var(--color-ink);
  font-weight: 600;
}

.nk-section-nav__icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0.85;
}

.nk-section-nav__label {
  min-width: 0;
}

.nk-section-nav__badge {
  min-width: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--nk-chrome-badge, var(--color-ink));
  color: var(--nk-chrome-badge-ink, var(--color-surface));
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.25rem;
  text-align: center;
}

.nk-section-nav__chevron {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-ink-secondary);
}

/* ---------- Fanerad: `tabs`, og `auto` under 1280px ---------- */

.nk-section-nav--tabs .nk-section-nav__groups,
.nk-section-nav--auto .nk-section-nav__groups {
  gap: 0.125rem;
  /* Smale skjermer: én rullbar rad med faner under sidehodet. */
  overflow-x: auto;
  border-bottom: 1px solid var(--color-line);
  scrollbar-width: none;
}

.nk-section-nav--tabs .nk-section-nav__groups::-webkit-scrollbar,
.nk-section-nav--auto .nk-section-nav__groups::-webkit-scrollbar {
  display: none;
}

.nk-section-nav--tabs .nk-section-nav__item,
.nk-section-nav--auto .nk-section-nav__item {
  flex-shrink: 0;
}

.nk-section-nav--tabs .nk-section-nav__link,
.nk-section-nav--tabs :slotted(.nk-section-nav__link),
.nk-section-nav--auto .nk-section-nav__link,
.nk-section-nav--auto :slotted(.nk-section-nav__link) {
  padding: 0.625rem 0.5rem;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.nk-section-nav--tabs .nk-section-nav__link--active,
.nk-section-nav--tabs :slotted(.nk-section-nav__link--active),
.nk-section-nav--auto .nk-section-nav__link--active,
.nk-section-nav--auto :slotted(.nk-section-nav__link--active) {
  border-bottom-color: var(--nk-chrome-accent, var(--color-ink));
}

/* ---------- Sidemeny: `side`, og `auto` fra 1280px (Vuetifys lg) ---------- */

.nk-section-nav--side {
  position: sticky;
  top: calc(var(--nk-chrome-height, 3.25rem) + 1.5rem);
  flex-shrink: 0;
  width: 14rem;
}

.nk-section-nav--side .nk-section-nav__groups {
  flex-direction: column;
  gap: 0.875rem;
}

.nk-section-nav--side .nk-section-nav__list {
  flex-direction: column;
}

.nk-section-nav--side .nk-section-nav__link,
.nk-section-nav--side :slotted(.nk-section-nav__link) {
  display: flex;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-compact);
  white-space: normal;
}

.nk-section-nav--side .nk-section-nav__link:hover,
.nk-section-nav--side :slotted(.nk-section-nav__link:hover) {
  background: var(--color-surface-alt);
}

.nk-section-nav--side .nk-section-nav__link--active,
.nk-section-nav--side :slotted(.nk-section-nav__link--active) {
  background: var(--color-surface-alt);
  color: var(--nk-chrome-accent-ink, var(--color-ink));
}

.nk-section-nav--side .nk-section-nav__label {
  flex: 1;
}

@media (min-width: 1280px) {
  .nk-section-nav--auto {
    position: sticky;
    top: calc(var(--nk-chrome-height, 3.25rem) + 1.5rem);
    flex-shrink: 0;
    width: 14rem;
  }

  .nk-section-nav--auto .nk-section-nav__groups {
    flex-direction: column;
    gap: 0.875rem;
    overflow: visible;
    border-bottom: 0;
  }

  .nk-section-nav--auto .nk-section-nav__list {
    flex-direction: column;
  }

  .nk-section-nav--auto .nk-section-nav__link,
  .nk-section-nav--auto :slotted(.nk-section-nav__link) {
    display: flex;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-bottom: 0;
    border-radius: var(--radius-compact);
    white-space: normal;
  }

  .nk-section-nav--auto .nk-section-nav__link:hover,
  .nk-section-nav--auto :slotted(.nk-section-nav__link:hover) {
    background: var(--color-surface-alt);
  }

  .nk-section-nav--auto .nk-section-nav__link--active,
  .nk-section-nav--auto :slotted(.nk-section-nav__link--active) {
    background: var(--color-surface-alt);
    color: var(--nk-chrome-accent-ink, var(--color-ink));
  }

  .nk-section-nav--auto .nk-section-nav__label {
    flex: 1;
  }
}

/* ---------- Liste: `list` — menyen som egen skjerm på telefon ---------- */

.nk-section-nav--list .nk-section-nav__groups {
  flex-direction: column;
  gap: 1rem;
}

.nk-section-nav--list .nk-section-nav__list {
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-compact);
  background: var(--color-surface);
}

.nk-section-nav--list .nk-section-nav__item + .nk-section-nav__item {
  border-top: 1px solid var(--color-line);
}

.nk-section-nav--list .nk-section-nav__link,
.nk-section-nav--list :slotted(.nk-section-nav__link) {
  display: flex;
  width: 100%;
  min-height: 2.875rem;
  padding: 0.5rem 0.625rem 0.5rem 0.875rem;
  gap: 0.75rem;
  color: var(--color-ink);
  font-size: 0.95rem;
}

.nk-section-nav--list .nk-section-nav__icon {
  color: var(--color-ink-secondary);
  opacity: 1;
}

.nk-section-nav--list .nk-section-nav__link--active,
.nk-section-nav--list :slotted(.nk-section-nav__link--active) {
  background: var(--color-surface-alt);
}

.nk-section-nav--list .nk-section-nav__label {
  flex: 1;
}

@media (prefers-reduced-motion: reduce) {
  .nk-section-nav__link,
  :slotted(.nk-section-nav__link) {
    transition: none;
  }
}
</style>
