import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CAMERA_FOV, fitCamera, hexToRgb, type FloorPlan3dBounds, type FloorPlan3dScene } from './floorPlan3d'

/**
 * Tegner 3D-visningen av en plantegning med three.js (SIGN-1981). Fila er
 * det ENESTE stedet appen bruker three, og den lastes først når noen åpner en
 * 3D-visning (`import()` i `FloorPlan3dView`), så biblioteket aldri er med i
 * det appen starter med.
 *
 * Geometrien kommer ferdig regnet fra `floorPlan3d` (rene tall); her blir
 * den flater, lys og kamera. Det tegnes bare når noe har endret seg — ingen
 * løkke som går hele tiden — og alt gis tilbake i `dispose`: flatene,
 * materialene, kontrollene og selve WebGL-konteksten.
 */
export interface FloorPlan3dRenderer {
  /** Bytter ut det som tegnes. Første gang stilles kameraet inn på planen; siden står det der personen har satt det. */
  setScene: (scene: FloorPlan3dScene, background: string) => void
  resize: (width: number, height: number) => void
  /** Snur visningen rundt planen: `azimuth` sidelengs og `polar` opp/ned, i radianer. */
  orbit: (azimuth: number, polar: number) => void
  /** Flytter kameraet nærmere (under 1) eller lenger unna (over 1). */
  zoom: (factor: number) => void
  /** Tilbake til utgangspunktet: hele planen, sett ovenfra på skrå. */
  reset: () => void
  /** A PNG of what the camera sees now (SIGN-2014) — the snapshot «Lag bilde» sends. Rejects when nothing can be drawn. */
  snapshot: () => Promise<Blob>
  dispose: () => void
}

/** Skarpere enn dette tegnes det ikke: over to piksler per punkt koster mer enn det gir. */
const MAX_PIXEL_RATIO = 2
/**
 * The longest side of a snapshot is at least this many pixels (SIGN-2014) —
 * the same as in the Sign app — so a picture asked for on a phone is made
 * from as sharp a source as one asked for on a large screen.
 */
export const SNAPSHOT_MIN_LONG_SIDE = 1536
/** Kameraet går aldri under gulvet. */
const MAX_POLAR = Math.PI / 2 - 0.03
const MIN_POLAR = 0.05

// Lyset: et jevnt grunnlys og ett retningslys ovenfra-forfra. En flate som
// vender opp får til sammen omtrent sin egen farge; vegger som vender bort
// fra lyset blir litt mørkere, så rommene får form. (three regner lys
// fysisk: styrkene er ganget med π.)
const AMBIENT_INTENSITY = Math.PI * 0.62
const SUN_INTENSITY = Math.PI * 0.42

export const createFloorPlan3dRenderer = (canvas: HTMLCanvasElement): FloorPlan3dRenderer => {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO))

  const scene = new Scene()
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 500)
  const ambient = new AmbientLight(0xffffff, AMBIENT_INTENSITY)
  const sun = new DirectionalLight(0xffffff, SUN_INTENSITY)

  sun.position.set(-0.35, 1, 0.45)
  scene.add(ambient, sun)

  const controls = new OrbitControls(camera, canvas)
  // Ingen etterslep: visningen står stille når personen slipper (og tegner ikke i bakgrunnen).
  controls.enableDamping = false
  controls.maxPolarAngle = MAX_POLAR
  controls.minPolarAngle = MIN_POLAR

  let meshes: Mesh<BufferGeometry, MeshLambertMaterial>[] = []
  let bounds: FloorPlan3dBounds | null = null
  let fitted = false
  /** Har personen flyttet kameraet? Da står det, også når visningen får ny størrelse. */
  let moved = false
  let frame = 0
  let disposed = false

  const draw = (): void => {
    frame = 0

    if (!disposed) {
      renderer.render(scene, camera)
    }
  }

  /** Tegn på nytt ved neste bilde — flere ønsker i samme øyeblikk blir ett. */
  const invalidate = (): void => {
    if (frame === 0 && !disposed) {
      frame = window.requestAnimationFrame(draw)
    }
  }

  controls.addEventListener('change', invalidate)
  controls.addEventListener('start', () => {
    moved = true
  })

  const fit = (): void => {
    if (bounds === null) {
      return
    }

    const view = fitCamera(bounds, camera.aspect)
    const reach = Math.hypot(view.position[0] - view.target[0], view.position[1] - view.target[1], view.position[2] - view.target[2])

    camera.position.set(...view.position)
    camera.near = view.near
    camera.far = view.far
    camera.updateProjectionMatrix()
    controls.target.set(...view.target)
    controls.minDistance = reach * 0.15
    controls.maxDistance = reach * 3
    controls.update()
    fitted = true
    moved = false
    invalidate()
  }

  const clear = (): void => {
    for (const mesh of meshes) {
      scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    }

    meshes = []
  }

  return {
    setScene: (next, background) => {
      clear()

      const [red, green, blue] = hexToRgb(background) ?? [1, 1, 1]
      scene.background = new Color().setRGB(red, green, blue, SRGBColorSpace)

      meshes = next.meshes.map((source) => {
        const geometry = new BufferGeometry()

        geometry.setAttribute('position', new BufferAttribute(new Float32Array(source.positions), 3))
        geometry.setIndex(source.indices)
        // Hver firkant har egne punkter, så normalene blir flatens egne: skarpe kanter, flatt lys.
        geometry.computeVertexNormals()

        const translucent = source.opacity < 1
        const material = new MeshLambertMaterial({
          color: new Color().setRGB(source.color[0], source.color[1], source.color[2], SRGBColorSpace),
          // Gulvet og ruta ses fra begge sider; alt annet har forsiden ut.
          side: source.kind === 'floor' || translucent ? DoubleSide : FrontSide,
          transparent: translucent,
          opacity: source.opacity,
          depthWrite: !translucent,
        })
        const mesh = new Mesh(geometry, material)

        // Det gjennomskinnelige tegnes sist.
        mesh.renderOrder = translucent ? 1 : 0
        scene.add(mesh)

        return mesh
      })

      bounds = next.bounds

      // Første gang, eller når det ikke fantes noe å stille inn på: se på hele planen.
      if (!fitted) {
        fit()
      }

      invalidate()
    },
    resize: (width, height) => {
      if (width <= 0 || height <= 0) {
        return
      }

      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()

      // Urørt visning følger størrelsen, så hele planen alltid får plass.
      if (!moved) {
        fit()
      }

      invalidate()
    },
    orbit: (azimuth, polar) => {
      const offset = new Vector3().subVectors(camera.position, controls.target)
      const spherical = new Spherical().setFromVector3(offset)

      spherical.theta += azimuth
      spherical.phi = Math.min(MAX_POLAR, Math.max(MIN_POLAR, spherical.phi + polar))
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      moved = true
      controls.update()
      invalidate()
    },
    zoom: (factor) => {
      const offset = new Vector3().subVectors(camera.position, controls.target)
      const reach = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor))

      camera.position.copy(controls.target).add(offset.setLength(reach))
      moved = true
      controls.update()
      invalidate()
    },
    reset: fit,
    snapshot: () =>
      new Promise<Blob>((resolve, reject) => {
        if (disposed) {
          reject(new Error('The 3D view is closed.'))

          return
        }

        // The browser clears the drawing buffer once a frame is shown, so the
        // picture is read in the same task as it is drawn: `toBlob` copies
        // the pixels when it is called, and only the PNG is made afterwards.
        if (frame !== 0) {
          window.cancelAnimationFrame(frame)
        }

        // A small view (a phone) is drawn sharper for this one frame, and put back at once.
        const ratio = renderer.getPixelRatio()
        const longest = Math.max(canvas.width, canvas.height)
        const sharper = longest > 0 && longest < SNAPSHOT_MIN_LONG_SIDE

        if (sharper) {
          renderer.setPixelRatio((ratio * SNAPSHOT_MIN_LONG_SIDE) / longest)
        }

        draw()
        canvas.toBlob((blob) => {
          if (blob === null) {
            reject(new Error('The 3D view could not be read.'))
          } else {
            resolve(blob)
          }
        }, 'image/png')

        if (sharper) {
          renderer.setPixelRatio(ratio)
          invalidate()
        }
      }),
    dispose: () => {
      disposed = true

      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }

      controls.removeEventListener('change', invalidate)
      controls.dispose()
      clear()
      ambient.dispose()
      sun.dispose()
      renderer.dispose()
      // Konteksten gis tilbake med en gang: nettleseren har bare noen få per side.
      renderer.forceContextLoss()
    },
  }
}
