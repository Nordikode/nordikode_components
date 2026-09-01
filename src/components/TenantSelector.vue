<script setup lang="ts">
import { computed, useSlots } from 'vue'
import type { HeaderTenantOption } from '../types/HeaderTenantOption'
import type { SharedLocale } from '../types/SharedLocale'

interface Props {
  compact?: boolean
  emptyLabel?: string | null
  interactive?: boolean
  items: HeaderTenantOption[]
  locale?: SharedLocale | string | null
  menuMinWidth?: number
  modelValue: string
  personalValue?: string | null
  /**
   * 'chip' (den stille toppbaren, jf. SIGN-94): kompakt pille på dempet
   * flate med 28px avatar, firmanavn og chevron — uten skygge.
   */
  variant?: 'default' | 'chip'
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  emptyLabel: null,
  interactive: true,
  locale: 'en',
  menuMinWidth: 260,
  personalValue: null,
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const translations: Record<SharedLocale, { chooseCompany: string }> = {
  en: { chooseCompany: 'Choose company' },
  no: { chooseCompany: 'Velg selskap' },
  sv: { chooseCompany: 'Välj företag' },
  fr: { chooseCompany: 'Choisir une entreprise' },
  pl: { chooseCompany: 'Wybierz firmę' },
}

const resolvedLocale = computed<SharedLocale>(() => {
  const candidate = String(props.locale ?? 'en').toLowerCase()
  return candidate in translations ? (candidate as SharedLocale) : 'en'
})

const companyItems = computed(() => {
  if (!props.personalValue) {
    return props.items
  }

  return props.items.filter((item) => item.value.trim().toUpperCase() !== props.personalValue?.trim().toUpperCase())
})

const personalItem = computed(() => {
  if (!props.personalValue) {
    return null
  }

  return (
    props.items.find((item) => item.value.trim().toUpperCase() === props.personalValue?.trim().toUpperCase()) ?? null
  )
})

const slots = useSlots()

const activeTenant = computed(() => props.items.find((item) => item.value === props.modelValue) ?? props.items[0] ?? null)
const resolvedEmptyLabel = computed(() => props.emptyLabel ?? translations[resolvedLocale.value].chooseCompany)
// Med footer-innslag (verts-appens lenker, jf. SIGN-94) skal menyen kunne
// åpnes selv når brukeren bare har ett firma.
const shouldOpenMenu = computed(() => props.interactive && (props.items.length > 1 || Boolean(slots.footer)))

const pickTenant = (tenantId: string): void => {
  emit('update:modelValue', tenantId)
}

const triggerClasses = computed(() => [
  'tenant-trigger',
  {
    'tenant-trigger--compact': props.compact,
    'tenant-trigger--chip': props.variant === 'chip',
  },
])

const avatarSize = computed(() => (props.variant === 'chip' ? 28 : 34))

/** Chevron i chip-varianten — samme strek som webflatenes firmameny. */
const CHEVRON = 'm6 9 6 6 6-6'
</script>

<template>
  <v-menu v-if="shouldOpenMenu" location="bottom start" offset="8">
    <template #activator="{ props: menuProps }">
      <button :class="triggerClasses" type="button" v-bind="menuProps">
        <v-avatar class="tenant-avatar" color="primary" :size="avatarSize">
          <v-img v-if="activeTenant?.logoUrl" :src="activeTenant.logoUrl" cover />
          <span v-else>{{ (activeTenant?.title?.[0] ?? 'C').toUpperCase() }}</span>
        </v-avatar>

        <span v-if="!compact" class="tenant-name">{{ activeTenant?.title ?? resolvedEmptyLabel }}</span>

        <svg
          v-if="variant === 'chip' && !compact"
          aria-hidden="true"
          class="tenant-chevron"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.6"
          viewBox="0 0 24 24"
        >
          <path :d="CHEVRON" />
        </svg>
      </button>
    </template>

    <v-list class="tenant-menu-list" density="comfortable" :min-width="menuMinWidth">
      <v-list-item
        v-for="item in companyItems"
        :key="item.value"
        :active="item.value === modelValue"
        @click="pickTenant(item.value)"
      >
        <template #prepend>
          <v-avatar class="tenant-list-avatar" color="primary" size="28">
            <v-img v-if="item.logoUrl" :src="item.logoUrl" cover />
            <span v-else>{{ item.title[0]?.toUpperCase() }}</span>
          </v-avatar>
        </template>

        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>

      <template v-if="personalItem">
        <v-divider class="tenant-divider" />
        <v-list-item :active="personalItem.value === modelValue" @click="pickTenant(personalItem.value)">
          <template #prepend>
            <v-avatar class="tenant-list-avatar" color="primary" size="28">
              <v-img v-if="personalItem.logoUrl" :src="personalItem.logoUrl" cover />
              <span v-else>{{ personalItem.title[0]?.toUpperCase() }}</span>
            </v-avatar>
          </template>

          <v-list-item-title>{{ personalItem.title }}</v-list-item-title>
        </v-list-item>
      </template>

      <!-- Verts-appens innslag under firmalisten (firmainnstillinger,
           «Opprett nytt firma» o.l., jf. SIGN-94). -->
      <template v-if="slots.footer">
        <v-divider class="tenant-divider" />
        <slot name="footer" />
      </template>
    </v-list>
  </v-menu>

  <div v-else :class="triggerClasses" aria-live="polite">
    <v-avatar class="tenant-avatar" color="primary" :size="avatarSize">
      <v-img v-if="activeTenant?.logoUrl" :src="activeTenant.logoUrl" cover />
      <span v-else>{{ (activeTenant?.title?.[0] ?? 'C').toUpperCase() }}</span>
    </v-avatar>

    <span v-if="!compact" class="tenant-name">{{ activeTenant?.title ?? resolvedEmptyLabel }}</span>
  </div>
</template>

<style scoped>
.tenant-trigger {
  align-items: center;
  appearance: none;
  background: color-mix(in srgb, rgb(var(--v-theme-surface)) 90%, white 10%);
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, white 84%);
  border-radius: 999px;
  box-shadow: 0 6px 18px color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
  color: rgb(var(--v-theme-on-surface));
  display: inline-flex;
  gap: 10px;
  min-height: 46px;
  min-width: 220px;
  padding: 6px 12px 6px 6px;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

button.tenant-trigger {
  cursor: pointer;
}

button.tenant-trigger:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-surface)) 94%, white 6%);
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 28%, white 72%);
  box-shadow: 0 8px 20px color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent);
}

.tenant-avatar span,
.tenant-list-avatar span {
  color: rgb(var(--v-theme-on-primary));
  font-size: 0.76rem;
  font-weight: 700;
}

.tenant-name {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.1;
  text-align: left;
}

.tenant-menu-list {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, white 84%);
  border-radius: 14px;
}

.tenant-divider {
  margin: 6px 10px;
  opacity: 0.7;
}

.tenant-trigger--compact {
  background: transparent;
  border: 0;
  box-shadow: none;
  gap: 0;
  min-height: auto;
  min-width: 0;
  padding: 0;
}

/* Chip-varianten (den stille toppbaren, SIGN-94): kompakt pille på dempet
   flate — rollene fra tokens, ingen skygge, ingen dekor. */
.tenant-trigger--chip {
  background: var(--nk-surface-soft);
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-pill);
  box-shadow: none;
  gap: 8px;
  min-height: auto;
  min-width: 0;
  padding: 5px 14px 5px 5px;
}

.tenant-trigger--chip .tenant-name {
  color: var(--nk-text-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

.tenant-chevron {
  color: var(--nk-text-secondary);
  flex-shrink: 0;
  height: 16px;
  width: 16px;
}

button.tenant-trigger--chip:hover {
  background: color-mix(in srgb, var(--nk-surface-soft) 90%, var(--nk-text-primary) 10%);
  border-color: var(--nk-surface-border);
  box-shadow: none;
}

.tenant-trigger--chip.tenant-trigger--compact {
  background: transparent;
  border: 0;
  padding: 0;
}
</style>
