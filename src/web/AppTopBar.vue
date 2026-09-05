<script setup lang="ts">
/**
 * Felles topbar for produktappene (SIGN-94; arkitekturvedtak Tommy 01.09):
 * ÉN delt komponent i web-laget som internt gjenbruker de bokstavelig samme
 * chrome-komponentene nettsiden bruker — ThemeToggle, AppLauncherMenu,
 * TenantSwitcherMenu og AccountIdentityMenu — standard plassert, slik at
 * alle appene kjennes igjen.
 *
 * Ren presentasjon: data og etiketter kommer som props (verts-appen eier
 * i18n og stores); firmabytte og utlogging går ut som events. Geometrien
 * følger Sign-skall-artboardene: 64px flat flate på surface-tokenet med
 * hairline-bunnlinje — ingen gradient, ingen dekor.
 *
 * Tema: verts-appens web-designtokens (`--color-*`, `--radius-*`) og
 * aksentkontrakten `--nk-chrome-*`. Vuetify-appene mapper kontrakten fra
 * sine tokens, scoped til baren (se sign-web SignTopBar).
 */
import AccountIdentityMenu from './AccountIdentityMenu.vue'
import AppLauncherMenu from './AppLauncherMenu.vue'
import TenantSwitcherMenu from './TenantSwitcherMenu.vue'
import ThemeToggle from './ThemeToggle.vue'
import type { AccountMenuLabels, AccountMenuService, AccountMenuTheme } from './AccountIdentityMenu.vue'
import type { AppLauncherItem } from './AppLauncherMenu.vue'
import type { TenantSwitcherLabels, TenantSwitcherOption } from './TenantSwitcherMenu.vue'
import type { ThemeToggleLabels } from './ThemeToggle.vue'

const props = withDefaults(
  defineProps<{
    /** Appnavnet ved brand-slotten («Sign», «Time») — utelates når slotten tegner alt selv. */
    appTitle?: string | null

    /** Lys/mørk-bryteren. AV som standard: appene som styrer tema fra profilvalget (preferred_theme) kobler den på selv. */
    showThemeToggle?: boolean
    themeToggleLabels?: ThemeToggleLabels | null

    /** Produktvelgeren — listen kommer ferdig oppløst fra core (`me.menu.apps`) via verts-appen. */
    showLauncher?: boolean
    launcherApps?: AppLauncherItem[]
    launcherLabel?: string | null
    launcherGroupLabels?: Record<string, string> | null

    /** Firma-menyen (kontekstindikator + bytte). */
    showTenantMenu?: boolean
    tenants?: TenantSwitcherOption[]
    selectedTenantId?: string | null
    tenantLabels?: TenantSwitcherLabels | null
    tenantPersonal?: TenantSwitcherOption | null
    /** Deaktiverer valgene mens verts-appen utfører et bytte. */
    tenantSwitching?: boolean

    /** Konto-menyen (avataren). */
    showAccountMenu?: boolean
    userName?: string | null
    userEmail?: string | null
    userAvatarUrl?: string | null
    accountServices?: AccountMenuService[]
    /** Hvilken tjeneste denne appen er (`sign`, `time`, …) — markeres i tjenestelisten. */
    currentServiceKey?: string
    accountLabels?: AccountMenuLabels | null
    /** Tema-seksjonen i kontomenyen (SIGN-148); null = ingen seksjon. */
    accountTheme?: AccountMenuTheme | null
  }>(),
  {
    appTitle: null,
    showThemeToggle: false,
    themeToggleLabels: null,
    showLauncher: true,
    launcherApps: () => [],
    launcherLabel: null,
    launcherGroupLabels: null,
    showTenantMenu: true,
    tenants: () => [],
    selectedTenantId: null,
    tenantLabels: null,
    tenantPersonal: null,
    tenantSwitching: false,
    showAccountMenu: true,
    userName: null,
    userEmail: null,
    userAvatarUrl: null,
    accountServices: () => [],
    currentServiceKey: '',
    accountLabels: null,
    accountTheme: null,
  },
)

const emit = defineEmits<{
  logout: []
  'switch-tenant': [tenantId: string]
  'select-theme': [value: string]
}>()
</script>

<template>
  <header class="nk-topbar">
    <div class="nk-topbar__brand">
      <!-- App-brikken (logo) — verts-appen tegner den, felles stilhjelpere
           under (.nk-topbar__chip) så appene ser like ut. -->
      <slot name="brand" />
      <span v-if="appTitle" class="nk-topbar__title">{{ appTitle }}</span>
    </div>

    <div class="nk-topbar__actions">
      <ThemeToggle v-if="showThemeToggle && themeToggleLabels" :labels="themeToggleLabels" />

      <AppLauncherMenu
        v-if="showLauncher && launcherApps.length > 0 && launcherLabel"
        :apps="launcherApps"
        :group-labels="launcherGroupLabels ?? undefined"
        :label="launcherLabel"
      />

      <TenantSwitcherMenu
        v-if="showTenantMenu && tenants.length > 0 && tenantLabels"
        :labels="tenantLabels"
        :personal="tenantPersonal"
        :selected-id="selectedTenantId ?? ''"
        :switching="tenantSwitching"
        :tenants="tenants"
        variant="chip"
        @select="(tenantId) => emit('switch-tenant', tenantId)"
      >
        <template v-if="$slots['tenant-menu-footer']" #footer>
          <slot name="tenant-menu-footer" />
        </template>
      </TenantSwitcherMenu>

      <AccountIdentityMenu
        v-if="showAccountMenu && accountLabels"
        :avatar-url="userAvatarUrl"
        :current-service-key="currentServiceKey"
        :email="userEmail"
        :labels="accountLabels"
        :name="userName"
        :services="accountServices"
        :theme="accountTheme"
        @logout="emit('logout')"
        @select-theme="(value) => emit('select-theme', value)"
      />
    </div>
  </header>
</template>

<style scoped>
.nk-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 4rem;
  padding: 0 1.25rem 0 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
}

.nk-topbar__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.nk-topbar__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-ink);
}

.nk-topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-shrink: 0;
}
</style>

<!-- Uscopet med vilje (`:slotted()` rekker ikke inn i verts-appens slot-innhold
     på tvers av scope, og `:global()` knekker i pakkas LightningCSS-minifisering).
     Klassenavnene er nk-namespacet, så uscopede regler er trygge: felles
     app-brikke-stil så alle appene tegner logoen likt. -->
<style>
.nk-topbar .nk-topbar__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.125rem;
  height: 2.125rem;
  border-radius: var(--radius-compact);
  background: color-mix(in srgb, var(--nk-chrome-accent, var(--color-ink-tertiary)) 12%, transparent);
  color: var(--nk-chrome-accent-ink, var(--nk-chrome-accent, var(--color-ink-secondary)));
}
</style>
