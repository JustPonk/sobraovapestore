import peruUbigeo from './peruUbigeo.json'

export type PeruUbigeo = Record<string, Record<string, string[]>>

const ubigeo = peruUbigeo as PeruUbigeo

export const PERU_DEPARTMENTS: string[] = Object.keys(ubigeo)

export function getPeruProvinces(department: string): string[] {
	if (!department) return []
	return Object.keys(ubigeo[department] ?? {})
}

export function getPeruDistricts(department: string, province: string): string[] {
	if (!department || !province) return []
	return ubigeo[department]?.[province] ?? []
}
