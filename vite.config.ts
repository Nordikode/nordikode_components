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
        // Bjellen alene (SIGN-1295): nettsiden laster den bare for innloggede.
        bell: resolve(__dirname, 'src/web/bell.ts'),
        // Plantegningen (SIGN-2041): tegningen, redigeringen og 3D-visningen,
        // delt av Sign og Sketch. Appene importerer bare `floor-plan`; delene
        // er egne filer i bygget, så en side som bare viser en tegning
        // (kundens tilbud, utskriften) ikke laster ned redigeringen og 3D.
        // Alt som hører til plantegningen havner under `dist/floor-plan/`
        // (se `chunkFileNames` under), så appene kan kjenne det igjen.
        'floor-plan': resolve(__dirname, 'src/floor-plan/index.ts'),
        // Romdokumentet alene: appenes API-lag bruker typene og
        // `toFloorPlanRoomInput` fra første side, og skal ikke få med
        // tegningen og reglene for det.
        'floor-plan/model': resolve(__dirname, 'src/floor-plan/model.ts'),
        'floor-plan/view': resolve(__dirname, 'src/floor-plan/view.ts'),
        'floor-plan/fields': resolve(__dirname, 'src/floor-plan/fields.ts'),
        'floor-plan/editor': resolve(__dirname, 'src/floor-plan/editor.ts'),
        'floor-plan/view3d': resolve(__dirname, 'src/floor-plan/view3d.ts'),
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
      // three.js (3D-visningen av plantegninger) er appens egen avhengighet og
      // lastes først når en 3D-visning åpnes — aldri bundlet inn her.
      external: ['vue', 'vuetify', /^vuetify\//, /^libphonenumber-js/, '@stripe/stripe-js', 'three', /^three\//],
      output: {
        // Delte filer som bare inneholder plantegningskode legges i
        // `dist/floor-plan/`. Appene samler ellers alt fra `node_modules` i én
        // leverandørfil (`manualChunks`); med en fast mappe kan de unnta
        // plantegningen, så den deles opp etter hvilke sider som bruker den —
        // og tegneren som henter three.js forblir en fil som lastes ved behov.
        chunkFileNames: (chunk) =>
          chunk.moduleIds.length > 0 && chunk.moduleIds.every((id) => id.includes('/src/floor-plan/'))
            ? 'floor-plan/[name]-[hash].js'
            : '[name]-[hash].js',
        globals: {
          vue: 'Vue',
          vuetify: 'Vuetify',
        },
      },
    },
  },
})
