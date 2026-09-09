// Semantiske toner fra designsystemet (én farge har én jobb):
// success = fullført (nordlys-tint), inflight = underveis (kopper-tint),
// warning = venter på noen (varsel), error = feil, info = informasjon,
// ai = maskinen (alt Sign har skrevet — aiSoft/onAiSoft, SIGN-604),
// neutral = kategori/utkast uten semantikk.
export type NkStatusChipTone = 'success' | 'inflight' | 'warning' | 'error' | 'info' | 'ai' | 'neutral'
