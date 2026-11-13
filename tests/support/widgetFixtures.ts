import { reactive } from 'vue'
import { vi } from 'vitest'
import type { WidgetLabels, WidgetLayout, WidgetLayoutStorage } from '../../src/widgets/types'

// Fiksturer for widgettestene (SIGN-1873): tekstene appen ellers gir fra
// i18n, og en lagring i minnet i stedet for Signs UI-preferanser i core.

export const widgetLabels: WidgetLabels = {
  editTitle: 'Customise the page',
  hint: 'Drag widgets to move them, change their size or hide them.',
  hidden: 'Hidden widgets',
  none: 'None',
  reset: 'Reset',
  resetTitle: 'Reset the layout?',
  resetBody: 'Every widget goes back to its default place and size.',
  done: 'Done',
  cancel: 'Cancel',
  move: (widget) => `Move ${widget}`,
  dragToMove: 'Drag to move',
  nextSize: (size) => `Change size to ${size}`,
  nextRows: (rows) => `Change height to ${rows} rows`,
  hide: (widget) => `Hide ${widget}`,
  sizes: { small: 'Small', medium: 'Medium', large: 'Large' },
  settings: (widget) => `Settings for ${widget}`,
}

/**
 * En lagring i minnet: `values` er reaktiv, så `current()` lar kontrolleren
 * følge med når noe «annet» skriver — slik en annen fane gjør i Sign.
 */
export const memoryStorage = (initial: Record<string, unknown> = {}) => {
  const values = reactive<Record<string, unknown>>({ ...initial })
  const load = vi.fn(async (key: string): Promise<unknown> => values[key] ?? null)
  const save = vi.fn(async (key: string, layout: WidgetLayout): Promise<void> => {
    values[key] = layout
  })
  const storage: WidgetLayoutStorage = {
    load,
    save,
    current: (key) => values[key],
  }

  return { values, load, save, storage }
}
