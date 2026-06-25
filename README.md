# `@nordikode/components`

Shared Vue 3 + Vuetify components for Nordikode applications.

## Purpose

This package is the shared UI component source for Nordikode frontend applications.
Start small, keep APIs stable, and grow the library component by component instead of copying UI between repos.

## Current exports

- `IdentityAvatar`
- `UserIdentityMenu`

## Local development

For immediate local changes without committing a `file:` dependency into app repos, use `npm link`:

```bash
cd frontend/nordikode_components
npm link

cd ../sign-web
npm link @nordikode/components
```

Import styles once in the consuming app:

```ts
import '@nordikode/components/style.css'
```
