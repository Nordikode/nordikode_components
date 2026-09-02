<script setup lang="ts">
import type { NkStatusChipSize } from '../types/NkStatusChipSize'
import type { NkStatusChipTone } from '../types/NkStatusChipTone'

interface Props {
  /** Chip-teksten. Kan overstyres med default-slotten. Appen eier oversettelsen. */
  label?: string
  tone?: NkStatusChipTone
  size?: NkStatusChipSize
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  tone: 'neutral',
  size: 'md',
})
</script>

<template>
  <span
    class="nk-status-chip"
    :class="[`nk-status-chip--${props.size}`, `nk-status-chip--${props.tone}`]"
  >
    <slot>{{ props.label }}</slot>
  </span>
</template>

<style scoped>
.nk-status-chip {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--nk-space-unit) / 2);
  border-radius: var(--nk-radius-pill);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.2;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.nk-status-chip--sm {
  font-size: 0.62rem;
  padding: calc(var(--nk-space-unit) / 4) var(--nk-space-unit);
}

.nk-status-chip--md {
  font-size: 0.68rem;
  padding: calc(var(--nk-space-unit) / 2) calc(var(--nk-space-unit) * 1.5);
}

/* Tonene er alltid tint + mørk tekst (soft-parene) — status er aldri fylt knappfarge. */
.nk-status-chip--success {
  background: var(--nk-success-soft);
  color: var(--nk-on-success-soft);
}

.nk-status-chip--inflight {
  background: var(--nk-inflight-soft);
  color: var(--nk-on-inflight-soft);
}

.nk-status-chip--warning {
  background: var(--nk-warning-soft);
  color: var(--nk-on-warning-soft);
}

.nk-status-chip--error {
  background: var(--nk-error-soft);
  color: var(--nk-on-error-soft);
}

.nk-status-chip--info {
  background: var(--nk-info-soft);
  color: var(--nk-on-info-soft);
}

.nk-status-chip--neutral {
  background: var(--nk-surface-soft);
  color: var(--nk-text-secondary);
}
</style>
