# Contributing Guide

## Purpose of This Repository

`@nordikode/components` is the shared UI component library for Nordikode applications.
Its job is to provide cross-product components that behave the same way everywhere, so users recognize patterns immediately and teams do not duplicate UI logic across repositories.

This repository is not a staging area for "maybe reusable later" code.
A component belongs here only when it is already proven to be product-agnostic and should stay behaviorally consistent across applications.

## Core Contract

Shared components in this repository must be:

1. Product-agnostic in naming, API design, and behavior.
2. Stable enough that multiple applications can depend on them without local forks.
3. Responsible for the shared interaction contract when the behavior must be identical across apps.
4. Small, explicit, and maintainable.

If a component is meant to feel identical to users across products, the shared repository should own both the presentation and the standard interaction model.

Example:

- The shared user menu must expose the same actions in every app.
- The "Edit profile" action must take the user to the Portal account page from any app.
- The menu labels and their ordering must not be redefined per application unless the shared contract is intentionally changed here first.
- Authenticated top headers that share the same brand slot, company selector, and user menu contract belong here rather than being reimplemented per app.
- Breadcrumb rendering, spacing, and back-button presentation that should feel identical across apps belong here, while each app may still own its route/back decision logic.

## Admission Rules for New Components

A component may be added to this repository only if all of the following are true:

1. It solves the same user-facing problem in more than one application, or it is being introduced specifically to become the shared source of truth for that pattern.
2. Its API can be described without product-specific terms, data models, or route names.
3. Its logic does not depend on one app's local store, router, feature flags, or translation files.
4. It can express necessary variation through small, durable inputs instead of app-specific branching.
5. Moving it here reduces duplication and future maintenance cost instead of merely relocating complexity.

Do not move a component here if it still needs:

- direct imports from a consuming application's router or store
- product-specific copy owned by one app
- app-specific business rules hidden behind generic prop names
- multiple override props just to preserve conflicting app behaviors

If those are needed, the component is not generic enough yet.

## Behavioral Ownership

When a component represents a shared product pattern, the library owns:

- structure
- visual presentation
- default labels
- interaction flow
- event semantics

Consuming apps should only provide:

- user or domain data
- environment-specific URLs or identifiers
- source-app context when a shared flow should return the user to the originating app
- callbacks for app-owned side effects such as logout

Consuming apps should not redefine standard menu items, reorder canonical actions, or replace shared UX copy unless the repository contract is updated here first.

## API Design Rules

1. Prefer explicit props over broad configuration objects.
2. Prefer semantic events such as `logout` over exposing internal UI implementation details.
3. Avoid over-engineering for hypothetical use cases.
4. Add extension points only when a real second use case exists.
5. Keep components composable, but do not make them so abstract that the shared UX contract disappears.

## Styling Rules

1. Shared styling must align with Nordikode's established visual language.
2. Components should rely on consumer theme tokens where appropriate, but should not require each app to restyle the component to make it usable.
3. Do not ship patterns that encourage inconsistent app-level overrides of the same shared surface.

## Internationalization Rules

If component copy is part of a shared interaction contract, the component library should own that copy.

Shared components must not depend on translation files from consuming apps.
Instead, they should expose a stable locale input and keep their own internal translations for shared strings.

## Change Process

Before changing a shared component:

1. Confirm the change is truly cross-product.
2. Validate that the behavior should remain identical everywhere.
3. Update this file if the shared contract changes.
4. Update consuming applications in the same change set whenever the API changes.

## Anti-Patterns

Do not:

- copy app-specific components into this repo unchanged
- add hooks for every imagined future variant
- move components here just because they look similar
- make consumer apps responsible for rebuilding a shared interaction contract
- hide business logic differences behind "generic" props

The goal is one shared truth, not one more layer of indirection.
