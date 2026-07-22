function requireEnv(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`Missing ${name}`)
	}

	return value
}

let cachedSupabaseUrl: string | undefined
let cachedSupabasePublishableKey: string | undefined

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
