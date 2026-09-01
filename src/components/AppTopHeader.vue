<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import TenantSelector from './TenantSelector.vue'
import UserIdentityMenu from './UserIdentityMenu.vue'
import type { HeaderTenantOption } from '../types/HeaderTenantOption'
import type { SharedLocale } from '../types/SharedLocale'

interface Props {
  accountBaseUrl: string
  appTitle?: string | null
  compactBreakpoint?: number
  locale?: SharedLocale | string | null
  navigationToggleAriaLabel?: string | null
  navigationToggleIcon?: string
  showNavigationToggle?: boolean
  /** Valgfritt «Avslutt»-mål (portalen) i identitetsmenyen. */
  exitUrl?: string | null
  tenantEmptyLabel?: string | null
  tenantItems?: HeaderTenantOption[]
  tenantMenuEnabled?: boolean
  tenantMenuMinWidth?: number
  tenantModelValue?: string | null
  tenantPersonalValue?: string | null
  userAvatarUrl?: string | null
  userEmail?: string | null
  userName: string
  /**
   * 'quiet' (produktappenes toppbar, jf. SIGN-94): 64px flat flate uten
   * gradient/dekor — firma-chip og avatar-utløser i stedet for pillene.
   */
  variant?: 'hero' | 'compact' | 'quiet'
}

const props = withDefaults(defineProps<Props>(), {
  appTitle: null,
  compactBreakpoint: 760,
  locale: 'en',
  navigationToggleAriaLabel: null,
  navigationToggleIcon: 'mdi-menu',
  showNavigationToggle: false,
  exitUrl: null,
  tenantEmptyLabel: null,
  tenantItems: () => [],
  tenantMenuEnabled: true,
  tenantMenuMinWidth: 260,
  tenantModelValue: null,
  tenantPersonalValue: null,
  userAvatarUrl: null,
  userEmail: null,
  variant: 'hero',
})

const emit = defineEmits<{
  logout: []
  'toggle-navigation': []
  'update:tenantModelValue': [value: string]
}>()

const slots = useSlots()
const compactActions = ref(false)
let compactActionsMediaQuery: MediaQueryList | null = null

const updateCompactActions = (event?: MediaQueryListEvent): void => {
  compactActions.value = event ? event.matches : Boolean(compactActionsMediaQuery?.matches)
}

const hasBrandMeta = computed(() => Boolean(props.appTitle || slots['brand-meta']))
const headerClasses = computed(() => [`app-top-header--${props.variant}`])
const isQuiet = computed(() => props.variant === 'quiet')
const showTenantSelector = computed(() => props.tenantItems.length > 0)
// Med footer-innslag i firmamenyen (jf. SIGN-94) skal menyen kunne åpnes
// selv når brukeren bare har ett firma.
const tenantInteractive = computed(
  () => props.tenantMenuEnabled && (props.tenantItems.length > 1 || Boolean(slots['tenant-menu-footer'])),
)

const selectedTenantValue = computed({
  get: () => props.tenantModelValue ?? props.tenantItems[0]?.value ?? '',
  set: (value: string) => emit('update:tenantModelValue', value),
})

onMounted(() => {
  compactActionsMediaQuery = window.matchMedia(`(max-width: ${props.compactBreakpoint}px)`)
  updateCompactActions()
  compactActionsMediaQuery.addEventListener('change', updateCompactActions)
})

onBeforeUnmount(() => {
  compactActionsMediaQuery?.removeEventListener('change', updateCompactActions)
})
</script>

<template>
  <header class="app-top-header" :class="headerClasses">
    <div class="app-top-header__surface">
      <div v-if="!isQuiet" class="app-top-header__art" aria-hidden="true">
        <span class="app-top-header__glow app-top-header__glow--left" />
        <span class="app-top-header__glow app-top-header__glow--right" />
        <span class="app-top-header__ridge app-top-header__ridge--back" />
        <span class="app-top-header__ridge app-top-header__ridge--far" />
        <span class="app-top-header__ridge app-top-header__ridge--mid" />
        <span class="app-top-header__ridge app-top-header__ridge--front" />
      </div>

      <div class="app-top-header__content">
        <div class="app-top-header__brand">
          <v-btn
            v-if="showNavigationToggle"
            :aria-label="navigationToggleAriaLabel ?? 'Toggle navigation'"
            class="app-top-header__nav-toggle"
            :icon="navigationToggleIcon"
            variant="text"
            @click="emit('toggle-navigation')"
          />
          <slot name="leading" />
          <slot name="brand-icon" />

          <div v-if="hasBrandMeta" class="app-top-header__brand-meta">
            <p v-if="appTitle" class="app-top-header__brand-title">{{ appTitle }}</p>
            <slot name="brand-meta" />
          </div>
        </div>

        <div class="app-top-header__actions">
          <!-- Verts-appens egne toppbar-handlinger (f.eks. produktvelgeren,
               jf. SIGN-94) — rendres foran firma- og identitetsmenyen. -->
          <slot name="actions" />
          <TenantSelector
            v-if="showTenantSelector"
            v-model="selectedTenantValue"
            :compact="compactActions"
            :empty-label="tenantEmptyLabel"
            :interactive="tenantInteractive"
            :items="tenantItems"
            :locale="locale"
            :menu-min-width="tenantMenuMinWidth"
            :personal-value="tenantPersonalValue"
            :variant="isQuiet ? 'chip' : 'default'"
          >
            <template v-if="slots['tenant-menu-footer']" #footer>
              <slot name="tenant-menu-footer" />
            </template>
          </TenantSelector>
          <UserIdentityMenu
            :account-base-url="accountBaseUrl"
            :avatar-url="userAvatarUrl"
            :compact="compactActions"
            :locale="locale"
            :exit-url="exitUrl"
            :user-email="userEmail"
            :user-name="userName"
            :variant="isQuiet ? 'avatar' : 'default'"
            @logout="emit('logout')"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-top-header {
  width: 100%;
}

.app-top-header__surface {
  background:
    radial-gradient(280px 180px at 8% 14%, color-mix(in srgb, rgb(var(--v-theme-secondary)) 42%, transparent) 0%, transparent 72%),
    linear-gradient(180deg, color-mix(in srgb, rgb(var(--v-theme-secondary)) 72%, white 28%) 0%, color-mix(in srgb, rgb(var(--v-theme-primary)) 58%, rgb(var(--v-theme-info)) 42%) 100%);
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-secondary)) 28%, rgb(var(--v-theme-info)) 72%);
  box-shadow: 0 8px 20px color-mix(in srgb, rgb(var(--v-theme-info)) 22%, transparent);
  height: 100%;
  position: relative;
}

.app-top-header__content {
  align-items: center;
  display: flex;
  gap: 16px;
  height: 100%;
  justify-content: space-between;
  padding: 0 clamp(14px, 3vw, 42px);
  position: relative;
  z-index: 1;
}

.app-top-header__brand {
  align-items: center;
  display: flex;
  gap: 12px;
  min-width: 0;
}

.app-top-header__brand :slotted(.app-top-header__leading-btn) {
  color: rgb(var(--v-theme-on-primary));
}

.app-top-header__nav-toggle {
  color: rgb(var(--v-theme-on-primary));
  flex-shrink: 0;
}

.app-top-header__brand-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-top-header__brand-title {
  color: rgb(var(--v-theme-on-primary));
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
}

.app-top-header__actions {
  align-items: center;
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.app-top-header__art,
.app-top-header__glow,
.app-top-header__ridge,
.app-top-header__wave {
  inset: 0;
  position: absolute;
}

/* Klippingen av dekoren ligger på art-laget, ikke på hele flaten — slotted
   innhold (f.eks. produktvelgerens panel, jf. SIGN-94) skal kunne henge
   under headeren. */
.app-top-header__art {
  overflow: hidden;
}

.app-top-header__glow {
  filter: blur(16px);
  opacity: 0.92;
}

.app-top-header__glow--left {
  background: radial-gradient(circle at center, color-mix(in srgb, rgb(var(--v-theme-secondary)) 54%, transparent) 0%, transparent 72%);
  inset: -16% auto auto -2%;
  width: 260px;
}

.app-top-header__glow--right {
  background: radial-gradient(circle at center, color-mix(in srgb, rgb(var(--v-theme-secondary)) 34%, transparent) 0%, transparent 74%);
  inset: auto 6% -52% auto;
  width: 280px;
}

.app-top-header__ridge {
  background: color-mix(in srgb, rgb(var(--v-theme-secondary)) 32%, rgb(var(--v-theme-primary)) 68%);
  opacity: 0.82;
}

.app-top-header__ridge--back {
  background: color-mix(in srgb, rgb(var(--v-theme-secondary)) 34%, rgb(var(--v-theme-primary)) 66%);
  clip-path: polygon(0 88%, 9% 34%, 20% 82%, 31% 26%, 44% 86%, 58% 36%, 72% 88%, 86% 30%, 100% 82%, 100% 100%, 0 100%);
  inset: 8% -2% -6% -2%;
  opacity: 0.5;
}

.app-top-header__ridge--far {
  clip-path: polygon(0 84%, 12% 26%, 24% 78%, 36% 20%, 49% 86%, 63% 28%, 77% 88%, 89% 24%, 100% 80%, 100% 100%, 0 100%);
  inset: 18% -2% -14% -2%;
}

.app-top-header__ridge--mid {
  background: color-mix(in srgb, rgb(var(--v-theme-secondary)) 54%, rgb(var(--v-theme-primary)) 46%);
  clip-path: polygon(0 84%, 18% 34%, 31% 82%, 46% 28%, 61% 86%, 75% 34%, 88% 88%, 100% 42%, 100% 100%, 0 100%);
  inset: 28% -2% -22% 24%;
  opacity: 0.58;
}

.app-top-header__ridge--front {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 78%, rgb(var(--v-theme-info)) 22%);
  clip-path: polygon(0 90%, 14% 46%, 28% 92%, 43% 40%, 57% 94%, 71% 44%, 85% 90%, 100% 52%, 100% 100%, 0 100%);
  inset: 40% -2% -30% 40%;
  opacity: 0.9;
}

.app-top-header--hero {
  height: 76px;
  position: sticky;
  top: 0;
  z-index: 40;
}

.app-top-header--hero .app-top-header__brand :slotted(img) {
  border-radius: 10px;
  display: block;
  height: 40px;
  object-fit: contain;
  width: 40px;
}

.app-top-header--compact {
  height: 76px;
}

.app-top-header--compact .app-top-header__content {
  padding-inline: 14px;
}

.app-top-header--compact .app-top-header__glow--left {
  inset: -20% auto auto 4%;
  width: 180px;
}

.app-top-header--compact .app-top-header__glow--right {
  inset: auto 10% -62% auto;
  width: 220px;
}

.app-top-header--compact .app-top-header__ridge--back {
  clip-path: polygon(0 90%, 11% 38%, 24% 86%, 37% 28%, 50% 90%, 64% 40%, 78% 92%, 90% 34%, 100% 84%, 100% 100%, 0 100%);
  inset: 8% -4% -8% 8%;
  opacity: 0.52;
}

.app-top-header--compact .app-top-header__ridge--far {
  clip-path: polygon(0 86%, 18% 30%, 35% 82%, 53% 24%, 69% 86%, 84% 30%, 100% 80%, 100% 100%, 0 100%);
  inset: 18% -6% -20% 16%;
}

.app-top-header--compact .app-top-header__ridge--mid {
  clip-path: polygon(0 86%, 20% 36%, 38% 84%, 56% 30%, 74% 86%, 100% 40%, 100% 100%, 0 100%);
  inset: 28% -6% -30% 38%;
  opacity: 0.6;
}

.app-top-header--compact .app-top-header__ridge--front {
  clip-path: polygon(0 92%, 16% 48%, 30% 92%, 45% 42%, 59% 94%, 73% 46%, 87% 90%, 100% 56%, 100% 100%, 0 100%);
  inset: 38% -4% -30% 50%;
}

.app-top-header--compact .app-top-header__brand :slotted(img) {
  display: block;
  height: 40px;
  object-fit: contain;
  width: 40px;
}

/* Den stille varianten (SIGN-94): 64px flat produktapp-topbar på
   surface-tokenet med hairline-bunnlinje — ingen gradient, ingen dekor.
   Rollene kommer fra tokens (@nordikode/components/tokens). */
.app-top-header--quiet {
  height: 64px;
}

.app-top-header--quiet .app-top-header__surface {
  background: var(--nk-surface);
  border-bottom: 1px solid var(--nk-surface-border);
  box-shadow: none;
}

.app-top-header--quiet .app-top-header__content {
  padding: 0 20px 0 16px;
}

.app-top-header--quiet .app-top-header__actions {
  gap: 14px;
}

.app-top-header--quiet .app-top-header__brand {
  gap: 10px;
}

.app-top-header--quiet .app-top-header__brand-title {
  color: var(--nk-text-primary);
  font-size: 1rem;
}

.app-top-header--quiet .app-top-header__nav-toggle,
.app-top-header--quiet .app-top-header__brand :slotted(.app-top-header__leading-btn) {
  color: var(--nk-text-primary);
}

@media (max-width: 900px) {
  .app-top-header--hero {
    height: 76px;
  }

  .app-top-header--hero .app-top-header__content {
    padding-inline: clamp(12px, 4vw, 22px);
  }

  .app-top-header--hero .app-top-header__brand :slotted(img) {
    height: 40px;
    width: 40px;
  }
}

@media (max-width: 760px) {
  .app-top-header__content {
    gap: 10px;
  }

  .app-top-header__actions {
    gap: 6px;
  }

  .app-top-header--hero .app-top-header__brand :slotted(img) {
    height: 36px;
    width: 36px;
  }

  .app-top-header--compact .app-top-header__brand-title {
    display: none;
  }
}
</style>
