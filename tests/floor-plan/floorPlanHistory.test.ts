import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, canRedo, canUndo, commit, createHistory, endCoalescing, isDirty, redo, undo } from '../../src/floor-plan/floorPlanHistory'

// Angre og gjør om for redigeringen av en plantegning (SIGN-1980): minst 50
// steg, drag av samme håndtak blir ett steg, og «ulagret» måles mot det som
// sist ble lagret — ikke mot om det finnes historikk.

interface State {
  value: number
}

const signature = (state: State): string => String(state.value)
const state = (value: number): State => ({ value })

describe('floorPlanHistory (SIGN-1980)', () => {
  it('angrer og gjør om, steg for steg', () => {
    let history = createHistory(state(0))
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)

    history = commit(commit(history, state(1)), state(2))
    expect(history.present.value).toBe(2)
    expect(canUndo(history)).toBe(true)

    history = undo(history)
    expect(history.present.value).toBe(1)
    expect(canRedo(history)).toBe(true)

    history = undo(history)
    expect(history.present.value).toBe(0)
    expect(undo(history)).toBe(history)

    history = redo(redo(history))
    expect(history.present.value).toBe(2)
    expect(redo(history)).toBe(history)
  })

  it('en ny endring etter en angring kaster det som lå foran', () => {
    let history = commit(commit(createHistory(state(0)), state(1)), state(2))

    history = commit(undo(history), state(9))

    expect(history.present.value).toBe(9)
    expect(canRedo(history)).toBe(false)
    expect(undo(history).present.value).toBe(1)
  })

  it('en endring som ikke endret noe er ikke et steg', () => {
    const initial = state(0)
    const history = createHistory(initial)

    expect(commit(history, initial)).toBe(history)
  })

  it('holder minst 50 steg, og aldri flere enn grensen', () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(50)

    let history = createHistory(state(0))

    for (let value = 1; value <= HISTORY_LIMIT + 20; value += 1) {
      history = commit(history, state(value))
    }

    expect(history.past).toHaveLength(HISTORY_LIMIT)

    let steps = 0

    while (canUndo(history)) {
      history = undo(history)
      steps += 1
    }

    expect(steps).toBe(HISTORY_LIMIT)
    // De eldste stegene er borte; resten kan angres tilbake til dit.
    expect(history.present.value).toBe(20)
  })

  it('drag av samme håndtak blir ett steg', () => {
    let history = commit(createHistory(state(0)), state(1))

    for (const value of [2, 3, 4, 5]) {
      history = commit(history, state(value), 'corner:room-bad:2')
    }

    expect(history.present.value).toBe(5)
    // Ett steg tilbake er der draget startet.
    expect(undo(history).present.value).toBe(1)
    expect(history.past).toHaveLength(2)
  })

  it('et annet håndtak, en vanlig endring, angring og endCoalescing bryter rekken', () => {
    let history = commit(createHistory(state(0)), state(1), 'corner:a')
    history = commit(history, state(2), 'corner:a')
    history = commit(history, state(3), 'corner:b')
    expect(undo(history).present.value).toBe(2)

    history = commit(history, state(4))
    history = commit(history, state(5), 'corner:b')
    expect(undo(history).present.value).toBe(4)

    // Etter en angring er neste drag et nytt steg, også med samme håndtak.
    history = commit(undo(history), state(6), 'corner:b')
    expect(undo(history).present.value).toBe(4)

    history = commit(endCoalescing(history), state(7), 'corner:b')
    expect(undo(history).present.value).toBe(6)
    expect(endCoalescing(createHistory(state(0))).coalesceKey).toBeNull()
  })

  it('det første draget etter lasting er et eget steg', () => {
    const history = commit(commit(createHistory(state(0)), state(1), 'corner:a'), state(2), 'corner:a')

    expect(history.past).toHaveLength(1)
    expect(undo(history).present.value).toBe(0)
  })

  it('ulagret måles mot det som sist ble lagret', () => {
    let history = createHistory(state(0))
    expect(isDirty(history, signature)).toBe(false)

    history = commit(history, state(1))
    expect(isDirty(history, signature)).toBe(true)

    // Angret helt tilbake: ingenting å lagre.
    expect(isDirty(undo(history), signature)).toBe(false)

    // Samme innhold i et nytt objekt er heller ikke ulagret.
    expect(isDirty(commit(history, state(0)), signature)).toBe(false)

    // Etter lagring er det lagrede utgangspunktet.
    const saved = createHistory(history.present)
    expect(isDirty(saved, signature)).toBe(false)
    expect(isDirty(commit(saved, state(0)), signature)).toBe(true)
  })
})
