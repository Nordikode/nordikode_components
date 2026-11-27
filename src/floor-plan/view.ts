/**
 * What it takes to SHOW a floor plan (SIGN-2041): the room document, the
 * geometry and the editing rules the drawing reads, the furniture symbols,
 * the marks of a sketch and the drawing itself.
 *
 * This file is a build entry of its own (`dist/floor-plan/view.js`), though
 * apps only import `@nordikode/components/floor-plan`: the build then keeps
 * the drawing in a file apart from the editor and the 3D view, so a page that
 * only shows a drawing — the customer's offer, a printed PDF — does not
 * download the rest.
 */
export { default as FloorPlanDrawing } from './FloorPlanDrawing.vue'

export * from './model'
export * from './floorPlanGeometry'
export * from './floorPlanCeiling'
export * from './floorPlanEditing'
export * from './floorPlanFurniture'
export * from './floorPlanColors'
export * from './sketchMarks'
export * from './measurements'
export * from './floorPlanNames'
export { fillFloorPlanText } from './textFiles'
