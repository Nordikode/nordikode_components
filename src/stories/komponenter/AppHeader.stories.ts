import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AppHeader from '../../web/AppHeader.vue'
import ThemeToggle from '../../web/ThemeToggle.vue'
import TenantSwitcherMenu from '../../web/TenantSwitcherMenu.vue'
import AccountIdentityMenu from '../../web/AccountIdentityMenu.vue'
import AppLauncherMenu from '../../web/AppLauncherMenu.vue'
import NotificationBellMenu from '../../web/NotificationBellMenu.vue'

/**
 * Verts-appen eier web-designtokenene; dekoratøren mapper dem fra `--nk-*`
 * slik Sign/Time gjør i sin style.css, så historien følger Modus-valget
 * (lys/mørk) i verktøylinja.
 */
const webTokens = [
  '--color-surface: var(--nk-surface)',
  '--color-surface-alt: var(--nk-surface-soft)',
  '--color-surface-raised: var(--nk-surface)',
  '--color-ink: var(--nk-text-primary)',
  '--color-ink-secondary: var(--nk-text-secondary)',
  '--color-ink-tertiary: var(--nk-text-secondary)',
  '--color-line: var(--nk-surface-border)',
  '--radius-compact: var(--nk-radius-sm)',
  '--radius-standard: var(--nk-radius-lg)',
  '--nk-chrome-accent: var(--nk-on-info-soft)',
  '--nk-chrome-accent-ink: var(--nk-on-info-soft)',
  '--nk-chrome-badge: var(--nk-error)',
  '--nk-chrome-badge-ink: var(--nk-on-error)',
].join(';')

/** Firmalogo til historiene — inline SVG, ingen ekstern fil. */
const demoLogo =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#35569f"/><path d="M14 44 32 16l18 28H14Z" fill="#bfd75b"/></svg>',
  )

const tenantLabels = { menu: 'Firmameny', current: 'Valgt firma', companies: 'Dine firmaer' }
const toggleLabels = { toLight: 'Bytt til lys modus', toDark: 'Bytt til mørk modus' }
const accountLabels = { menu: 'Konto', services: 'Tjenester', current: 'Du er her', logOut: 'Logg ut' }
const services = [{ key: 'account', label: 'Kontoinnstillinger', url: '#' }]

const meta: Meta<typeof AppHeader> = {
  title: 'Komponenter/Web/AppHeader',
  component: AppHeader,
  parameters: { layout: 'fullscreen' },
  decorators: [
    () => ({
      template: `<div style="min-height: 420px; background: var(--nk-page); ${webTokens}"><story /></div>`,
    }),
  ],
}

export default meta
type Story = StoryObj<typeof AppHeader>

const labels = { navigation: 'Hovednavigasjon', menu: 'Meny' }

const nav = [
  { key: 'products', label: 'Produkter', href: '/produkter' },
  { key: 'prices', label: 'Priser', href: '/priser' },
  {
    key: 'resources',
    label: 'Ressurser',
    children: [
      { key: 'help', label: 'Hjelpesenter', href: '/hjelp' },
      { key: 'guides', label: 'Guider', href: '/guider' },
    ],
  },
]

export const Standard: Story = {
  args: { labels, nav, currentPath: '/priser' },
}

export const AdminWide: Story = {
  name: 'Admin (wide)',
  args: {
    labels,
    width: 'wide',
    currentPath: '/admin/pages',
    nav: [
      { key: 'dashboard', label: 'Dashboard', href: '/admin' },
      { key: 'pages', label: 'Pages', href: '/admin/pages' },
      { key: 'seo', label: 'SEO', href: '/admin/seo' },
    ],
  },
}

/**
 * Sign (SIGN-641): produktet har egen logo og viser den alene — ingen
 * produktnavn bak.
 */
export const Sign: Story = {
  name: 'Sign (egen logo, full)',
  args: { labels, width: 'full', brand: 'sign' },
}

/**
 * Produkter uten egen logo (Time, backoffice, SIGN-641): Nordikode-logoen
 * med produktnavnet i `#brand-suffix`. Suffikset skjules under 480 px.
 */
export const MedSuffiks: Story = {
  name: 'Time (Nordikode-logo + suffiks)',
  args: { labels, width: 'full' },
  render: (args) => ({
    components: { AppHeader },
    setup: () => ({ args }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Time</template>
      </AppHeader>
    `,
  }),
}

/**
 * Produktsymbol foran produktnavnet i `#brand-suffix` via `productSymbol`
 * (SIGN-614). Etter SIGN-641 viser Sign hele sin egen logo (`brand="sign"`,
 * storyen over); propen står igjen for produkter uten egen logo. Tar-delen
 * følger blekket (lys/mørk), merkefargen er fast.
 */
export const MedProduktsymbol: Story = {
  name: 'Produktsymbol foran suffiks (productSymbol)',
  args: { labels, width: 'full', productSymbol: 'sign' },
  render: (args) => ({
    components: { AppHeader },
    setup: () => ({ args }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Sign</template>
      </AppHeader>
    `,
  }),
}

/**
 * Standardoppsettet for innloggede flater (SIGN-561): firmablokken i
 * `#tenant` rett etter merkevaren, menyene i `#menus`. Firmablokken er selve
 * TenantSwitcherMenu med `variant="block"` — klikk åpner firmabyttet.
 */
export const MedMenyer: Story = {
  name: 'Med firmablokk og menyene',
  args: { labels, nav, currentPath: '/produkter' },
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
    }),
    template: `
      <AppHeader v-bind="args">
        <template #tenant>
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" />
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="website"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Firmablokken (SIGN-561) i produktappenes oppsett: symbol + produktnavn,
 * skillestrek, logo og fullt firmanavn — ingen navigasjon i headeren.
 */
export const FirmablokkMedLogo: Story = {
  name: 'Firmablokk – med logo',
  args: { labels, width: 'full', productSymbol: 'sign' },
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
    }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Sign</template>
        <template #tenant>
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" />
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="sign"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Signs oppsett (SIGN-683): firmablokken på høyresiden i `#menus`, rett før
 * kontomenyen (`align="end"`), så firma og bruker står sammen ved høyre kant.
 * `#tenant` står tom. På smale mobiler viker firmanavnet — logoen står.
 */
export const FirmablokkHoyre: Story = {
  name: 'Firmablokk – ved høyre kant (Sign)',
  args: { labels, width: 'full', brand: 'sign' },
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Bygg og Anlegg AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
    }),
    template: `
      <AppHeader v-bind="args">
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" align="end" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="sign"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Langt firmanavn ved høyre kant på nettbrett i stående format (SIGN-1271):
 * menygruppen krymper, og bare firmablokken i den — navnet trunkeres med
 * ellipse, mens tema, varsler, app-velger og kontomenyen holder bredden sin
 * og står innenfor rammen (768 px). Full tittel ligger i `title` på blokken.
 */
export const FirmablokkHoyreLangtNavn: Story = {
  name: 'Firmablokk – ved høyre kant, langt firmanavn (768 px)',
  args: { labels, width: 'full', brand: 'sign' },
  decorators: [
    () => ({
      template: `<div style="width: 768px; max-width: 100%; outline: 1px dashed #c00;"><story /></div>`,
    }),
  ],
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu, AppLauncherMenu, NotificationBellMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Nordvestlandske Entreprenører Holding AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
      apps: [
        { key: 'sign', label: 'Sign', url: '#', group: 'products' },
        { key: 'time', label: 'Time', url: '#', group: 'products' },
      ],
      groupLabels: { products: 'Produkter' },
      bellLabels: {
        menu: 'Varsler',
        menuWithUnread: 'Varsler, {count} uleste',
        title: 'Varsler',
        empty: 'Ingen varsler ennå.',
        markAllRead: 'Merk alle som lest',
        unread: 'ulest',
      },
    }),
    template: `
      <AppHeader v-bind="args">
        <template #actions>
          <div style="display: flex; align-items: center; gap: 0.375rem; white-space: nowrap; font-size: 0.875rem;">
            <span style="padding: 0.375rem 0.75rem; border: 1px solid var(--color-line); border-radius: 9999px;">Donner votre avis</span>
          </div>
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <NotificationBellMenu :items="[]" :unread-count="0" :labels="bellLabels" />
          <AppLauncherMenu :apps="apps" :group-labels="groupLabels" label="Nordikode-apper" />
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" align="end" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="sign"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/** Uten logo (eller når logoen feiler å laste) står initialene i samme rute. */
export const FirmablokkUtenLogo: Story = {
  name: 'Firmablokk – uten logo (initialer)',
  args: { labels, width: 'full', productSymbol: 'sign' },
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Håndverkspartner Sørvest AS', logoUrl: null },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: demoLogo },
      ],
      tenantLabels,
      accountLabels,
      services,
    }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Sign</template>
        <template #tenant>
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" />
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="sign"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Langt firmanavn med navigasjon (company-appen): blokken krymper før
 * navigasjonen og menyene — navnet trunkeres med ellipse, logoen står.
 * Full tittel ligger i `title` på blokken.
 */
export const FirmablokkLangtNavn: Story = {
  name: 'Firmablokk – langt firmanavn + nav',
  args: {
    labels,
    width: 'full',
    currentPath: '/personer',
    nav: [
      { key: 'profile', label: 'Profil', href: '/profil' },
      { key: 'people', label: 'Personer', href: '/personer' },
      { key: 'departments', label: 'Avdelinger', href: '/avdelinger' },
      { key: 'roles', label: 'Roller', href: '/roller' },
      { key: 'subscription', label: 'Abonnement', href: '/abonnement' },
    ],
  },
  decorators: [
    () => ({
      template: `<div style="width: 900px; max-width: 100%;"><story /></div>`,
    }),
  ],
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Nordvestlandske Entreprenør og Anleggsgartnere Holding AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
    }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Company</template>
        <template #tenant>
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" />
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="company"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Én app (SIGN-1506): har firmaet bare Sign, viser app-velgeren «Sign» med
 * ikon som direkte lenke i stedet for ni prikker. `width` styrer bredden, så
 * samme historie viser både PC (1280 px) og smal mobil (360 px).
 */
function oneAppStory(width: string): Story {
  return {
    args: { labels, width: 'full', brand: 'sign' },
    decorators: [
      () => ({
        template: `<div style="width: ${width}; max-width: 100%; min-height: 420px; outline: 1px dashed #c00;"><story /></div>`,
      }),
    ],
    render: (args) => ({
      components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu, AppLauncherMenu, NotificationBellMenu },
      setup: () => ({
        args,
        toggleLabels,
        tenants: [{ id: 't-1', name: 'RS Bygg AS', logoUrl: demoLogo }],
        tenantLabels,
        accountLabels,
        services,
        apps: [{ key: 'sign', label: 'Sign', url: '#', group: 'products' }],
        bellLabels: {
          menu: 'Varsler',
          menuWithUnread: 'Varsler, {count} uleste',
          title: 'Varsler',
          empty: 'Ingen varsler ennå.',
          markAllRead: 'Merk alle som lest',
          unread: 'ulest',
        },
      }),
      template: `
        <AppHeader v-bind="args">
          <template #menus>
            <ThemeToggle :labels="toggleLabels" />
            <NotificationBellMenu :items="[]" :unread-count="0" :labels="bellLabels" />
            <AppLauncherMenu :apps="apps" label="Nordikode-apper" />
            <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" align="end" />
            <AccountIdentityMenu
              name="Tony Nordmann"
              email="tony@example.com"
              :services="services"
              current-service-key="company"
              :labels="accountLabels"
            />
          </template>
        </AppHeader>
      `,
    }),
  }
}

export const EnApp: Story = { ...oneAppStory('1280px'), name: 'Én app – Sign som direkte lenke' }

export const EnAppSmalMobil: Story = { ...oneAppStory('360px'), name: 'Én app – smal mobil (360 px)' }

/**
 * Smal mobil (SIGN-537/561): merket, firmablokken og menyene skal være
 * synlige uten horisontal scroll ved 360–414 px — ordet «Nordikode» og
 * suffikset viker, firmanavnet trunkeres og logoen står.
 */
export const SmalMobil: Story = {
  name: 'Firmablokk – smal mobil (390 px)',
  args: { labels, nav, currentPath: '/produkter' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    () => ({
      template: `<div style="width: 390px; max-width: 100%; overflow: hidden; border-right: 1px dashed #c00;"><story /></div>`,
    }),
  ],
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Håndverkspartner Sørvest AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
    }),
    template: `
      <AppHeader v-bind="args">
        <template #brand-suffix>Company</template>
        <template #tenant>
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" />
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="company"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Smal mobil med alle menyene (SIGN-756): under 640 px forankres panelene
 * til headeren i stedet for knappen, så bjelle- og app-velgerpanelet ikke
 * starter utenfor skjermen til venstre. Rammen markerer 360 px-viewporten
 * uten å klippe (panelene skal holde seg innenfor den).
 */
export const SmalMobilAlleMenyer: Story = {
  name: 'Smal mobil (360 px) – alle menyene',
  args: { labels, nav, currentPath: '/produkter' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    () => ({
      template: `<div style="width: 360px; max-width: 100%; min-height: 520px; outline: 1px dashed #c00;"><story /></div>`,
    }),
  ],
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu, AppLauncherMenu, NotificationBellMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Håndverkspartner Sørvest AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      tenantLabels,
      accountLabels,
      services,
      apps: [
        { key: 'sign', label: 'Sign', url: '#', group: 'products' },
        { key: 'time', label: 'Time', url: '#', group: 'products' },
        { key: 'website', label: 'Nettsiden', url: '#', group: 'services' },
        { key: 'developer', label: 'Utvikler', url: '#', group: 'services' },
      ],
      groupLabels: { products: 'Produkter', services: 'Tjenester' },
      bellLabels: {
        menu: 'Varsler',
        menuWithUnread: 'Varsler, {count} uleste',
        title: 'Varsler',
        empty: 'Ingen varsler ennå.',
        markAllRead: 'Merk alle som lest',
        unread: 'ulest',
      },
      notifications: [
        { id: '1', title: 'Kunden har akseptert tilbudet i «Bad Bergen»', timeLabel: '2 min siden', read: false },
        { id: '2', title: 'Ola Nordmann har sendt en melding i «Kjøkken Voss»', body: 'Kan dere komme tirsdag i stedet?', timeLabel: '1 t siden', read: false },
      ],
    }),
    template: `
      <AppHeader v-bind="args">
        <template #tenant>
          <TenantSwitcherMenu :tenants="tenants" selected-id="t-1" :labels="tenantLabels" variant="block" />
        </template>
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <NotificationBellMenu :items="notifications" :unread-count="2" :labels="bellLabels" />
          <AppLauncherMenu :apps="apps" :group-labels="groupLabels" label="Nordikode-apper" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="account"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

/**
 * Nettsidens oppsett på smal mobil (SIGN-757): standardvarianten av
 * firmamenyen (avatar + chevron) i `#menus` sammen med app-velger og konto.
 * Panelet skal ha flate (ramme, bakgrunn, skygge) og legge seg inntil høyre
 * kant under headeren, på samme side som knappen.
 */
export const SmalMobilNettsidensFirmameny: Story = {
  name: 'Smal mobil (360 px) – nettsidens firmameny',
  args: { labels, nav, currentPath: '/produkter' },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    () => ({
      template: `<div style="width: 360px; max-width: 100%; min-height: 520px; outline: 1px dashed #c00;"><story /></div>`,
    }),
  ],
  render: (args) => ({
    components: { AppHeader, ThemeToggle, TenantSwitcherMenu, AccountIdentityMenu, AppLauncherMenu },
    setup: () => ({
      args,
      toggleLabels,
      tenants: [
        { id: 't-1', name: 'Byggmester Handeland AS', logoUrl: demoLogo },
        { id: 't-2', name: 'Moore Eiendom AS', logoUrl: null },
      ],
      personal: { id: 'personal', name: 'Personlig' },
      tenantLabels,
      accountLabels,
      services,
      apps: [
        { key: 'sign', label: 'Sign', url: '#', group: 'products' },
        { key: 'time', label: 'Time', url: '#', group: 'products' },
      ],
      groupLabels: { products: 'Produkter' },
    }),
    template: `
      <AppHeader v-bind="args">
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AppLauncherMenu :apps="apps" :group-labels="groupLabels" label="Nordikode-apper" />
          <TenantSwitcherMenu :tenants="tenants" :personal="personal" selected-id="t-1" :labels="tenantLabels" />
          <AccountIdentityMenu
            name="Kari Nordmann"
            email="kari@example.com"
            :services="services"
            current-service-key="website"
            :labels="accountLabels"
          />
        </template>
      </AppHeader>
    `,
  }),
}

const supportLabels = {
  region: 'Supportøkt',
  viewingAs: 'Du ser {app} som {name} ({tenant})',
  viewingAsWithoutTenant: 'Du ser {app} som {name}',
  timeLeft: '{time} igjen',
  expired: 'Økten er avsluttet',
  readMode: 'Lesemodus',
  writeMode: 'Endringer er på',
  makeChanges: 'Gjør endringer',
  confirmWrite: 'Endringer du gjør, lagres hos kunden og logges.',
  confirm: 'Slå på',
  cancel: 'Avbryt',
  end: 'Avslutt',
}

/**
 * Supportøkt (SIGN-1547): banneret står fast over headerraden og kan ikke
 * lukkes. Bryteren «Gjør endringer» bekreftes i banneret selv før
 * `support-session-mode` sendes; «Avslutt» sender `support-session-end`.
 * Historien bytter modus lokalt — i appene eier app-core kallet. Se den på
 * 360 px og i mørk modus: teksten brytes, knappene får egen rad.
 */
export const Supportokt: Story = {
  name: 'Supportøkt (banner over headeren)',
  args: { labels, width: 'full', brand: 'sign', locale: 'no', supportSessionLabels: supportLabels },
  render: (args) => ({
    components: { AppHeader, ThemeToggle, AccountIdentityMenu },
    setup() {
      const session = ref({
        userName: 'Kari Hansen',
        tenantName: 'Torsvik Bygg AS',
        appName: 'Nordikode Sign',
        mode: 'READ' as 'READ' | 'WRITE',
        expiresAt: new Date(Date.now() + 23 * 60_000).toISOString(),
      })
      const onMode = (mode: 'READ' | 'WRITE') => {
        session.value = { ...session.value, mode }
      }
      return { args, session, onMode, toggleLabels, accountLabels, services }
    },
    template: `
      <AppHeader v-bind="args" :support-session="session" @support-session-mode="onMode">
        <template #menus>
          <ThemeToggle :labels="toggleLabels" />
          <AccountIdentityMenu name="Kari Hansen" email="kari@example.com" :services="services" :labels="accountLabels" />
        </template>
      </AppHeader>
    `,
  }),
}
