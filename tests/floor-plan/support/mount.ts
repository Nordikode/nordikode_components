import { createApp, type Component } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

/**
 * Mounts a floor plan component in happy-dom the way an app does: with
 * Vuetify, and nothing else — the components take the plan and the locale as
 * props and need no store, router or i18n engine.
 */
export const mountWithApp = (component: Component, props: Record<string, unknown>): { el: HTMLElement; unmount: () => void } => {
  const globals = globalThis as Record<string, unknown>

  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globals.visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1280, height: 800 }
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never

  const el = document.createElement('div')
  document.body.appendChild(el)

  const app = createApp(component, props)
  app.use(createVuetify({ components, directives }))
  app.mount(el)

  return {
    el,
    unmount: () => {
      app.unmount()
      el.remove()
    },
  }
}

export const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}
