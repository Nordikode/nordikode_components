<script setup lang="ts">
import { computed } from 'vue'
import TenantSelector from './TenantSelector.vue'
import UserIdentityMenu from './UserIdentityMenu.vue'
import type { AppSidebarRailItem } from '../types/AppSidebarRailItem'
import type { HeaderTenantOption } from '../types/HeaderTenantOption'
import type { SharedLocale } from '../types/SharedLocale'

interface Props {
  accountBaseUrl: string
  appTitle?: string | null
  footerItems?: AppSidebarRailItem[]
  items?: AppSidebarRailItem[]
  locale?: SharedLocale | string | null
  navigationToggleAriaLabel?: string | null
  navigationToggleIcon?: string
  showNavigationToggle?: boolean
  sourceApp?: string | null
  tenantEmptyLabel?: string | null
  tenantItems?: HeaderTenantOption[]
  tenantMenuEnabled?: boolean
  tenantMenuMinWidth?: number
  tenantModelValue?: string | null
  tenantPersonalValue?: string | null
  userAvatarUrl?: string | null
  userEmail?: string | null
  userName: string
}

const props = withDefaults(defineProps<Props>(), {
  appTitle: null,
  footerItems: () => [],
  items: () => [],
  locale: 'en',
  navigationToggleAriaLabel: null,
  navigationToggleIcon: 'mdi-menu',
  showNavigationToggle: false,
  sourceApp: null,
  tenantEmptyLabel: null,
  tenantItems: () => [],
  tenantMenuEnabled: true,
  tenantMenuMinWidth: 260,
  tenantModelValue: null,
  tenantPersonalValue: null,
  userAvatarUrl: null,
  userEmail: null,
})

const emit = defineEmits<{
  logout: []
  'select-item': [value: string]
  'toggle-navigation': []
  'update:tenantModelValue': [value: string]
}>()

const translations: Record<SharedLocale, { settings: string; toggleNavigation: string }> = {
  en: { settings: 'Settings', toggleNavigation: 'Toggle navigation' },
  no: { settings: 'Innstillinger', toggleNavigation: 'Veksle navigasjon' },
  sv: { settings: 'Installningar', toggleNavigation: 'Visa eller dlj navigering' },
  fr: { settings: 'Parametres', toggleNavigation: 'Basculer la navigation' },
  pl: { settings: 'Ustawienia', toggleNavigation: 'Przelacz nawigacje' },
}

const resolvedLocale = computed<SharedLocale>(() => {
  const candidate = String(props.locale ?? 'en').toLowerCase()
  return candidate in translations ? (candidate as SharedLocale) : 'en'
})

const labels = computed(() => translations[resolvedLocale.value])
const showTenantSelector = computed(() => props.tenantItems.length > 0)
const tenantInteractive = computed(() => props.tenantMenuEnabled && props.tenantItems.length > 1)

const selectedTenantValue = computed({
  get: () => props.tenantModelValue ?? props.tenantItems[0]?.value ?? '',
  set: (value: string) => emit('update:tenantModelValue', value),
})

const navigateToSettings = (): void => {
  const accountUrl = new URL('/account', props.accountBaseUrl)

  if (props.sourceApp) {
    accountUrl.searchParams.set('fromApp', props.sourceApp)
  }

  accountUrl.searchParams.set('returnTo', window.location.href)
  window.location.assign(accountUrl.toString())
}

const handleItemSelect = (value: string): void => {
  emit('select-item', value)
}
</script>

<template>
  <aside class="app-sidebar-rail">
    <div class="app-sidebar-rail__top">
      <v-tooltip v-if="showNavigationToggle" location="right">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-bind="tooltipProps"
            :aria-label="navigationToggleAriaLabel ?? labels.toggleNavigation"
            class="app-sidebar-rail__control"
            :icon="navigationToggleIcon"
            variant="text"
            @click="emit('toggle-navigation')"
          />
        </template>
        <span>{{ navigationToggleAriaLabel ?? labels.toggleNavigation }}</span>
      </v-tooltip>

      <div class="app-sidebar-rail__brand" :aria-label="appTitle ?? undefined">
        <slot name="brand-icon" />
      </div>

      <nav v-if="items.length > 0" class="app-sidebar-rail__nav" :aria-label="appTitle ?? 'App navigation'">
        <v-tooltip v-for="item in items" :key="item.key" location="right">
          <template #activator="{ props: tooltipProps }">
            <button
              v-bind="tooltipProps"
              :aria-current="item.active ? 'page' : undefined"
              :aria-label="item.label"
              :class="['app-sidebar-rail__item', { 'app-sidebar-rail__item--active': item.active }]"
              :disabled="item.disabled"
              type="button"
              @click="handleItemSelect(item.key)"
            >
              <v-icon :icon="item.icon" />
            </button>
          </template>
          <span>{{ item.label }}</span>
        </v-tooltip>
      </nav>
    </div>

    <div class="app-sidebar-rail__bottom">
      <button
        class="app-sidebar-rail__item app-sidebar-rail__item--secondary"
        :aria-label="labels.settings"
        type="button"
        @click="navigateToSettings"
      >
        <v-icon icon="mdi-cog-outline" />
      </button>

      <TenantSelector
        v-if="showTenantSelector"
        v-model="selectedTenantValue"
        compact
        :empty-label="tenantEmptyLabel"
        :interactive="tenantInteractive"
        :items="tenantItems"
        :locale="locale"
        :menu-min-width="tenantMenuMinWidth"
        :personal-value="tenantPersonalValue"
      />

      <UserIdentityMenu
        :account-base-url="accountBaseUrl"
        :avatar-url="userAvatarUrl"
        compact
        :locale="locale"
        :source-app="sourceApp"
        :user-email="userEmail"
        :user-name="userName"
        @logout="emit('logout')"
      />
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar-rail {
  align-items: center;
  background: var(--nk-sidebar-rail-bg, rgb(var(--v-theme-primary)));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: 20px 0 18px;
  width: 100%;
}

.app-sidebar-rail__top,
.app-sidebar-rail__bottom {
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 14px;
  width: 100%;
}

.app-sidebar-rail__brand {
  align-items: center;
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.app-sidebar-rail__brand :slotted(img) {
  display: block;
  height: 36px;
  object-fit: contain;
  width: 36px;
}

.app-sidebar-rail__nav {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 6px;
  width: 100%;
}

.app-sidebar-rail__bottom {
  margin-top: auto;
  padding-top: 20px;
}

.app-sidebar-rail__control,
.app-sidebar-rail__item {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 16px;
  color: var(--nk-sidebar-rail-icon, color-mix(in srgb, rgb(var(--v-theme-on-primary)) 82%, transparent));
  cursor: pointer;
  display: inline-flex;
  height: 44px;
  justify-content: center;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
  width: 44px;
}

.app-sidebar-rail__item:hover,
.app-sidebar-rail__control:hover {
  background: var(--nk-sidebar-rail-icon-hover-bg, color-mix(in srgb, white 14%, transparent));
  color: var(--nk-sidebar-rail-icon-hover, rgb(var(--v-theme-on-primary)));
  transform: translateY(-1px);
}

.app-sidebar-rail__item--active {
  background: var(
    --nk-sidebar-rail-icon-active-bg,
    color-mix(in srgb, rgb(var(--v-theme-on-primary)) 18%, transparent)
  );
  box-shadow: 0 10px 22px var(--nk-sidebar-rail-shadow, color-mix(in srgb, black 12%, transparent));
  color: var(--nk-sidebar-rail-icon-active, rgb(var(--v-theme-on-primary)));
}

.app-sidebar-rail__item--secondary {
  color: var(--nk-sidebar-rail-icon-secondary, color-mix(in srgb, rgb(var(--v-theme-on-primary)) 68%, transparent));
}

.app-sidebar-rail__item:disabled {
  cursor: default;
  opacity: 0.45;
  transform: none;
}

.app-sidebar-rail__item:disabled:hover {
  background: transparent;
}
</style>
