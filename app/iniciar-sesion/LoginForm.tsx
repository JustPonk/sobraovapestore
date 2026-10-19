'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { getRecaptchaSiteKey } from '@/utils/supabase/config'
import { useRecaptcha } from '@/app/hooks/useRecaptcha'

const fieldClass =
	'w-full rounded-[1rem] border border-indigo-100 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-0 transition focus:border-[#1f2a9b] focus:shadow-[0_0_0_4px_rgba(31,42,155,0.12)]'

export default function LoginForm() {
	const router = useRouter()
	const search = useSearchParams()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [pending, setPending] = useState(false)
	const [, startTransition] = useTransition()
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const [okMsg, setOkMsg] = useState<string | null>(null)

	const siteKey = (() => {
		try {
			return getRecaptchaSiteKey()
		} catch {
			return null
		}
	})()
	const recaptchaLoaded = useRecaptcha(siteKey)

	useEffect(() => {
		const m = search.get('message')
		const err = search.get('error')
		if (err === 'email_pending' && m) setOkMsg(m)
		else if (err && m) setErrorMsg(m)
	}, [search])

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setErrorMsg(null)
		setOkMsg(null)
		const emailVal = email.trim()
		const pwdVal = password
		if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
			setErrorMsg('Ingresa un correo válido.')
			return
		}
		if (pwdVal.length < 6) {
			setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
			return
		}
		setPending(true)
		try {
			let captchaTok: string | null = null
			if (siteKey && recaptchaLoaded && window.grecaptcha) {
				try {
					captchaTok = await window.grecaptcha.execute(siteKey, { action: 'login' })
				} catch {
					captchaTok = null
				}
			}
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: emailVal, password: pwdVal, captcha_token: captchaTok }),
			})
			const json = (await res.json()) as {
				ok: boolean
				message?: string | null
				requireEmailConfirm?: boolean
			}
			if (!json.ok) {
				if (json.requireEmailConfirm) {
					setOkMsg(
						json.message ||
							'Te enviamos un correo para confirmar tu dirección. Haz clic en el enlace para activar la cuenta.'
					)
					return
				}
				setErrorMsg(json.message || 'Credenciales incorrectas.')
				return
			}
			startTransition(() => {
				router.refresh()
				router.push('/tienda')
			})
		} catch {
			setErrorMsg('No se pudo conectar. Revisa tu red e inténtalo de nuevo.')
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={onSubmit} className="mt-6 space-y-5">
			{okMsg ? (
				<div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-800">
					{okMsg}
				</div>
			) : null}
			{errorMsg ? (
				<div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-rose-800">
					{errorMsg}
				</div>
			) : null}

			<label className="block space-y-1.5">
				<span className="block text-xs font-black uppercase tracking-[0.22em] text-slate-600">
					Correo electrónico <span className="text-rose-500">*</span>
				</span>
				<input
					type="email"
					autoComplete="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={fieldClass}
					placeholder="tu.correo@ejemplo.com"
					required
				/>
			</label>

			<label className="block space-y-1.5">
				<span className="block text-xs font-black uppercase tracking-[0.22em] text-slate-600">
					Contraseña <span className="text-rose-500">*</span>
				</span>
				<input
					type="password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={fieldClass}
					placeholder="••••••••"
					required
					minLength={6}
				/>
			</label>

			<button
				type="submit"
				disabled={pending}
				className={`w-full rounded-[1.5rem] px-6 py-4 text-sm font-black uppercase tracking-[0.26em] text-white shadow-[0_20px_42px_rgba(31,42,155,0.28)] transition ${
					pending
						? 'pointer-events-none bg-slate-400 shadow-none'
						: 'bg-[#1f2a9b] hover:bg-[#2B1F97]'
				}`}
			>
				{pending ? 'Iniciando sesión…' : 'Iniciar sesión →'}
			</button>

			<div className="flex flex-col gap-2 text-[0.76rem] font-bold uppercase tracking-[0.18em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
				<span>¿Olvidaste tu contraseña?</span>
				<Link
					href="/recuperar"
					className="rounded-full border border-indigo-100 px-3 py-1.5 text-[#1f2a9b] transition hover:bg-indigo-50"
				>
					Recuperar contraseña
				</Link>
			</div>
		</form>
	)
}
