/**
 * What it takes to show a floor plan in 3D (SIGN-2041): the scene built from
 * the plan's own numbers, and the view that draws it.
 *
 * A build entry of its own (`dist/floor-plan/view3d.js`) for the same reason as
 * `view.ts`: only the pages that offer a 3D view download it. Apps import
 * `@nordikode/components/floor-plan`.
 *
 * three.js is not part of this file either: the view fetches its renderer
 * the first time it is shown (`floorPlan3dRuntime.loadRenderer`).
 */
export { default as FloorPlan3dView } from './FloorPlan3dView.vue'

export * from './floorPlan3d'
export * from './floorPlan3dTexts'
export { floorPlan3dRuntime } from './floorPlan3dRuntime'
export { isWebGlAvailable } from './webgl'
export type { FloorPlan3dRenderer } from './floorPlan3dRenderer'
