import { NextResponse, type NextRequest } from 'next/server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getRecaptchaSecretKey } from '@/utils/supabase/config'

export const runtime = 'nodejs'

async function verifyCaptcha(token: string | null): Promise<{ ok: boolean; score?: number }> {
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
		const data = (await res.json()) as {
			success: boolean
			score?: number
			action?: string
		}
		return { ok: Boolean(data.success), score: data.score }
	} catch {
		return { ok: true }
	}
}

export async function POST(req: NextRequest) {
	const json = (await req.json().catch(() => null)) as {
		email?: string
		password?: string
		captcha_token?: string | null
	} | null
	if (!json) {
		return NextResponse.json({ ok: false, message: 'Petición inválida.' })
	}
	const email = String(json.email ?? '').trim()
	const password = String(json.password ?? '')
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return NextResponse.json({ ok: false, message: 'Ingresa un correo válido.' })
	}
	if (password.length < 6) {
		return NextResponse.json({
			ok: false,
			message: 'La contraseña debe tener al menos 6 caracteres.',
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
	const { data, error } = await sb.auth.signInWithPassword({ email, password })

	if (error) {
		const code = error.code || ''
		const msg = error.message || 'Credenciales incorrectas.'
		if (/email_not_confirmed|email_not_verified/i.test(code) || /confirm.*email|verifica/i.test(msg)) {
			const admin = createAdminClient()
			if (admin) {
				await admin.auth
					.resend({
						type: 'signup',
						email,
						options: {
							emailRedirectTo:
								process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()
									? `${process.env.NEXT_PUBLIC_SITE_URL.trim()}/api/auth/callback?next=/tienda`
									: undefined,
						},
					})
					.catch(() => null)
			}
			return NextResponse.json({
				ok: false,
				requireEmailConfirm: true,
				message:
					'Tu cuenta aún no está confirmada. Te reenviamos el correo de verificación (revisa la carpeta spam).',
			})
		}
		return NextResponse.json({
			ok: false,
			message: /invalid.*credentials|invalid.*password|invalid.*login/i.test(msg)
				? 'Credenciales incorrectas. Revisa tu correo y contraseña.'
				: msg,
		})
	}

	void data
	return NextResponse.json({ ok: true })
}
