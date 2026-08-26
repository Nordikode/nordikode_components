<script setup lang="ts">
/**
 * Delt lys/mørk-bryter for webflatene — erstatter forkene i nettsiden og
 * konto-appen. Bruker pakkas useTheme (selvryddende localStorage-overstyring
 * av OS-preferansen) og verts-appens web-designtokens.
 *
 * Etikettene kommer som props: pakka er i18n-fri, verts-appen eier språket.
 */
import { computed } from 'vue'
import { useTheme } from './useTheme'

export type ThemeToggleLabels = {
  /** aria-label når mørk modus er på (handlingen: bytt til lys). */
  toLight: string
  /** aria-label når lys modus er på (handlingen: bytt til mørk). */
  toDark: string
}

const props = defineProps<{ labels: ThemeToggleLabels }>()

const { isDark, toggle } = useTheme()

const label = computed(() => (isDark.value ? props.labels.toLight : props.labels.toDark))
</script>

<template>
  <button type="button" class="nk-theme-toggle" :aria-label="label" :title="label" @click="toggle">
    <svg
      v-if="isDark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      class="nk-theme-toggle__icon"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="nk-theme-toggle__icon"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  </button>
</template>

<style scoped>
.nk-theme-toggle {
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

.nk-theme-toggle:hover,
.nk-theme-toggle:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-theme-toggle__icon {
  width: 1.25rem;
  height: 1.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .nk-theme-toggle {
    transition: none;
  }
}
</style>

<!-- Uscopet med vilje: `:global()` i scoped CSS knekker i pakkas
     LightningCSS-minifisering. Klassenavnene er nk-namespacet. -->
<style>
.dark .nk-theme-toggle:hover,
.dark .nk-theme-toggle:focus-visible {
  background: var(--color-surface-raised);
}
</style>
