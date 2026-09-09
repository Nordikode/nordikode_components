<script setup lang="ts">
/**
 * Produktsymbolet — merket som står foran produktnavnet i den delte headeren
 * (SIGN-614). Symbolene bor i pakka slik at hver app viser sitt eget symbol
 * fra samme kilde, ikke en lokal `<img>`-kopi.
 *
 * Symbolet rendres inline slik at den mørke delen («tar», blekket i paletten)
 * følger tekstfargen (`currentColor`) og dermed lys/mørk modus, mens
 * merkefargen er fast: merkefarger er brand-assets, ikke tema-tokens
 * (Sign: light berry, SIGN-583).
 *
 * Størrelse settes av verts-komponenten via `height` (bildet skalerer
 * proporsjonalt); `AppHeader` gjør det for headeren.
 */
export type ProductSymbolKey = 'sign'

defineProps<{
  product: ProductSymbolKey
}>()
</script>

<template>
  <span class="nk-product-symbol" :class="`nk-product-symbol--${product}`" aria-hidden="true">
    <!-- Sign: kalligrafisk S — tar (currentColor) med light berry som merkefarge. -->
    <svg
      v-if="product === 'sign'"
      class="nk-product-symbol__svg"
      viewBox="0 0 936 1418"
      xmlns="http://www.w3.org/2000/svg"
      fill-rule="evenodd"
      clip-rule="evenodd"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M788.495,41.816c4.59,-13.589 6.076,-17.98 11.775,-36.522c6.933,-22.556 8.59,38.666 0.775,77.959c-45.582,229.162 -371.579,306.768 -478.971,421.784c-39.227,42.012 -26.373,70.881 -24.204,80.574c35.833,132.018 417.37,191.788 508.827,359.663c65.43,120.1 -40.756,221.528 -161.749,270.068c-26.69,10.707 -26.338,10.736 -51.59,20.691c-2.99,1.135 -5.979,2.271 -8.969,3.406c-148.457,47.728 -408.273,62.792 -537.761,165.01c-10.94,8.636 -21.628,20.443 -15.679,7.748c11.022,-23.522 49.027,-62.054 53.854,-66.948c150.862,-152.954 598.237,-220.578 510.899,-377.509c-62.786,-112.815 -415.769,-170.304 -503.924,-270.504c-17.392,-28.376 -162.94,-174.538 277.461,-378.362c186.068,-86.115 372.253,-148.176 418.689,-274.371c0.501,-1.361 0.247,-1.172 0.566,-2.686Z"
      />
      <path
        class="nk-product-symbol__brand"
        d="M297.87,585.61c22.352,12.992 11.837,40.292 171.746,90.526c160.566,50.441 497.816,94.081 463.211,315.362c-29.046,185.733 -310.315,245.25 -336.396,247.628c-6.359,0.58 -9.682,-0.891 -9.682,-0.891c0,0 31.508,-12.186 58.197,-22.894c120.993,-48.54 227.179,-149.968 161.749,-270.068c-91.457,-167.875 -472.994,-227.644 -508.827,-359.663Z"
      />
      <path
        class="nk-product-symbol__brand"
        d="M790.698,35.208c-0.319,1.514 -2.268,7.933 -2.769,9.294c-46.436,126.194 -232.621,188.256 -418.689,274.371c-440.401,203.824 -294.853,349.986 -277.461,378.362c-29.967,-2.574 -162.373,-155.055 -39.613,-301.677c123.668,-147.707 480.582,-187.915 629.426,-266.056c51.998,-27.298 92.314,-74.747 98.992,-82.608c3.983,-4.688 6.701,-7.942 10.114,-11.685Z"
      />
    </svg>
  </span>
</template>

<style scoped>
/* Høyden settes av verts-komponenten; bredden følger symbolets proporsjoner. */
.nk-product-symbol {
  display: inline-flex;
  flex-shrink: 0;
  height: 1em;
  line-height: 0;
}

.nk-product-symbol__svg {
  display: block;
  height: 100%;
  width: auto;
}

/* Merkefargen er brand-asset (fast hex, som logo-PNG-ene i BrandWordmark),
   ikke en tema-token: Sign = light berry (SIGN-583). Kan overstyres av verten
   med --nk-product-symbol-brand om et annet uttrykk vedtas. */
.nk-product-symbol--sign .nk-product-symbol__brand {
  fill: var(--nk-product-symbol-brand, #dc7499);
}
</style>
