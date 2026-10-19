function requireEnv(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`Missing ${name}`)
	}

	return value
}

let cachedSupabaseUrl: string | undefined
let cachedSupabasePublishableKey: string | undefined
let cachedSupabaseServiceRoleKey: string | undefined

export function getSupabaseUrl(): string {
	if (!cachedSupabaseUrl) {
		cachedSupabaseUrl = requireEnv(
			process.env.NEXT_PUBLIC_SUPABASE_URL,
			'NEXT_PUBLIC_SUPABASE_URL'
		)
	}

	return cachedSupabaseUrl
}

export function getSupabasePublishableKey(): string {
	if (!cachedSupabasePublishableKey) {
		cachedSupabasePublishableKey = requireEnv(
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
		)
	}

	return cachedSupabasePublishableKey
}

export function getSupabaseServiceRoleKey(): string | null {
	try {
		if (!cachedSupabaseServiceRoleKey) {
			const v = process.env.SUPABASE_SERVICE_ROLE_KEY
			if (!v) return null
			cachedSupabaseServiceRoleKey = v
		}
		return cachedSupabaseServiceRoleKey
	} catch {
		return null
	}
}

let cachedRecaptchaSiteKey: string | undefined | null
let cachedRecaptchaSecret: string | undefined | null

export function getRecaptchaSiteKey(): string | null {
	if (cachedRecaptchaSiteKey === undefined) {
		const v = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
		cachedRecaptchaSiteKey = v && v.trim() ? v.trim() : null
	}
	return cachedRecaptchaSiteKey
}

export function getRecaptchaSecretKey(): string | null {
	if (cachedRecaptchaSecret === undefined) {
		const v = process.env.RECAPTCHA_SECRET_KEY
		cachedRecaptchaSecret = v && v.trim() ? v.trim() : null
	}
	return cachedRecaptchaSecret
}

export const MAX_ADDRESSES_PER_USER = 2

export interface UbigeoDraft {
	department: string
	province: string
	district: string
	address_line?: string | null
}

export const WAREHOUSE_ADDRESS: Readonly<UbigeoDraft & { label: string; address_line: string }> = {
	label: 'Almacén Sobrao Vape',
	address_line: 'Av. Principal',
	department: 'Callao',
	province: 'Callao',
	district: 'Ventanilla',
}

export const INDRIVE_ESTIMATES: ReadonlyArray<{
	zone: string
	approx_price_pen: number
	note?: string
}> = [
	{ zone: 'Ventanilla y Callao cercano', approx_price_pen: 12 },
	{ zone: 'Lima Metropolitana', approx_price_pen: 18, note: 'distritos de Lima' },
	{ zone: 'Lima provincias', approx_price_pen: 26 },
	{ zone: 'Resto del Perú', approx_price_pen: 32, note: 'tramo terrestre, 1-2 días hábiles' },
] as const

export function getWarehouseAddress(): typeof WAREHOUSE_ADDRESS {
	return WAREHOUSE_ADDRESS
}

export const DELIVERY_RATES = {
	SAME_DISTRICT: 10,
	LIMA_METROPOLITAN: 15,
	LIMA_PROVINCES: 22,
	NATIONAL: 28,
} as const

export type DeliveryRateTier = keyof typeof DELIVERY_RATES

export interface ShippingEstimate {
	tier: DeliveryRateTier
	amount: number
	currency: 'PEN'
	description: string
}

function normalizeUbigeo(value: string | null | undefined): string {
	return (value ?? '').trim().toLowerCase()
}

export function calculateShippingEstimate(
	from: UbigeoDraft = WAREHOUSE_ADDRESS,
	to: UbigeoDraft | null
): ShippingEstimate {
	if (!to) {
		return {
			tier: 'LIMA_METROPOLITAN',
			amount: DELIVERY_RATES.LIMA_METROPOLITAN,
			currency: 'PEN',
			description: 'Estimado Lima (dirección de entrega aún no confirmada)',
		}
	}

	const fromDep = normalizeUbigeo(from.department)
	const fromProv = normalizeUbigeo(from.province)
	const fromDist = normalizeUbigeo(from.district)
	const toDep = normalizeUbigeo(to.department)
	const toProv = normalizeUbigeo(to.province)
	const toDist = normalizeUbigeo(to.district)

	if (fromDep === toDep && fromProv === toProv && fromDist === toDist && toDist !== '') {
		return {
			tier: 'SAME_DISTRICT',
			amount: DELIVERY_RATES.SAME_DISTRICT,
			currency: 'PEN',
			description: `Mismo distrito (${capitalizeFirst(to.district) || from.district})`,
		}
	}

	if (toDep === 'lima' && toProv === 'lima') {
		return {
			tier: 'LIMA_METROPOLITAN',
			amount: DELIVERY_RATES.LIMA_METROPOLITAN,
			currency: 'PEN',
			description: 'Lima Metropolitana',
		}
	}

	if (toDep === 'lima') {
		return {
			tier: 'LIMA_PROVINCES',
			amount: DELIVERY_RATES.LIMA_PROVINCES,
			currency: 'PEN',
			description: 'Lima Provincias',
		}
	}

	return {
		tier: 'NATIONAL',
		amount: DELIVERY_RATES.NATIONAL,
		currency: 'PEN',
		description: toDep ? capitalizeFirst(to.department) : 'Envío nacional',
	}
}

export const INDRIVE_PEDIDOS_URL = 'https://indrive.com/es-pe/pedidos'

function capitalizeFirst(value: string): string {
	const v = (value ?? '').trim()
	if (!v) return ''
	return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
}

