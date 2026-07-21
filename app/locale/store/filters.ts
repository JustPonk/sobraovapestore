import type { StoreFilterKey } from './data'

export const storeFilters: Array<{
	key: StoreFilterKey
	label: string
	matchers: string[]
}> = [
	{ key: 'promociones', label: 'Promociones', matchers: ['promociones'] },
	{ key: 'nuevo', label: 'Nuevo', matchers: ['nuevo'] },
	{ key: 'vapor-ti', label: 'Vapor ti', matchers: ['vapor-ti', 'vapor-tienda', 'vapor-ti'] },
	{ key: 'desechables', label: 'Desechables', matchers: ['desechables', 'desechable'] },
	{ key: 'equipos', label: 'Equipos', matchers: ['equipos', 'equipo'] },
]

export const defaultStoreFilter: StoreFilterKey = 'promociones'
