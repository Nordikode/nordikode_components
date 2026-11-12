/**
 * Attributter for søkefelt (SIGN-838, delt i SIGN-1907).
 *
 * Et anonymt tekstfelt med plassholder tolkes av Chrome og Safari som et
 * innloggings-/kontaktfelt, og nettleseren fyller inn brukerens e-post i
 * søkefeltet. `autocomplete="off"` alene holder ikke: nettleserne overstyrer
 * det for felt de mener er innlogging. Tre signaler til sammen stopper det —
 * felttypen `search`, et navn som ikke ligner e-post/brukernavn, og
 * autofyll av. (`data-*`-attributter når aldri `<input>` gjennom Vuetify —
 * de havner på rotelementet — så passordbehandlernes opt-out er utelatt;
 * de lar `type="search"` være i fred.)
 *
 * Bruk: `<v-text-field v-bind="NK_SEARCH_FIELD_ATTRS" … />` — Vuetify sender
 * attributtene videre til selve `<input>`-elementet. `NkListPane` setter dem
 * selv på søkefeltet sitt.
 */
export const NK_SEARCH_FIELD_ATTRS = Object.freeze({
  type: 'search',
  name: 'search',
  autocomplete: 'off',
})
