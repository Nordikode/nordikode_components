/**
 * `danger` gir bekreft-knappen feilfargen. Om en app har en rød handling, er
 * appens valg: Sign bruker den ikke, der er handlingen alltid i
 * handlingsfargen, også når den ikke kan angres (SIGN-1763).
 */
export type NkConfirmDialogTone = 'default' | 'danger'
