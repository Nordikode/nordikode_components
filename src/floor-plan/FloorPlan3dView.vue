<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useTheme } from 'vuetify'
import type { FloorPlanDocument } from './model'
import {
  DEFAULT_3D_TONES,
  ILLUSTRATION_3D_BACKGROUND,
  ILLUSTRATION_3D_TONES,
  buildFloorPlan3d,
  mixHex,
  type FloorPlan3dMarks,
  type FloorPlan3dTones,
} from './floorPlan3d'
import type { FloorPlan3dRenderer } from './floorPlan3dRenderer'
import { floorPlan3dRuntime } from './floorPlan3dRuntime'
import { floorPlan3dTexts } from './floorPlan3dTexts'

/**
 * 3D-visningen av en plantegning (SIGN-1981): rommene sett ovenfra på skrå,
 * som et dukkehus uten tak, bygd av planens egne data — så den alltid
 * stemmer med det som er redigert. Dra for å snu, rull eller knip for å
 * zoome, høyreklikk-dra (eller to fingre) for å flytte; piltastene snur,
 * + og − zoomer, og Home eller 0 setter visningen tilbake.
 *
 * Geometrien regnes i `floorPlan3d` (rene tall). Tegningen gjøres av
 * three.js, som lastes først når en 3D-visning åpnes (`floorPlan3dRuntime`) —
 * biblioteket er aldri med i det appen starter med. Uten WebGL sier
 * visningen det, uten å hente biblioteket.
 *
 * Fargene er planens egne der personen har valgt; ellers tonene fra temaet,
 * lest på nytt når temaet byttes. Endres planen (en annen lagrer den),
 * bygges scenen på nytt, og kameraet står der personen har satt det.
 * Ingenting beveger seg av seg selv, så det er ingenting å dempe for
 * `prefers-reduced-motion`.
 *
 * SIGN-2014: `marks` shows what a sketch has changed — what is new is tinted
 * with the success tone, and the walls and objects that are gone stand as
 * translucent ghosts in the error tone. `snapshot()` gives a PNG of what the
 * camera sees now, WITHOUT the marks and always in light tones, whatever the
 * theme: the picture «Lag bilde» is made from shows the rooms as they will
 * be, not how they were changed.
 */
const props = withDefaults(
  defineProps<{
    plan: FloorPlanDocument
    /** Navnet for skjermlesere: hva som vises (planens navn og antall rom). */
    label: string
    /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the view's own texts. */
    locale: string
    /** What a sketch has changed (SIGN-2014). Without it nothing is marked. */
    marks?: FloorPlan3dMarks | null
  }>(),
  { marks: null },
)

const text = computed(() => floorPlan3dTexts(props.locale))
const theme = useTheme()

/** Ett trykk på en piltast snur så mye, og ett trykk på + eller − zoomer så mye. */
const ORBIT_STEP = Math.PI / 24
const ZOOM_STEP = 0.88

type Status = 'loading' | 'ready' | 'unavailable' | 'error'

const status = ref<Status>('loading')
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const renderer = shallowRef<FloorPlan3dRenderer | null>(null)
let observer: ResizeObserver | null = null
let unmounted = false

/** En temafarge som `#rrggbb`; temaet kan i prinsippet bære andre former, og da gjelder reserven. */
const themeColor = (name: string, fallback: string): string => {
  const value: unknown = theme.current.value.colors[name]

  if (typeof value !== 'string') {
    return fallback
  }

  // Kortformen `#abc` er `#aabbcc`.
  const full = /^#[0-9a-f]{3}$/i.test(value) ? `#${[...value.slice(1)].map((digit) => digit + digit).join('')}` : value

  return /^#[0-9a-f]{6}$/i.test(full) ? full.toLowerCase() : fallback
}

/** Kortflaten visningen står på, og tonene som gjelder der personen ikke har valgt farge. */
const surface = computed(() => themeColor('surface', '#ffffff'))

const tones = computed<FloorPlan3dTones>(() => {
  const ink = themeColor('on-surface', '')

  if (ink === '') {
    return DEFAULT_3D_TONES
  }

  return {
    // Gulvet som i plantegningen: kortflaten med et dryss blekk. Veggene litt
    // mørkere, inventaret mørkere igjen, og ruta et røykfarget glass.
    floor: mixHex(surface.value, ink, 0.08),
    wall: mixHex(surface.value, ink, 0.2),
    object: mixHex(surface.value, ink, 0.42),
    pane: mixHex(surface.value, ink, 0.55),
    // Inventarets lyse deler (porselen, madrass, puter) ligger nær kortflaten, de mørke (skjerm, glass, sokkel) nær blekket.
    objectSoft: mixHex(surface.value, ink, 0.28),
    objectStrong: mixHex(surface.value, ink, 0.66),
    // The marks of a sketch: the theme's own tones for «done» and «error».
    added: themeColor('success', ''),
    removed: themeColor('error', ''),
  }
})

const scene = computed(() => buildFloorPlan3d(props.plan, tones.value, { marks: props.marks }))

const show = (): void => {
  renderer.value?.setScene(scene.value, surface.value)
}

const fitToStage = (): void => {
  const element = stage.value

  if (element !== null) {
    renderer.value?.resize(element.clientWidth, element.clientHeight)
  }
}

const start = async (): Promise<void> => {
  status.value = 'loading'

  // Uten WebGL hentes ikke biblioteket: visningen sier fra med en gang.
  if (!floorPlan3dRuntime.isWebGlAvailable()) {
    status.value = 'unavailable'

    return
  }

  let create: Awaited<ReturnType<typeof floorPlan3dRuntime.loadRenderer>>

  try {
    // three.js lastes her, første gang en 3D-visning åpnes.
    create = await floorPlan3dRuntime.loadRenderer()
  } catch {
    status.value = 'error'

    return
  }

  if (unmounted || canvas.value === null) {
    return
  }

  try {
    renderer.value = create(canvas.value)
  } catch {
    // Nettleseren sa ja til WebGL, men ga ingen kontekst likevel (for mange åpne, eller slått av).
    status.value = 'unavailable'

    return
  }

  fitToStage()
  show()
  status.value = 'ready'

  if (typeof ResizeObserver !== 'undefined' && stage.value !== null) {
    observer = new ResizeObserver(fitToStage)
    observer.observe(stage.value)
  }
}

onMounted(() => void start())

// Planen er endret (lagret av en annen, eller redigert), eller temaet er
// byttet: scenen bygges på nytt. Kameraet står.
watch(scene, show)

onBeforeUnmount(() => {
  unmounted = true
  observer?.disconnect()
  renderer.value?.dispose()
  renderer.value = null
})

const reset = (): void => {
  renderer.value?.reset()
}

/**
 * A PNG of what the camera sees now: the rooms as they are, from the angle
 * the person has set — without the marks, and in light tones on a white
 * ground also when the app is dark. Null when the view is not drawing (still
 * loading, no WebGL) or the picture could not be read.
 */
const snapshot = async (): Promise<Blob | null> => {
  const view = renderer.value

  if (view === null || status.value !== 'ready') {
    return null
  }

  try {
    view.setScene(buildFloorPlan3d(props.plan, ILLUSTRATION_3D_TONES), ILLUSTRATION_3D_BACKGROUND)

    return await view.snapshot()
  } catch {
    return null
  } finally {
    // What the person looks at comes back: the theme's tones and the marks.
    if (renderer.value === view) {
      show()
    }
  }
}

defineExpose({ snapshot, status })

const onKeydown = (event: KeyboardEvent): void => {
  const view = renderer.value

  if (view === null || event.altKey || event.ctrlKey || event.metaKey) {
    return
  }

  switch (event.key) {
    case 'ArrowLeft':
      view.orbit(-ORBIT_STEP, 0)
      break
    case 'ArrowRight':
      view.orbit(ORBIT_STEP, 0)
      break
    case 'ArrowUp':
      view.orbit(0, -ORBIT_STEP)
      break
    case 'ArrowDown':
      view.orbit(0, ORBIT_STEP)
      break
    case '+':
    case '=':
      view.zoom(ZOOM_STEP)
      break
    case '-':
    case '−':
      view.zoom(1 / ZOOM_STEP)
      break
    case 'Home':
    case '0':
      view.reset()
      break
    default:
      return
  }

  // Tasten er brukt: siden ruller ikke.
  event.preventDefault()
}

// Bare en visning som tegner, lytter på tastaturet.
const listeners = computed(() => (status.value === 'ready' ? { keydown: onKeydown } : {}))
</script>

<template>
  <div class="plan-3d" data-testid="floor-plan-3d" :data-status="status">
    <p v-if="status === 'unavailable'" class="plan-3d-message" data-testid="floor-plan-3d-unavailable" role="status">
      {{ text.unavailable }}
    </p>

    <div v-else-if="status === 'error'" class="plan-3d-message" data-testid="floor-plan-3d-error" role="alert">
      <p>{{ text.loadError }}</p>
      <v-btn size="small" variant="outlined" @click="start">{{ text.retry }}</v-btn>
    </div>

    <template v-else>
      <!-- Visningen er ett bilde med navn; tegneflaten under er bare piksler. -->
      <div
        ref="stage"
        :aria-busy="status === 'loading'"
        :aria-label="label"
        class="plan-3d-stage"
        role="img"
        :tabindex="status === 'ready' ? 0 : undefined"
        v-on="listeners"
      >
        <canvas ref="canvas" aria-hidden="true" class="plan-3d-canvas" />
        <div v-if="status === 'loading'" class="plan-3d-loading" data-testid="floor-plan-3d-loading">
          <v-progress-circular color="primary" indeterminate size="18" width="2" />
          <span>{{ text.loading }}</span>
        </div>
      </div>

      <div class="plan-3d-foot">
        <p class="plan-3d-hint">{{ text.hint }} {{ text.keyboardHint }}</p>
        <v-btn
          class="plan-3d-reset"
          data-testid="floor-plan-3d-reset"
          :disabled="status !== 'ready'"
          prepend-icon="mdi-restore"
          size="small"
          variant="text"
          @click="reset"
        >
          {{ text.reset }}
        </v-btn>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plan-3d {
  display: flex;
  flex-direction: column;
  gap: var(--nk-space-unit);
  min-width: 0;
}

/* Flaten visningen tegnes på: kortets egen farge, like høy som plantegningen
   får bli, og aldri høyere enn skjermen har plass til. */
.plan-3d-stage {
  background: rgb(var(--v-theme-surface));
  border-radius: var(--nk-radius-md);
  cursor: grab;
  height: min(520px, 62vh);
  min-height: 240px;
  overflow: hidden;
  position: relative;
  /* Fingeren snur og zoomer visningen; siden ruller ikke under den. */
  touch-action: none;
  width: 100%;
}

.plan-3d-stage:active {
  cursor: grabbing;
}

.plan-3d-stage:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.plan-3d-canvas {
  display: block;
  height: 100%;
  width: 100%;
}

.plan-3d-loading {
  align-items: center;
  color: var(--nk-text-secondary);
  display: flex;
  font-size: 0.9rem;
  gap: var(--nk-space-unit);
  inset: 0;
  justify-content: center;
  position: absolute;
}

.plan-3d-message {
  align-items: center;
  color: var(--nk-text-secondary);
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  gap: var(--nk-space-unit);
  margin: 0;
  padding: calc(var(--nk-space-unit) * 5) calc(var(--nk-space-unit) * 2);
  text-align: center;
}

.plan-3d-message p {
  margin: 0;
}

.plan-3d-foot {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) / 2) calc(var(--nk-space-unit) * 2);
  justify-content: space-between;
}

.plan-3d-hint {
  color: var(--nk-text-secondary);
  font-size: 0.8rem;
  margin: 0;
}

/* A supporting action: neutral text, never the action colour. !important is needed against Vuetify's text-primary utility. */
.v-btn.plan-3d-reset {
  color: var(--nk-text-secondary) !important;
}
</style>
