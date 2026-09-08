#!/usr/bin/env node
// Genererer et register over alle `mdi-*`-ikonnavn i kildekoden som
// importer fra @mdi/js (SIGN-521), for bruk med mdiRegistryIconSet i
// @nordikode/components. Kjøres fra appens rot:
//
//   nk-mdi-registry --out src/icons/mdiRegistry.ts src node_modules/@nordikode/app-core/dist
//
// Ukjente navn (skrivefeil, ikoner som ikke finnes i @mdi/js) stopper
// genereringen med kode 1, så feilen tas i bygget — ikke i produksjon.
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
if (outIndex < 0 || !args[outIndex + 1]) {
  console.error('Bruk: nk-mdi-registry --out <fil.ts> <katalog> [<katalog> …]')
  process.exit(2)
}
const outFile = resolve(process.cwd(), args[outIndex + 1])
const roots = args.filter((_, i) => i !== outIndex && i !== outIndex + 1)
if (roots.length === 0) roots.push('src')

const EXTENSIONS = new Set(['.vue', '.ts', '.js', '.mjs', '.cjs', '.mts'])
// Ikke navn: stier/pakkenavn som `iconsets/mdi-svg` og `nk-mdi-registry`.
const NAME = /(?<![\w/@-])mdi-[a-z0-9]+(?:-[a-z0-9]+)*\b/g

function walk(dir, out) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (EXTENSIONS.has(full.slice(full.lastIndexOf('.')))) out.push(full)
  }
}

const files = []
for (const root of roots) walk(resolve(process.cwd(), root), files)

const names = new Set()
for (const file of files) {
  if (resolve(file) === outFile) continue
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(NAME)) names.add(match[0])
}

const toExport = (name) =>
  'mdi' + name.slice(4).replace(/(?:^|-)([a-z0-9])/g, (_, c) => c.toUpperCase())

const require = createRequire(join(process.cwd(), 'package.json'))
const mdi = require('@mdi/js')

const sorted = [...names].sort()
const unknown = sorted.filter((name) => typeof mdi[toExport(name)] !== 'string')
if (unknown.length > 0) {
  console.error(`Ukjente MDI-ikoner (finnes ikke i @mdi/js):\n  ${unknown.join('\n  ')}`)
  process.exit(1)
}

const imports = sorted.map(toExport)
const lines = [
  '// Generert av nk-mdi-registry (@nordikode/components) — ikke rediger for hånd.',
  `// Kilder: ${roots.join(', ')}. Regenerer med \`npm run icons:generate\`.`,
  `import { ${imports.join(', ')} } from '@mdi/js'`,
  '',
  'export const mdiRegistry: Readonly<Record<string, string>> = {',
  ...sorted.map((name) => `  '${name}': ${toExport(name)},`),
  '}',
  '',
]
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, lines.join('\n'))
console.log(`nk-mdi-registry: ${sorted.length} ikoner → ${outFile}`)
