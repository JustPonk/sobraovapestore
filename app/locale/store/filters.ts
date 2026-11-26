import type { StoreFilterKey } from './data'

export const storeFilters: Array<{
	key: StoreFilterKey
	label: string
	matchers: string[]
}> = [
	{ key: 'promociones', label: 'Promociones', matchers: ['promociones'] },
	{ key: 'desechables', label: 'Desechables', matchers: ['desechables', 'desechable'] },
	{ key: 'equipos', label: 'Pods', matchers: ['equipos', 'equipo', 'pods', 'pod'] },
	{ key: 'dispositivos', label: 'Dispositivos', matchers: ['dispositivos', 'dispositivo', 'recargables', 'recargable'] },
	{ key: 'merchandising', label: 'Merchandising', matchers: ['merchandising', 'merch'] },
	{ key: 'tips-sobrao', label: 'Tips Sobrao', matchers: ['tips-sobrao', 'tips', 'sobrao'] },
]

export const defaultStoreFilter: StoreFilterKey = 'promociones'

export function resolveActiveFilter(rawFilter: string | null | undefined): StoreFilterKey {
	const matchingFilter = storeFilters.find((filter) => filter.key === rawFilter)
	return matchingFilter?.key ?? defaultStoreFilter
}
