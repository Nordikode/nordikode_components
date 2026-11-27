/**
 * Angre og gjør om for redigeringen av en plantegning (SIGN-1980): en ren
 * historikk over tilstander. Hver endring legger forrige tilstand bak seg;
 * angre går ett steg tilbake, gjør om ett fram, og en ny endring etter en
 * angring kaster det som lå foran.
 *
 * Endringer som hører sammen — et hjørne som dras, piltaster som flytter
 * samme møbel — får samme `coalesceKey` og blir ett steg: så lenge nøkkelen
 * er den samme som forrige endrings, byttes bare nåtilstanden ut. Angre,
 * gjør om, en endring med en annen nøkkel (eller uten) og `endCoalescing`
 * bryter rekken.
 *
 * «Ulagret» er ikke «har historikk»: tilstanden sammenlignes med den som sist
 * ble lagret, så en endring som er angret helt tilbake ikke er ulagret.
 */
export interface EditHistory<T> {
  readonly past: readonly T[]
  readonly present: T
  readonly future: readonly T[]
  /** Tilstanden som sist ble lagret (eller lastet). */
  readonly saved: T
  /** Nøkkelen til forrige endring, når neste med samme nøkkel skal slås sammen med den. */
  readonly coalesceKey: string | null
}

/** Hvor mange steg som kan angres. */
export const HISTORY_LIMIT = 100

export const createHistory = <T>(initial: T): EditHistory<T> => ({ past: [], present: initial, future: [], saved: initial, coalesceKey: null })

/** En endring. Er `next` samme objekt som nåtilstanden, skjedde ingenting. */
export const commit = <T>(history: EditHistory<T>, next: T, coalesceKey: string | null = null): EditHistory<T> => {
  if (next === history.present) {
    return history
  }

  if (coalesceKey !== null && coalesceKey === history.coalesceKey && history.past.length > 0) {
    return { ...history, present: next, future: [] }
  }

  return {
    ...history,
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    coalesceKey,
  }
}

/** Neste endring blir et eget steg, også med samme nøkkel som forrige. */
export const endCoalescing = <T>(history: EditHistory<T>): EditHistory<T> => (history.coalesceKey === null ? history : { ...history, coalesceKey: null })

export const canUndo = <T>(history: EditHistory<T>): boolean => history.past.length > 0

export const canRedo = <T>(history: EditHistory<T>): boolean => history.future.length > 0

export const undo = <T>(history: EditHistory<T>): EditHistory<T> =>
  canUndo(history)
    ? {
        ...history,
        past: history.past.slice(0, -1),
        present: history.past[history.past.length - 1],
        future: [history.present, ...history.future],
        coalesceKey: null,
      }
    : history

export const redo = <T>(history: EditHistory<T>): EditHistory<T> =>
  canRedo(history)
    ? {
        ...history,
        past: [...history.past, history.present],
        present: history.future[0],
        future: history.future.slice(1),
        coalesceKey: null,
      }
    : history

/**
 * Er nåtilstanden en annen enn den som sist ble lagret? `signature` gir det
 * som lagres som tekst, så to tilstander med samme innhold er like selv om de
 * er ulike objekter.
 */
export const isDirty = <T>(history: EditHistory<T>, signature: (state: T) => string): boolean =>
  history.present !== history.saved && signature(history.present) !== signature(history.saved)
