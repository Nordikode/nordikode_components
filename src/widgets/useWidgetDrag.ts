import { onBeforeUnmount, ref } from 'vue'

/** Avstand (px) fra viewportkanten der draget begynner å rulle siden. */
const SCROLL_EDGE_PX = 72

/** Piksler per bilde ved kanten. */
const SCROLL_STEP_PX = 14

/** Hvor langt pekeren må gå før et trykk blir et drag. */
const DRAG_THRESHOLD_PX = 6

/** Hvor den dratte widgeten ville ligget om den fulgte pekeren: øvre venstre hjørne i viewport-piksler. */
export interface DragPoint {
  clientX: number
  clientY: number
  /** Widgetens øvre venstre hjørne, med grepspunktet under pekeren. */
  left: number
  top: number
  /** Widgetnøkkelen under pekeren (en annen enn den dratte), om noen. */
  over: string | null
  /** Sonen under pekeren (`data-widget-zone`), om noen. */
  zone: string | null
}

export interface DragCallbacks {
  /** Kalles ved hver pekerbevegelse under draget; true når oppsettet endret seg. */
  onMove: (draggedKey: string, point: DragPoint) => boolean
  onDrop: (draggedKey: string) => void
}

const DRAGGING_CLASS = 'nk-widgets-dragging'

/**
 * Pekerbasert drag for widgetflatene. Virker likt med mus og finger
 * (pointer events). Den dratte widgeten blir stående i flaten, dempet, og
 * flytter seg live etter hvert som oppsettet endres; en liten «spøkelses»-
 * etikett følger pekeren. Composablen holder bare rede på pekeren: ved hver
 * bevegelse melder den hvor widgetens hjørne ville vært (så rutenettet kan
 * snappe til en celle), hvilken widget og sone som ligger under pekeren
 * (så en kolonne kan omordne), og overlater oppsettet til eieren.
 */
export const useWidgetDrag = (callbacks: DragCallbacks) => {
  const draggingKey = ref<string | null>(null)
  const ghostX = ref(0)
  const ghostY = ref(0)

  let pointerId: number | null = null
  let startX = 0
  let startY = 0
  let grabX = 0
  let grabY = 0
  let pending: string | null = null
  let scrollFrame: number | null = null
  let scrollDelta = 0
  let scroller: HTMLElement | null = null

  const pointAt = (clientX: number, clientY: number): DragPoint => {
    const element = document.elementFromPoint(clientX, clientY)
    const over = element?.closest<HTMLElement>('[data-widget-key]')?.dataset.widgetKey ?? null
    const zone = element?.closest<HTMLElement>('[data-widget-zone]')?.dataset.widgetZone ?? null

    return {
      clientX,
      clientY,
      left: clientX - grabX,
      top: clientY - grabY,
      over: over === draggingKey.value || over === pending ? null : over,
      zone,
    }
  }

  const autoScroll = (): void => {
    scrollFrame = null

    if (scrollDelta === 0 || draggingKey.value === null) {
      return
    }

    if (scroller !== null) {
      scroller.scrollBy(0, scrollDelta)
    } else {
      window.scrollBy(0, scrollDelta)
    }

    scrollFrame = requestAnimationFrame(autoScroll)
  }

  const cleanup = (): void => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', release)
    document.removeEventListener('pointercancel', release)
    document.body.classList.remove(DRAGGING_CLASS)

    if (scrollFrame !== null) {
      cancelAnimationFrame(scrollFrame)
      scrollFrame = null
    }

    pointerId = null
    pending = null
    scrollDelta = 0
    scroller = null
    draggingKey.value = null
  }

  function move(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return
    }

    if (draggingKey.value === null) {
      const travelled = Math.hypot(event.clientX - startX, event.clientY - startY)

      if (pending === null || travelled < DRAG_THRESHOLD_PX) {
        return
      }

      draggingKey.value = pending
      document.body.classList.add(DRAGGING_CLASS)
    }

    event.preventDefault()
    ghostX.value = event.clientX
    ghostY.value = event.clientY

    callbacks.onMove(draggingKey.value, pointAt(event.clientX, event.clientY))

    scrollDelta = 0

    if (event.clientY < SCROLL_EDGE_PX) {
      scrollDelta = -SCROLL_STEP_PX
    } else if (event.clientY > window.innerHeight - SCROLL_EDGE_PX) {
      scrollDelta = SCROLL_STEP_PX
    }

    if (scrollDelta !== 0 && scrollFrame === null) {
      scrollFrame = requestAnimationFrame(autoScroll)
    }
  }

  function release(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return
    }

    let dropped = draggingKey.value

    // Et trykk som slippes et annet sted uten én eneste bevegelse imellom
    // (noen inndataverktøy og hjelpemidler sender ingen) teller fortsatt
    // som et drag dit det ble sluppet.
    if (dropped === null && pending !== null && Math.hypot(event.clientX - startX, event.clientY - startY) >= DRAG_THRESHOLD_PX) {
      dropped = pending
      callbacks.onMove(dropped, pointAt(event.clientX, event.clientY))
    }

    cleanup()

    if (dropped !== null) {
      callbacks.onDrop(dropped)
    }
  }

  /** Nærmeste forelder som ruller — flatene i Sign ruller inni `v-main`, ikke vinduet. */
  const findScroller = (element: HTMLElement | null): HTMLElement | null => {
    let current = element?.parentElement ?? null

    while (current !== null && current !== document.body) {
      const { overflowY } = getComputedStyle(current)

      if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
        return current
      }

      current = current.parentElement
    }

    return null
  }

  /**
   * Begynner å lytte etter et drag av `key`. `tile` er widgetens element,
   * brukt til å huske hvor i den brukeren grep, så flisen ikke hopper under pekeren.
   */
  const press = (event: PointerEvent, key: string, tile: HTMLElement | null): void => {
    if (event.button !== 0 && event.pointerType === 'mouse') {
      return
    }

    const rect = tile?.getBoundingClientRect()

    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    grabX = rect ? event.clientX - rect.left : 0
    grabY = rect ? event.clientY - rect.top : 0
    pending = key
    scroller = findScroller(tile)

    document.addEventListener('pointermove', move, { passive: false })
    document.addEventListener('pointerup', release)
    document.addEventListener('pointercancel', release)
  }

  onBeforeUnmount(cleanup)

  return { draggingKey, ghostX, ghostY, press }
}
