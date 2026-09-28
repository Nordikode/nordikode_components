import { defineConfig } from 'vitest/config'

// Egen config (ikke vite.config.ts): lib-bygget trekker inn Vuetify-
// pluginen og external-oppsettet, som testene verken trenger eller tåler.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
