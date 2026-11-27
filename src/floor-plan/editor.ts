/**
 * What it takes to EDIT a floor plan (SIGN-2041): the editor (the plan as it
 * stands, the selection, undo and redo), the work surface with its toolbar,
 * and the fields for what is selected (the measurement field itself is in
 * `fields.ts`).
 *
 * A build entry of its own (`dist/floor-plan/editor.js`) for the same reason
 * as `view.ts`: only the pages that edit download it. Apps import
 * `@nordikode/components/floor-plan`.
 */
export { default as FloorPlanEditorWorkspace } from './FloorPlanEditorWorkspace.vue'
export { default as FloorPlanInspector } from './FloorPlanInspector.vue'
export { default as FloorPlanColorField } from './FloorPlanColorField.vue'

export * from './useFloorPlanEditor'
export * from './floorPlanEditorTexts'
