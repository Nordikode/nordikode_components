export { default as IdentityAvatar } from './components/IdentityAvatar.vue'
export { default as NkEmptyState } from './components/NkEmptyState.vue'
export { default as NkStatusChip } from './components/NkStatusChip.vue'
export { default as PhoneNumberInput } from './components/PhoneNumberInput.vue'

export type { SharedLocale } from './types/SharedLocale'
export type { NkStatusChipTone } from './types/NkStatusChipTone'
export type { NkStatusChipSize } from './types/NkStatusChipSize'
export type { NkEmptyStateSize } from './types/NkEmptyStateSize'

export * from './tokens'

export { mdiRegistryIconSet } from './icons/mdiRegistrySet'
export type { MdiRegistry } from './icons/mdiRegistrySet'

export { installStaleChunkReload, isStaleChunkError } from './staleChunkReload'
export type { StaleChunkRouter } from './staleChunkReload'

export { formatMinorAmount, formatMoney, formatMoneyRange, supportedCurrencyCodes, toBcp47 } from './money'
export type { FormatMoneyOptions } from './money'
