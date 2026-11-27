import { signTheme } from './sign'
import type { NkProductTheme } from '../types'

// SIGN-2039 (2026-11-27): paletten for Nordikode Sketch. Sketch er et eget
// produkt ved siden av Sign og Time og må kunne kjennes igjen på fargen:
// handling, lenke og rail er teal — tegningens farge — der Sign har berry,
// Time oransje og plattformappene Nordikode-blått. Nøytraler, statusfamilier
// (lime, gold, mauve, kopper), markering og AI-tint er felles med Sign og
// arves derfra, på samme måte som platformTheme gjør; bare handlings-, rail-
// og tittelrollene er egne.
//
//   teal        #0e6b70  handling i lys modus (hvit etikett 6,3:1) og railen i begge moduser
//   light teal  #56bfc2  handling i mørk modus (tar-etikett 8,0:1) — teal selv måler
//                        3,0:1 som tekst på nesten svart
//   tar         #0d1c26  blekk og titler (plum er Signs tittelblekk, ikke Sketch sitt)
//
// Fargetonen (183°) ligger lengst fra de andre produktene: berry 338°, Time
// oransje 26°, periwinkle 220° — og fra statusfamiliene lime 72° og gold 45°.
//
// Fargene er et forslag avledet i SIGN-2039 og venter på UX sitt vedtak, som
// alle nye palettverdier. Alle par er målt (WCAG 2.1): tallene står ved hver
// verdi, og `tests/themeContrast.test.ts` regner dem på nytt fra verdiene.
// Verdier merket «avledet» finnes ikke som egen palettfarge.
export const sketchTheme: NkProductTheme = {
  product: 'sketch',
  vuetifyThemeName: 'NordikodeSketch',
  light: {
    ...signTheme.light,
    surfaceRail: '#0e6b70', // teal — flat rail, ingen gradient (som Sign)
    railStart: '#0e6b70',
    railEnd: '#0e6b70',
    railIcon: 'rgba(246, 242, 234, 0.8)', // krem 80 % — 4,2:1 på teal
    railIconStrong: '#f6f2ea', // krem — 5,6:1 på teal
    onSurfacePanelLink: '#a5e0e2', // avledet: light teal lysnet (= onPrimarySoft mørk) — 6,3:1 på panel
    textTitle: '#0d1c26', // tar — 17,3:1 på kort
    primary: '#0e6b70', // teal — hvit etikett 6,3:1
    primaryHover: '#0c5b5f', // avledet: teal mørknet 15 % — 7,8:1
    primaryPress: '#0a4d51', // avledet: teal mørknet 28 % — 9,6:1
    onPrimary: '#ffffff',
    link: '#0e6b70', // 6,3:1 på hvit, 5,7:1 på side, 5,3:1 på valgt rad
    linkHover: '#0c5b5f',
    frame: '#3e898d', // avledet: hvit 20 % over teal — aktiv rail-knapp, 1,5:1 mot railen; krem ikon 3,6:1
    onFrame: '#f6f2ea',
    primarySoft: '#d8e7e8', // teal 16 %
    onPrimarySoft: '#0b5054', // avledet: teal mørknet 25 % — 7,2:1 på primarySoft
  },
  dark: {
    ...signTheme.dark,
    surfaceRail: '#0e6b70', // teal — samme rail i begge moduser (som Sign)
    railStart: '#0e6b70',
    railEnd: '#0e6b70',
    railIcon: 'rgba(246, 242, 234, 0.8)', // som light — 4,2:1 på teal
    railIconStrong: '#f6f2ea',
    onSurfacePanelLink: '#a5e0e2', // avledet: light teal lysnet (= onPrimarySoft) — 6,3:1 på panel
    textTitle: '#d3ecec', // avledet: light teal lysnet — 15,2:1 på kort
    primary: '#56bfc2', // light teal — tar-etikett 8,0:1; som tekst 8,6:1 på kort
    primaryHover: '#78ccce', // avledet: lysere, etiketten er mørk — 9,4:1
    primaryPress: '#4dacaf', // avledet — 6,5:1
    onPrimary: '#0d1c26',
    link: '#56bfc2', // 8,6:1 på kort, 9,3:1 på side, 7,4:1 på markering
    linkHover: '#78ccce',
    frame: '#3e898d', // avledet: hvit 20 % over teal — som light; krem ikon 3,6:1
    onFrame: '#f6f2ea',
    primarySoft: '#122f31', // teal dyp
    onPrimarySoft: '#a5e0e2', // avledet: light teal lysnet — 9,7:1 på primarySoft
  },
}
