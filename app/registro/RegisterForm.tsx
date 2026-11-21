'use client'

import { useState } from 'react'
import Link from 'next/link'

import { getRecaptchaSiteKey } from '@/utils/supabase/config'
import { useRecaptcha } from '@/app/hooks/useRecaptcha'
import { createClient as createBrowserClient } from '@/utils/supabase/client'

const fieldClass =
	'w-full rounded-[1rem] border border-indigo-100 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-0 transition focus:border-[#1f2a9b] focus:shadow-[0_0_0_4px_rgba(31,42,155,0.12)]'

export default function RegisterForm() {
	const [fullName, setFullName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [terms, setTerms] = useState(false)
	const [privacy, setPrivacy] = useState(false)
	const [pending, setPending] = useState(false)
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const [okMsg, setOkMsg] = useState<string | null>(null)
	const [googlePending, setGooglePending] = useState(false)

	const siteKey = (() => {
		try {
			return getRecaptchaSiteKey()
		} catch {
			return null
		}
	})()
	const recaptchaLoaded = useRecaptcha(siteKey)

	// El botón de crear cuenta solo se habilita cuando todos los campos están completos.
	const isComplete =
		fullName.trim().length >= 2 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
		password.length >= 6 &&
		terms &&
		privacy

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setErrorMsg(null)
		setOkMsg(null)
		const emailVal = email.trim()
		const pwdVal = password
		const nameVal = fullName.trim()
		if (nameVal.length < 2) {
			setErrorMsg('Ingresa tu nombre completo.')
			return
		}
		if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
			setErrorMsg('Ingresa un correo válido.')
			return
		}
		if (pwdVal.length < 6) {
			setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
			return
		}
		if (!terms || !privacy) {
			setErrorMsg('Debes aceptar los Términos y la Política de Privacidad.')
			return
		}
		setPending(true)
		try {
			let captchaTok: string | null = null
			if (siteKey && recaptchaLoaded && window.grecaptcha) {
				try {
					captchaTok = await window.grecaptcha.execute(siteKey, { action: 'register' })
				} catch {
					captchaTok = null
				}
			}
			const res = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: emailVal,
					password: pwdVal,
					full_name: nameVal,
					terms_accepted: terms,
					privacy_accepted: privacy,
					captcha_token: captchaTok,
				}),
			})
			const json = (await res.json()) as {
				ok: boolean
				message?: string | null
				emailPending?: boolean
			}
			if (!json.ok) {
				setErrorMsg(json.message || 'No se pudo crear la cuenta.')
				return
			}
			setOkMsg(
				json.message ||
					'Cuenta creada. Revisa tu correo y haz clic en el enlace para confirmarla.'
			)
		} catch {
			setErrorMsg('No se pudo conectar. Revisa tu red e inténtalo de nuevo.')
		} finally {
			setPending(false)
		}
	}

	async function onGoogleSignIn() {
		setErrorMsg(null)
		setOkMsg(null)
		if (!terms || !privacy) {
			setErrorMsg('Debes aceptar los Términos y la Política de Privacidad.')
			return
		}
		setGooglePending(true)
		try {
			const sb = createBrowserClient()
			const { error } = await sb.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/api/auth/callback?next=/tienda`,
					queryParams: { prompt: 'select_account' },
				},
			})
			if (error) {
				setErrorMsg(error.message || 'No se pudo registrar con Google.')
				setGooglePending(false)
			}
		} catch {
			setErrorMsg('No se pudo conectar con Google. Inténtalo de nuevo.')
			setGooglePending(false)
		}
	}

	return (
		<form onSubmit={onSubmit} className="mt-6 space-y-4">
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
					Nombre completo <span className="text-rose-500">*</span>
				</span>
				<input
					type="text"
					autoComplete="name"
					value={fullName}
					onChange={(e) => setFullName(e.target.value)}
					className={fieldClass}
					placeholder="Ej. Jeferson Mendoza"
					required
				/>
			</label>

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
					Contraseña (mín. 6 caracteres) <span className="text-rose-500">*</span>
				</span>
				<input
					type="password"
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={fieldClass}
					placeholder="••••••••"
					required
					minLength={6}
				/>
			</label>

			<div className="space-y-2 pt-1">
				<label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-indigo-100 bg-indigo-50/40 px-4 py-3 hover:bg-indigo-50/80">
					<input
						type="checkbox"
						checked={terms}
						onChange={(e) => setTerms(e.target.checked)}
						className="mt-0.5 h-5 w-5 shrink-0 accent-[#1f2a9b]"
					/>
					<span className="text-[0.68rem] font-bold leading-5 text-slate-700">
						Acepto los{' '}
						<Link
							href="/terminos-y-condiciones"
							target="_blank"
							rel="noreferrer"
							className="font-black text-[#1f2a9b] underline underline-offset-4"
						>
							Términos y Condiciones
						</Link>{' '}
						(pago, envíos, cambios, devoluciones y pagos rechazados).
					</span>
				</label>

				<label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-indigo-100 bg-indigo-50/40 px-4 py-3 hover:bg-indigo-50/80">
					<input
						type="checkbox"
						checked={privacy}
						onChange={(e) => setPrivacy(e.target.checked)}
						className="mt-0.5 h-5 w-5 shrink-0 accent-[#1f2a9b]"
					/>
					<span className="text-[0.68rem] font-bold leading-5 text-slate-700">
						Acepto la{' '}
						<Link
							href="/politica-de-privacidad"
							target="_blank"
							rel="noreferrer"
							className="font-black text-[#1f2a9b] underline underline-offset-4"
						>
							Política de Privacidad
						</Link>{' '}
						y autorizo el tratamiento de mis datos de acuerdo a la Ley 29733.
					</span>
				</label>
			</div>

			<div className="grid gap-3 pt-1 sm:grid-cols-2">
				<button
					type="submit"
					disabled={pending || !isComplete}
					className={`w-full rounded-[1.2rem] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_30px_rgba(31,42,155,0.2)] transition ${
						pending || !isComplete
							? 'pointer-events-none bg-slate-300 shadow-none'
							: 'bg-[#1f2a9b] hover:bg-[#2B1F97]'
					}`}
				>
					{pending ? 'Creando…' : 'Crear cuenta'}
				</button>

				<button
					type="button"
					onClick={() => void onGoogleSignIn()}
					disabled={pending || googlePending}
					className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-indigo-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-800 shadow-[0_10px_24px_rgba(31,42,155,0.08)] transition hover:bg-indigo-50 disabled:pointer-events-none disabled:opacity-60"
				>
					<svg viewBox="0 0 48 48" aria-hidden="true" className="h-4 w-4 shrink-0">
						<path
							fill="#EA4335"
							d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
						/>
						<path
							fill="#4285F4"
							d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
						/>
						<path
							fill="#FBBC05"
							d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
						/>
						<path
							fill="#34A853"
							d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
						/>
					</svg>
					{googlePending ? 'Conectando…' : 'Continuar con Google'}
				</button>
			</div>
		</form>
	)
}
