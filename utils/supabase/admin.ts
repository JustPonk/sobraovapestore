import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { getSupabaseServiceRoleKey, getSupabaseUrl } from './config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>

let cachedAdminClient: AnySupabase | null | undefined

export function createAdminClient(): AnySupabase {
	if (cachedAdminClient !== undefined && cachedAdminClient !== null) {
		return cachedAdminClient
	}

	const serviceRole = getSupabaseServiceRoleKey()
	if (!serviceRole) {
		throw new Error(
			'SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.local — no se puede inicializar createAdminClient(). Agrega la variable y reinicia el servidor.'
		)
	}

	try {
		cachedAdminClient = createSupabaseClient(getSupabaseUrl(), serviceRole, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		})
	} catch (err) {
		cachedAdminClient = null
		const msg = err instanceof Error ? err.message : String(err)
		throw new Error(`No se pudo inicializar createAdminClient(): ${msg}`)
	}

	if (!cachedAdminClient) {
		throw new Error('No se pudo inicializar createAdminClient(): cliente inválido.')
	}

	return cachedAdminClient
}
