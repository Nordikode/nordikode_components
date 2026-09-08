declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// Side-effect-import av stilark (web/theme.css) — Vite bundler dem inn i dist/index.css.
declare module '*.css'
