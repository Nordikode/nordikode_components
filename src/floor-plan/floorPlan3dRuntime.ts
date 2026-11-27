import type { createFloorPlan3dRenderer } from './floorPlan3dRenderer'
import { isWebGlAvailable } from './webgl'

/**
 * What the 3D view needs from the browser (SIGN-2041): the answer to «can
 * this browser draw with WebGL?», and the renderer — three.js — which is
 * fetched the first time a 3D view is opened and is never part of what an
 * app starts with.
 *
 * The two are gathered in one object so an app's tests can replace them
 * (`vi.spyOn(floorPlan3dRuntime, 'loadRenderer')`): a test browser has no
 * WebGL, and the renderer is a chunk inside this package that a test cannot
 * reach by path. Nothing else should write to it.
 */
export const floorPlan3dRuntime = {
  isWebGlAvailable,
  /** Fetches the renderer and, with it, three.js. */
  loadRenderer: async (): Promise<typeof createFloorPlan3dRenderer> => (await import('./floorPlan3dRenderer')).createFloorPlan3dRenderer,
}
