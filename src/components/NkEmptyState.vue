<script setup lang="ts">
import type { NkEmptyStateSize } from '../types/NkEmptyStateSize'

/**
 * Delt tom-tilstand (SIGN-447): sentrert ikon, tittel, én forklarende linje
 * og en `actions`-slot for knappen(e). Appen eier all tekst (i18n) og
 * handlingene; komponenten eier bare geometri og toner.
 *
 * - `default`: primær-tonet ikonsirkel — hele flater og paneler som er tomme
 *   fordi ingenting er registrert ennå.
 * - `compact`: mindre luft og dempet ikonsirkel — «ingen treff» i lister
 *   etter søk eller filter.
 */
interface Props {
  /** MDI-ikonnavn (f.eks. `mdi-magnify`), rendres via v-icon. Uten ikon vises ingen sirkel. */
  icon?: string
  title: string
  description?: string
  size?: NkEmptyStateSize
}

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  description: '',
  size: 'default',
})
</script>

<template>
  <div class="nk-empty-state" :class="`nk-empty-state--${props.size}`">
    <div v-if="props.icon !== ''" aria-hidden="true" class="nk-empty-state__icon">
      <v-icon :icon="props.icon" :size="props.size === 'compact' ? 22 : 26" />
    </div>
    <h2 class="nk-empty-state__title">{{ props.title }}</h2>
    <p v-if="props.description !== ''" class="nk-empty-state__description">{{ props.description }}</p>
    <slot />
    <div v-if="$slots.actions" class="nk-empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.nk-empty-state {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.75);
  padding: calc(var(--nk-space-unit) * 4.5) calc(var(--nk-space-unit) * 2.5) calc(var(--nk-space-unit) * 3.5);
  text-align: center;
}

.nk-empty-state--compact {
  gap: calc(var(--nk-space-unit) / 2);
  padding: calc(var(--nk-space-unit) * 3.5) calc(var(--nk-space-unit) * 2.5) calc(var(--nk-space-unit) * 2.75);
}

/* Ikonsirkelen: primær-tint på flate (default) — samme soft-par som
   tonal-chipene, så den følger produkttemaet i begge moduser. */
.nk-empty-state__icon {
  align-items: center;
  background: var(--nk-action-primary-soft);
  border-radius: var(--nk-radius-pill);
  color: var(--nk-on-action-primary-soft);
  display: flex;
  height: calc(var(--nk-space-unit) * 6.5);
  justify-content: center;
  margin-bottom: var(--nk-space-unit);
  width: calc(var(--nk-space-unit) * 6.5);
}

/* Compact: dempet sirkel (flate + kant) — «ingen treff» er ikke en
   oppfordring, bare et svar. */
.nk-empty-state--compact .nk-empty-state__icon {
  background: var(--nk-surface);
  border: 1px solid var(--nk-surface-border);
  color: var(--nk-text-secondary);
  height: calc(var(--nk-space-unit) * 5.5);
  width: calc(var(--nk-space-unit) * 5.5);
}

.nk-empty-state__title {
  color: var(--nk-text-primary);
  font-size: var(--nk-text-body);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 0;
}

/* avledet: ett hakk under body-rollen, som støttetekst i kort/paneler. */
.nk-empty-state__description {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.875);
  line-height: 1.45;
  margin: 0;
  max-width: calc(var(--nk-space-unit) * 35);
}

.nk-empty-state__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-gap-inline);
  justify-content: center;
  margin-top: calc(var(--nk-space-unit) * 1.75);
}
</style>
