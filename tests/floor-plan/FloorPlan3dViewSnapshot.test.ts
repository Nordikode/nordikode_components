// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, ref, type Ref } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import FloorPlan3dView from '../../src/floor-plan/FloorPlan3dView.vue'
import { ILLUSTRATION_3D_BACKGROUND, ILLUSTRATION_3D_TONES, buildFloorPlan3d, type FloorPlan3dScene } from '../../src/floor-plan/floorPlan3d'
import { sketchMarks3d } from '../../src/floor-plan/sketchMarks'
import { flush } from './support/mount'
import { sketch } from './support/sketchFixture'

// The snapshot «Make picture» sends (SIGN-2014): what the camera sees now —
// the rooms as they are, from the angle the person has set — but never with
// the marks of what the sketch has changed, and always in light tones on a
// white ground, also when the app is dark. The picture is made from what the
// snapshot shows: the ghost of a wall that is gone would be drawn as a wall.
// happy-dom has no WebGL, so the renderer is replaced here.

interface FakeRenderer {
  setScene: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  snapshot: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

const three = vi.hoisted(() => ({ webgl: true, renderers: [] as unknown[], blob: null as Blob | null }))

vi.mock('../../src/floor-plan/webgl', () => ({ isWebGlAvailable: () => three.webgl }))

vi.mock('../../src/floor-plan/floorPlan3dRenderer', () => ({
  createFloorPlan3dRenderer: () => {
    const renderer = {
      setScene: vi.fn(),
      resize: vi.fn(),
      orbit: vi.fn(),
      zoom: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      snapshot: vi.fn(async () => {
        if (three.blob === null) {
          throw new Error('The 3D view could not be read.')
        }

        return three.blob
      }),
    }
    three.renderers.push(renderer)

    return renderer
  },
}))

type View = { snapshot: () => Promise<Blob | null>; status: string }

const mount = async (dark: boolean, marked = true) => {
  const view: Ref<View | null> = ref(null)
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: dark ? 'dark' : 'light',
      themes: {
        light: { dark: false, colors: { surface: '#ffffff', 'on-surface': '#0d1c26', success: '#5b7423', error: '#b4392b' } },
        dark: { dark: true, colors: { surface: '#12161a', 'on-surface': '#e6e9ee', success: '#bfd75b', error: '#e0705f' } },
      },
    },
  })
  const current = sketch()
  const el = document.createElement('div')
  document.body.appendChild(el)

  const app = createApp({
    render: () => h(FloorPlan3dView, { ref: view, plan: { rooms: current.rooms }, label: '3D', locale: 'no', marks: marked ? sketchMarks3d(current) : null }),
  })
  app.use(vuetify)
  app.mount(el)
  await flush()
  await flush()

  return {
    view: view.value as View,
    renderer: three.renderers[three.renderers.length - 1] as FakeRenderer | undefined,
    current,
    unmount: () => {
      app.unmount()
      el.remove()
    },
  }
}

const hasGhosts = (scene: FloorPlan3dScene): boolean => scene.meshes.some((mesh) => mesh.kind === 'ghost')

describe('FloorPlan3dView: snapshot (SIGN-2014)', () => {
  beforeEach(() => {
    three.webgl = true
    three.renderers.length = 0
    three.blob = new Blob(['png'], { type: 'image/png' })
  })

  it('is taken of the rooms without the marks, in light tones on a white ground — and the view is put back as it was', async () => {
    const { view, renderer, current, unmount } = await mount(false)

    // What the person looks at: the sketch with the removed walls as ghosts.
    expect(hasGhosts(renderer!.setScene.mock.calls[0][0])).toBe(true)

    const blob = await view.snapshot()
    const calls = renderer!.setScene.mock.calls

    expect(blob).toBe(three.blob)
    expect(calls).toHaveLength(3)
    // The scene the picture is read from: exactly the rooms, in the tones of the illustration.
    expect(calls[1][0]).toEqual(buildFloorPlan3d({ rooms: current.rooms }, ILLUSTRATION_3D_TONES))
    expect(calls[1][1]).toBe(ILLUSTRATION_3D_BACKGROUND)
    expect(hasGhosts(calls[1][0])).toBe(false)
    // The picture is read after that scene is set, and before the view is put back.
    expect(renderer!.snapshot.mock.invocationCallOrder[0]).toBeGreaterThan(renderer!.setScene.mock.invocationCallOrder[1])
    expect(renderer!.snapshot.mock.invocationCallOrder[0]).toBeLessThan(renderer!.setScene.mock.invocationCallOrder[2])
    // Back to what the person was looking at.
    expect(calls[2]).toEqual(calls[0])
    unmount()
  })

  it('is light also when the app is dark', async () => {
    const { view, renderer, unmount } = await mount(true)

    // The view itself is drawn on the dark surface…
    expect(renderer!.setScene.mock.calls[0][1]).toBe('#12161a')

    await view.snapshot()

    const [scene, background] = renderer!.setScene.mock.calls[1]

    // …but the picture is read from the light scene on white: the same one as in a light app.
    expect(background).toBe('#ffffff')
    expect(scene).toEqual(buildFloorPlan3d({ rooms: sketch().rooms }, ILLUSTRATION_3D_TONES))
    // …and the dark view comes back.
    expect(renderer!.setScene.mock.calls[2][1]).toBe('#12161a')
    unmount()
  })

  it('is taken the same way of a view without marks', async () => {
    const { view, renderer, unmount } = await mount(true, false)

    await view.snapshot()

    expect(renderer!.setScene.mock.calls[1][1]).toBe('#ffffff')
    expect(renderer!.setScene.mock.calls).toHaveLength(3)
    unmount()
  })

  it('gives nothing when the picture could not be read, and puts the view back all the same', async () => {
    three.blob = null

    const { view, renderer, unmount } = await mount(false)

    expect(await view.snapshot()).toBeNull()
    expect(renderer!.setScene.mock.calls).toHaveLength(3)
    expect(hasGhosts(renderer!.setScene.mock.calls[2][0])).toBe(true)
    unmount()
  })

  it('gives nothing when the view does not draw', async () => {
    three.webgl = false

    const { view, renderer, unmount } = await mount(false)

    expect(view.status).toBe('unavailable')
    expect(await view.snapshot()).toBeNull()
    expect(renderer).toBeUndefined()
    unmount()
  })
})
