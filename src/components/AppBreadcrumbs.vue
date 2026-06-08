<script setup lang="ts">
import { computed } from 'vue'
import type { AppBreadcrumbItem } from '../types/AppBreadcrumbItem'

interface Props {
  ariaLabel?: string | null
  backAriaLabel?: string | null
  backLabel?: string | null
  crumbs?: AppBreadcrumbItem[] | null
  showBackButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: null,
  backAriaLabel: null,
  backLabel: null,
  crumbs: () => [],
  showBackButton: false,
})

const resolvedCrumbs = computed(() => props.crumbs ?? [])

defineEmits<{
  back: []
}>()
</script>

<template>
  <div v-if="resolvedCrumbs.length > 0 || showBackButton" class="breadcrumbs-shell">
    <v-container class="breadcrumbs-wrap" fluid>
      <button
        v-if="showBackButton"
        class="back-button"
        type="button"
        :aria-label="backAriaLabel ?? backLabel ?? 'Back'"
        @click="$emit('back')"
      >
        <span class="back-button__icon" aria-hidden="true">
          <v-icon icon="mdi-arrow-left" size="16" />
        </span>
        <span class="back-button__label">{{ backLabel ?? 'Back' }}</span>
      </button>

      <nav v-if="resolvedCrumbs.length > 0" :aria-label="ariaLabel ?? 'Breadcrumb'" class="breadcrumbs">
        <template v-for="(crumb, index) in resolvedCrumbs" :key="`${crumb.label}-${index}`">
          <component
            :is="crumb.to && index !== resolvedCrumbs.length - 1 ? 'RouterLink' : 'span'"
            v-bind="crumb.to && index !== resolvedCrumbs.length - 1 ? { to: crumb.to } : {}"
            :class="crumb.to && index !== resolvedCrumbs.length - 1 ? 'crumb-link' : 'crumb-current'"
          >
            {{ crumb.label }}
          </component>
          <span v-if="index !== resolvedCrumbs.length - 1" class="crumb-separator">/</span>
        </template>
      </nav>
    </v-container>
  </div>
</template>

<style scoped>
.breadcrumbs-shell {
  background: color-mix(in srgb, rgb(var(--v-theme-background)) 92%, white 8%);
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, white 84%);
}

.breadcrumbs-wrap {
  align-items: center;
  display: flex;
  gap: 0;
  min-height: 44px;
  padding: 0;
}

.back-button {
  align-items: center;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, white 86%);
  border: 0;
  border-inline-end: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, white 84%);
  border-radius: 0;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  gap: 8px;
  height: 44px;
  line-height: 1;
  padding: 0 14px 0 12px;
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}

.back-button:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, white 80%);
}

.back-button__icon {
  align-items: center;
  color: rgb(var(--v-theme-primary));
  display: inline-flex;
  height: 18px;
  justify-content: center;
  width: 18px;
}

.back-button__label {
  color: rgb(var(--v-theme-on-surface));
}

.breadcrumbs {
  align-items: center;
  color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 64%, white 36%);
  display: inline-flex;
  flex-wrap: wrap;
  font-size: 0.82rem;
  gap: 6px;
  line-height: 1.2;
  padding: 0 20px;
}

.crumb-link {
  color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 64%, white 36%);
  text-decoration: none;
}

.crumb-link:hover {
  color: rgb(var(--v-theme-on-surface));
}

.crumb-current {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.crumb-separator {
  color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 64%, white 36%);
}

@media (max-width: 900px) {
  .breadcrumbs-wrap {
    min-height: 40px;
  }

  .back-button {
    height: 40px;
    padding: 0 12px 0 10px;
  }

  .breadcrumbs {
    padding: 0 16px;
  }
}
</style>
