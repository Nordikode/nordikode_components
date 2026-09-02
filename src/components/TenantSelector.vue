<script setup lang="ts">
import { computed } from 'vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  emptyLabel: null,
  interactive: true,
  locale: 'en',
  menuMinWidth: 260,
  personalValue: null,
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

const activeTenant = computed(() => props.items.find((item) => item.value === props.modelValue) ?? props.items[0] ?? null)
const resolvedEmptyLabel = computed(() => props.emptyLabel ?? translations[resolvedLocale.value].chooseCompany)
const shouldOpenMenu = computed(() => props.interactive && props.items.length > 1)

const pickTenant = (tenantId: string): void => {
  emit('update:modelValue', tenantId)
}
</script>

<template>
  <v-menu v-if="shouldOpenMenu" location="bottom start" offset="8">
    <template #activator="{ props: menuProps }">
      <button :class="['tenant-trigger', { 'tenant-trigger--compact': compact }]" type="button" v-bind="menuProps">
        <v-avatar class="tenant-avatar" color="primary" size="34">
          <v-img v-if="activeTenant?.logoUrl" :src="activeTenant.logoUrl" cover />
          <span v-else>{{ (activeTenant?.title?.[0] ?? 'C').toUpperCase() }}</span>
        </v-avatar>

        <span v-if="!compact" class="tenant-name">{{ activeTenant?.title ?? resolvedEmptyLabel }}</span>
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
    </v-list>
  </v-menu>

  <div v-else :class="['tenant-trigger', { 'tenant-trigger--compact': compact }]" aria-live="polite">
    <v-avatar class="tenant-avatar" color="primary" size="34">
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
</style>
