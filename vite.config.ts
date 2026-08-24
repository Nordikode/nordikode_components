import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        tokens: resolve(__dirname, 'src/tokens/index.ts'),
        // Vuetify-fri entry for webflatene (nettside/konto-app) — se src/web/.
        web: resolve(__dirname, 'src/web/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: 'index',
    },
    rollupOptions: {
      // NB: regexen må med — `'vuetify'` alene matcher ikke subpaths som
      // `vuetify/components` og `vuetify/lib/**/*.css`, og da bundles hele
      // Vuetify (JS + kompilert CSS med default-settings) inn i pakka.
      // Appene eier Vuetify-oppsettet (inkl. vuetify-settings.scss).
      external: ['vue', 'vuetify', /^vuetify\//, /^libphonenumber-js/],
      output: {
        globals: {
          vue: 'Vue',
          vuetify: 'Vuetify',
        },
      },
    },
  },
})
