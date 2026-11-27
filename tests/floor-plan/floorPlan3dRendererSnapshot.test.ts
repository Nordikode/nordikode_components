// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The renderer's own snapshot (SIGN-2014). The browser clears the drawing
// buffer once a frame is shown, so the picture is read in the same task as
// it is drawn: draw, then `toBlob` at once. happy-dom has no WebGL, so three
// is replaced by the few things the renderer touches.

const log = vi.hoisted(() => ({ events: [] as string[], ratio: 1 }))

vi.mock('three', () => {
  class Vector3 {
    x = 0
    y = 0
    z = 0
    set(): this {
      return this
    }
    copy(): this {
      return this
    }
    add(): this {
      return this
    }
    subVectors(): this {
      return this
    }
    setFromSpherical(): this {
      return this
    }
    setLength(): this {
      return this
    }
    length(): number {
      return 1
    }
  }

  class Scene {
    background: unknown = null
    add(): void {}
    remove(): void {}
  }

  class Light {
    position = new Vector3()
    dispose(): void {}
  }

  class WebGLRenderer {
    getPixelRatio(): number {
      return log.ratio
    }
    setPixelRatio(ratio: number): void {
      log.ratio = ratio
      log.events.push(`ratio:${Math.round(ratio * 100) / 100}`)
    }
    setSize(): void {}
    render(): void {
      log.events.push('render')
    }
    dispose(): void {}
    forceContextLoss(): void {}
  }

  class PerspectiveCamera {
    position = new Vector3()
    aspect = 1
    near = 0.1
    far = 500
    updateProjectionMatrix(): void {}
  }

  class Color {
    setRGB(): this {
      return this
    }
  }

  class Disposable {
    dispose(): void {}
    setAttribute(): void {}
    setIndex(): void {}
    computeVertexNormals(): void {}
  }

  return {
    AmbientLight: Light,
    DirectionalLight: Light,
    BufferAttribute: class {},
    BufferGeometry: Disposable,
    Color,
    DoubleSide: 2,
    FrontSide: 0,
    Mesh: class {
      renderOrder = 0
      geometry: unknown
      material: unknown

      constructor(geometry: unknown, material: unknown) {
        this.geometry = geometry
        this.material = material
      }
    },
    MeshLambertMaterial: Disposable,
    PerspectiveCamera,
    SRGBColorSpace: 'srgb',
    Scene,
    Spherical: class {
      theta = 0
      phi = 1
      setFromVector3(): this {
        return this
      }
    },
    Vector3,
    WebGLRenderer,
  }
})

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    target = { set: () => {} }
    enableDamping = false
    maxPolarAngle = 0
    minPolarAngle = 0
    minDistance = 0
    maxDistance = 0
    addEventListener(): void {}
    removeEventListener(): void {}
    update(): void {}
    dispose(): void {}
  },
}))

import { buildFloorPlan3d } from '../../src/floor-plan/floorPlan3d'
import { createFloorPlan3dRenderer } from '../../src/floor-plan/floorPlan3dRenderer'
import { floorPlan } from './support/floorPlanFixture'

const canvasThatGives = (blob: Blob | null, size: { width: number; height: number } = { width: 2200, height: 1040 }): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')

  canvas.width = size.width
  canvas.height = size.height

  canvas.toBlob = ((done: BlobCallback, type?: string) => {
    log.events.push(`toBlob:${type}`)
    done(blob)
  }) as HTMLCanvasElement['toBlob']

  return canvas
}

describe('floorPlan3dRenderer: snapshot (SIGN-2014)', () => {
  beforeEach(() => {
    log.events.length = 0
    log.ratio = 1
  })

  it('draws and reads the picture in the same task, as a PNG', async () => {
    const png = new Blob(['png'], { type: 'image/png' })
    const renderer = createFloorPlan3dRenderer(canvasThatGives(png))

    renderer.setScene(buildFloorPlan3d(floorPlan()), '#ffffff')
    log.events.length = 0

    const pending = renderer.snapshot()

    // Before anything else gets to run: the frame is drawn, and the pixels are handed over.
    expect(log.events).toEqual(['render', 'toBlob:image/png'])
    expect(await pending).toBe(png)
    renderer.dispose()
  })

  it('does not draw the frame that was waiting once more', async () => {
    const frames: FrameRequestCallback[] = []
    const cancelled: number[] = []
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback))
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      cancelled.push(id)
    })

    const renderer = createFloorPlan3dRenderer(canvasThatGives(new Blob(['png'])))

    // Setting the scene asks for a frame; the snapshot draws at once and takes that frame's place.
    renderer.setScene(buildFloorPlan3d(floorPlan()), '#ffffff')
    expect(frames).toHaveLength(1)

    await renderer.snapshot()

    expect(cancelled).toEqual([1])
    expect(log.events.filter((event) => event === 'render')).toHaveLength(1)

    request.mockRestore()
    cancel.mockRestore()
    renderer.dispose()
  })

  it('a small view is drawn sharper for the snapshot — the longest side at least 1536 pixels — and put back at once', async () => {
    // A phone: 390 points wide at two pixels per point.
    const renderer = createFloorPlan3dRenderer(canvasThatGives(new Blob(['png']), { width: 768, height: 480 }))

    log.ratio = 2
    log.events.length = 0

    await renderer.snapshot()

    // Twice as sharp (768 → 1536) while the frame is drawn and read; then as before.
    expect(log.events).toEqual(['ratio:4', 'render', 'toBlob:image/png', 'ratio:2'])
    renderer.dispose()
  })

  it('a large view is read as it is', async () => {
    const renderer = createFloorPlan3dRenderer(canvasThatGives(new Blob(['png']), { width: 2200, height: 1040 }))

    log.events.length = 0
    await renderer.snapshot()

    expect(log.events).toEqual(['render', 'toBlob:image/png'])
    renderer.dispose()
  })

  it('rejects when the canvas gives no picture', async () => {
    const renderer = createFloorPlan3dRenderer(canvasThatGives(null))

    await expect(renderer.snapshot()).rejects.toThrow('could not be read')
    renderer.dispose()
  })

  it('rejects when the view is closed, without drawing', async () => {
    const renderer = createFloorPlan3dRenderer(canvasThatGives(new Blob(['png'])))

    renderer.dispose()
    log.events.length = 0

    await expect(renderer.snapshot()).rejects.toThrow('closed')
    expect(log.events).toEqual([])
  })
})
