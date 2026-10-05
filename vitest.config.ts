import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Egen config (ikke vite.config.ts): lib-bygget trekker inn Vuetify-
// pluginen og external-oppsettet, som testene verken trenger eller tåler.
// Vue-pluginen er med for testene som monterer en komponent (bjellens
// tastaturoppførsel, SIGN-1288); de ber selv om DOM med
// `// @vitest-environment happy-dom` øverst i fila.
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.ts'],
    // Dialogtestene (SIGN-846) monterer ekte Vuetify-komponenter; pakka må
    // gjennom Vite så CSS-importene i den ikke stopper Node.
    server: { deps: { inline: ['vuetify'] } },
  },
})
