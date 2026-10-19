import { NextResponse, type NextRequest } from 'next/server'

import { createClient as createServerClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
	const { searchParams, origin } = new URL(req.url)
	const code = searchParams.get('code')
	const next = searchParams.get('next') ?? '/'

	if (!code) {
		return NextResponse.redirect(
			`${origin}/iniciar-sesion?error=no_code&message=No%20se%20recibi%C3%B3%20c%C3%B3digo%20de%20verificaci%C3%B3n`
		)
	}

	const sb = await createServerClient()
	const { error } = await sb.auth.exchangeCodeForSession(code)

	if (error) {
		const msg = encodeURIComponent(error.message || 'Error al iniciar sesión.')
		return NextResponse.redirect(
			`${origin}/iniciar-sesion?error=auth_callback&message=${msg}`
		)
	}

	return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : `/${next}`}`)
}
