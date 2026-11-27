/**
 * The texts of the floor plan components (SIGN-2041) come from files, one
 * per language, named after the language code — in the same way as the
 * support session and e-mail verification texts in `src/web`. The code has
 * no list of languages: the files are the list. A new language is a new
 * file. A language without a file gets the source language.
 */
const SOURCE_LOCALE = 'en'

/** The files `import.meta.glob` found, by language code. */
export const textsByLocale = <T>(files: Record<string, unknown>): Map<string, T> =>
  new Map(Object.entries(files).map(([path, texts]) => [path.replace(/^.*\/([^/]+)\.json$/, '$1').toLowerCase(), texts as T]))

/** The language's own file, else the file of the main language (`pt` for `pt-BR`), else the source language. */
export const textsFor = <T>(texts: Map<string, T>, locale: string | null | undefined): T => {
  const code = (locale ?? '').trim().toLowerCase()

  return texts.get(code) ?? texts.get(code.split('-')[0] ?? '') ?? (texts.get(SOURCE_LOCALE) as T)
}

/** Puts the values into the placeholders of a text (`{room}`). A placeholder without a value is left as it is. */
export const fillFloorPlanText = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
