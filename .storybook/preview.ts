import { computed, watchEffect } from 'vue'
import { setup } from '@storybook/vue3-vite'
import type { Preview } from '@storybook/vue3-vite'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import type { ThemeDefinition } from 'vuetify'
import {
  buildVuetifyThemes,
  nkFontHref,
  nkProductThemes,
  productCss,
  signTheme,
} from '../src/tokens'

// Alle produkttemaer (light + dark) i én Vuetify-instans; toolbaren bytter.
const themes = Object.values(nkProductThemes).reduce<Record<string, ThemeDefinition>>(
  (acc, theme) => Object.assign(acc, buildVuetifyThemes(theme)),
  {},
)

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: { defaultTheme: signTheme.vuetifyThemeName, themes },
})

setup((app) => {
  app.use(vuetify)
})

// Inter — samme font som appene (fase 1-beslutningen: Inter overalt).
const fontLink = document.createElement('link')
fontLink.rel = 'stylesheet'
fontLink.href = nkFontHref
document.head.appendChild(fontLink)

const preview: Preview = {
  globalTypes: {
    produkt: {
      description: 'Produkttema',
      toolbar: {
        title: 'Produkt',
        icon: 'paintbrush',
        items: [
          { value: 'sign', title: 'Sign' },
          { value: 'time', title: 'Time' },
          { value: 'portal', title: 'Portal' },
          { value: 'backoffice', title: 'Backoffice' },
        ],
        dynamicTitle: true,
      },
    },
    modus: {
      description: 'Fargemodus',
      toolbar: {
        title: 'Modus',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    produkt: 'sign',
    modus: 'light',
  },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        const product = computed(
          () => nkProductThemes[String(context.globals.produkt ?? 'sign')] ?? signTheme,
        )
        const dark = computed(() => context.globals.modus === 'dark')
        const themeName = computed(() =>
          dark.value ? `${product.value.vuetifyThemeName}Dark` : product.value.vuetifyThemeName,
        )
        // Speil appene: --nk-*-variabler i :root og nk-dark-klassen, slik at
        // komponenter som leser CSS-variabler oppfører seg som i appene.
        watchEffect(() => {
          document.documentElement.classList.toggle('nk-dark', dark.value)
          let styleEl = document.getElementById('nk-tokens-css')
          if (!styleEl) {
            styleEl = document.createElement('style')
            styleEl.id = 'nk-tokens-css'
            document.head.appendChild(styleEl)
          }
          styleEl.textContent = productCss(product.value)
        })
        return { themeName }
      },
      template: `
        <v-app :theme="themeName">
          <v-main style="padding: 24px; font-family: var(--nk-font-family);">
            <story />
          </v-main>
        </v-app>
      `,
    }),
  ],
  parameters: {
    controls: { expanded: true },
    options: {
      storySort: {
        order: ['Design system', ['Velkommen', 'Tokens', 'Språk'], 'Komponenter'],
      },
    },
  },
}

export default preview
