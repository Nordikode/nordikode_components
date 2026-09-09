<script setup lang="ts">
/**
 * Merkevarelogoen for webflatene (SIGN-641) — Nordikode eller Sign, som hel
 * logo (`lockup` = symbol + ordmerke), stablet (`stacked` = ordmerket under
 * symbolet, til fliser og kvadratiske flater, SIGN-655) eller kun symbolet
 * (`mark`). Assetene
 * (SVG fra merkevarefilene) shippes i pakka slik at logoen vedlikeholdes ett
 * sted; lys/mørk variant byttes automatisk via `.dark` på rot-elementet
 * (samme konvensjon som webflatenes tema). Merkefargene (periwinkle, berry)
 * er brand-assets og like i begge moduser — det er blekket som byttes.
 *
 * Størrelse settes av verts-appen (f.eks. `class="h-7"` eller en height-stil)
 * — bildet skalerer proporsjonalt.
 */
export type BrandKey = 'nordikode' | 'sign'
export type BrandVariant = 'lockup' | 'stacked' | 'mark'

const props = withDefaults(
  defineProps<{
    /** Hvilken merkevare: `nordikode` (plattformen) eller `sign` (produktet). */
    brand?: BrandKey
    /** `lockup` = symbol + ordmerke (header, innloggingssider); `stacked` = ordmerket under symbolet (fliser); `mark` = kun symbolet. */
    variant?: BrandVariant
    /** Alternativtekst. Tom streng når logoen er dekorativ (lenketekst finnes ved siden av). */
    alt?: string
  }>(),
  { brand: 'nordikode', variant: 'lockup', alt: undefined },
)

const assets: Record<BrandKey, Record<BrandVariant, { light: string; dark: string }>> = {
  nordikode: {
    lockup: {
      light: new URL('./brand/nordikode-lockup-light.svg', import.meta.url).href,
      dark: new URL('./brand/nordikode-lockup-dark.svg', import.meta.url).href,
    },
    stacked: {
      light: new URL('./brand/nordikode-stacked-light.svg', import.meta.url).href,
      dark: new URL('./brand/nordikode-stacked-dark.svg', import.meta.url).href,
    },
    mark: {
      light: new URL('./brand/nordikode-mark-light.svg', import.meta.url).href,
      dark: new URL('./brand/nordikode-mark-dark.svg', import.meta.url).href,
    },
  },
  sign: {
    lockup: {
      light: new URL('./brand/sign-lockup-light.svg', import.meta.url).href,
      dark: new URL('./brand/sign-lockup-dark.svg', import.meta.url).href,
    },
    stacked: {
      light: new URL('./brand/sign-stacked-light.svg', import.meta.url).href,
      dark: new URL('./brand/sign-stacked-dark.svg', import.meta.url).href,
    },
    mark: {
      light: new URL('./brand/sign-mark-light.svg', import.meta.url).href,
      dark: new URL('./brand/sign-mark-dark.svg', import.meta.url).href,
    },
  },
}

const defaultAlt: Record<BrandKey, string> = { nordikode: 'Nordikode', sign: 'Nordikode Sign' }
</script>

<template>
  <span class="nk-brand" :class="`nk-brand--${props.brand} nk-brand--${props.variant}`">
    <img
      class="nk-brand__img nk-brand__img--light"
      :src="assets[props.brand][props.variant].light"
      :alt="props.alt ?? defaultAlt[props.brand]"
    />
    <img
      class="nk-brand__img nk-brand__img--dark"
      :src="assets[props.brand][props.variant].dark"
      alt=""
      aria-hidden="true"
    />
  </span>
</template>

<style scoped>
/* Høyden settes av verts-appen (f.eks. `class="h-7"`); bildet følger den. */
.nk-brand {
  display: inline-flex;
}

.nk-brand__img {
  display: block;
  height: 100%;
  width: auto;
  max-width: 100%;
  user-select: none;
}

.nk-brand__img--dark {
  display: none;
}
</style>

<!-- Uscopet med vilje: `:global()` i scoped CSS knekker i pakkas
     LightningCSS-minifisering (selektoren `.dark .x` reduseres til `.dark`).
     Klassenavnene er nk-namespacet, så uscopede regler er trygge. -->
<style>
.dark .nk-brand .nk-brand__img--light {
  display: none;
}

.dark .nk-brand .nk-brand__img--dark {
  display: block;
}
</style>
