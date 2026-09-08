declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

export { default as IdentityAvatar } from './components/IdentityAvatar.vue'
export { default as PhoneNumberInput } from './components/PhoneNumberInput.vue'

export type { SharedLocale } from './types/SharedLocale'
