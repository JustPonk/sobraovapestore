function requireEnv(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`Missing ${name}`)
	}

	return value
}

export const supabaseUrl = requireEnv(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	'NEXT_PUBLIC_SUPABASE_URL'
)

export const supabasePublishableKey = requireEnv(
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
)
