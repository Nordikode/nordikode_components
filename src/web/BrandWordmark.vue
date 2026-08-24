<script setup lang="ts">
/**
 * Nordikode-logoen for webflatene — den kalligrafiske «N»-en, med eller uten
 * NORDIKODE-ordmerket under. Assetene shippes i pakka slik at logoen
 * vedlikeholdes ett sted; lys/mørk variant byttes automatisk via `.dark` på
 * rot-elementet (samme konvensjon som webflatenes tema).
 *
 * Størrelse settes av verts-appen (f.eks. `class="h-7"` eller en height-stil)
 * — bildet skalerer proporsjonalt.
 */
withDefaults(
  defineProps<{
    /** `lockup` = monogram + NORDIKODE (innloggingssider); `mark` = kun monogrammet (toppbarer). */
    variant?: 'lockup' | 'mark'
    alt?: string
  }>(),
  { variant: 'lockup', alt: 'Nordikode' },
)

const lockupBlack = new URL('./brand/nordikode-lockup-black.png', import.meta.url).href
const lockupWhite = new URL('./brand/nordikode-lockup-white.png', import.meta.url).href
const markBlack = new URL('./brand/nordikode-mark-black.png', import.meta.url).href
const markWhite = new URL('./brand/nordikode-mark-white.png', import.meta.url).href
</script>

<template>
  <span class="nk-brand">
    <img
      class="nk-brand__img nk-brand__img--light"
      :src="variant === 'mark' ? markBlack : lockupBlack"
      :alt="alt"
    />
    <img
      class="nk-brand__img nk-brand__img--dark"
      :src="variant === 'mark' ? markWhite : lockupWhite"
      :alt="alt"
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
