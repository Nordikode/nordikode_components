import { signTheme } from './sign'
import type { NkProductTheme } from '../types'

// SIGN-657 (2026-09-09): Nordikode-paletten for plattformappene (company,
// account, developer). Plattformflatene bærer Nordikode-merkevaren, ikke
// Sign-produktet: handling og lenke er den blå fra Nordikode-logoen —
// periwinkle #90afed — sammen med tar #0d1c26. Nøytraler, statusfamilier
// (lime, gold, mauve, kopper) og rammen er felles med Sign og arves derfra;
// bare handlings- og tittelrollene er egne.
//
//   periwinkle       #90afed  handling i mørk modus (tar-etikett 7,9:1); rammen som før
//   mørk periwinkle  #35569f  handling i lys modus — periwinkle selv måler 2,2:1 på hvit
//                             og kan ikke bære hvit etikett (hvit på #35569f: 7,0:1)
//   tar              #0d1c26  blekk og titler (plum er Signs tittelblekk, ikke plattformens)
//
// Alle par er målt (WCAG 2.1) og står i Storybook «Tilgjengelighet». Verdier
// merket «avledet» finnes ikke som egen palettfarge.
export const platformTheme: NkProductTheme = {
  product: 'platform',
  vuetifyThemeName: 'NordikodePlatform',
  light: {
    ...signTheme.light,
    textTitle: '#0d1c26', // tar — 17,3:1 på kort
    primary: '#35569f', // mørk periwinkle — hvit etikett 7,0:1
    primaryHover: '#2c4886', // avledet: mørknet — 8,8:1
    primaryPress: '#243b6e', // avledet — 10,9:1
    onPrimary: '#ffffff',
    link: '#35569f', // 7,0:1 på hvit, 6,4:1 på side, 6,1:1 på valgt rad
    linkHover: '#2c4886',
    primarySoft: '#e2eafa', // periwinkle 26 % (samme tint som info)
    onPrimarySoft: '#2f4d8f', // avledet — 6,7:1 på primarySoft
  },
  dark: {
    ...signTheme.dark,
    textTitle: '#dbe5fb', // periwinkle lysnet — 14,9:1 på kort
    primary: '#90afed', // periwinkle — tar-etikett 7,9:1; som tekst 8,5:1 på kort
    primaryHover: '#a9c1f2', // lysere: etiketten er mørk — 9,6:1
    primaryPress: '#7d9ee6', // 6,5:1
    onPrimary: '#0d1c26',
    link: '#90afed', // 8,5:1 på kort, 9,2:1 på side, 7,4:1 på markering
    linkHover: '#a9c1f2',
    primarySoft: '#1b2a45', // periwinkle dyp
    onPrimarySoft: '#a9c1f2', // 7,9:1
  },
}
