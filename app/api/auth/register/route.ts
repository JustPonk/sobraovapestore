import { NextResponse, type NextRequest } from 'next/server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { getRecaptchaSecretKey } from '@/utils/supabase/config'

export const runtime = 'nodejs'

async function verifyCaptcha(token: string | null): Promise<{ ok: boolean }> {
	const secret = getRecaptchaSecretKey()
	if (!secret) return { ok: true }
	if (!token) return { ok: false }
	try {
		const form = new URLSearchParams()
		form.set('secret', secret)
		form.set('response', token)
		const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
			method: 'POST',
			body: form,
			cache: 'no-store',
		})
		const data = (await res.json()) as { success: boolean }
		return { ok: Boolean(data.success) }
	} catch {
		return { ok: true }
	}
}

export async function POST(req: NextRequest) {
	const json = (await req.json().catch(() => null)) as {
		email?: string
		password?: string
		full_name?: string
		terms_accepted?: boolean
		privacy_accepted?: boolean
		captcha_token?: string | null
	} | null
	if (!json) {
		return NextResponse.json({ ok: false, message: 'Petición inválida.' })
	}
	const email = String(json.email ?? '').trim()
	const password = String(json.password ?? '')
	const fullName = String(json.full_name ?? '').trim()

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return NextResponse.json({ ok: false, message: 'Ingresa un correo válido.' })
	}
	if (password.length < 6) {
		return NextResponse.json({
			ok: false,
			message: 'La contraseña debe tener al menos 6 caracteres.',
		})
	}
	if (fullName.length < 2) {
		return NextResponse.json({
			ok: false,
			message: 'Ingresa tu nombre completo (al menos 2 caracteres).',
		})
	}
	if (!json.terms_accepted || !json.privacy_accepted) {
		return NextResponse.json({
			ok: false,
			message:
				'Debes aceptar los Términos y Condiciones y la Política de Privacidad para crear tu cuenta.',
		})
	}
	const captchaOk = await verifyCaptcha(json.captcha_token ?? null)
	if (!captchaOk.ok) {
		return NextResponse.json({
			ok: false,
			message: 'No se pudo verificar que seas humano. Inténtalo de nuevo.',
		})
	}

	const sb = await createServerClient()
	const siteOrigin =
		process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()
			? process.env.NEXT_PUBLIC_SITE_URL.trim()
			: undefined

	const { error } = await sb.auth.signUp({
		email,
		password,
		options: {
			data: { full_name: fullName },
			emailRedirectTo: siteOrigin
				? `${siteOrigin}/api/auth/callback?next=/tienda`
				: undefined,
		},
	})

	if (error) {
		const code = error.code || ''
		const msg = error.message || 'No se pudo crear la cuenta.'
		if (
			/already registered|already exists|already been taken|user_already_registered|duplicate/i.test(
				code || msg
			)
		) {
			return NextResponse.json({
				ok: false,
				message:
					'Ya existe una cuenta con este correo. Puedes iniciar sesión o recuperar tu contraseña.',
			})
		}
		return NextResponse.json({ ok: false, message: msg })
	}

	return NextResponse.json({
		ok: true,
		emailPending: true,
		message:
			'Cuenta creada. Revisa tu correo y haz clic en el enlace de confirmación para activarla. Revisa la carpeta spam si no lo ves.',
	})
}
