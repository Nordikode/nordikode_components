import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|js)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  // Komposisjon: appenes egne Storybooks vises som seksjoner her, slik at
  // hele komponentbiblioteket har ett UI. Kjør appens Storybook ved siden av
  // (`npm run storybook` i app-repoet) — seksjonen vises som utilgjengelig
  // når den ikke kjører.
  refs: {
    'sign-web': {
      title: 'Sign (app)',
      url: 'http://localhost:6007',
    },
  },
}

export default config
