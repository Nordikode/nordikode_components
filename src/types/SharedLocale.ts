/**
 * Plattformens språkkode (`en`, `no`, `pt-BR`). Hvilke språk som finnes, er
 * data fra språkregisteret (SIGN-1157) — typen er derfor en streng, ikke en
 * union som må endres for hvert nytt språk.
 */
export type SharedLocale = string
