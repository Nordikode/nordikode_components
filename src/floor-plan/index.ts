/**
 * `@nordikode/components/floor-plan` (SIGN-2041): ONE implementation of the
 * floor plan — the drawing, the editing rules, the geometry, the furniture
 * symbols, the editor and the 3D view — for every app that shows or edits
 * rooms. Floor plans live in Sign and sketches in Sketch; both draw and edit
 * the same room document with what is exported here.
 *
 * The apps own their data: where a plan comes from, how it is saved, who may
 * edit it. The components take the plan and the user's locale, and say what
 * the person did.
 *
 * This file only gathers the parts — the room document (`model.ts`), showing
 * (`view.ts`), the measurement field (`fields.ts`), editing (`editor.ts`) and
 * 3D (`view3d.ts`) — which the build keeps in files of their own under
 * `dist/floor-plan/`, so an app's pages download only the parts they use: an
 * API layer that needs the document's types and `toFloorPlanRoomInput` does
 * not get the drawing. three.js is never part of any of them: the 3D view
 * fetches its renderer the first time it is shown
 * (`floorPlan3dRuntime.loadRenderer`).
 */
export * from './view'
export * from './fields'
export * from './editor'
export * from './view3d'
