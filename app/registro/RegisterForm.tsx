'use client'

import { useState } from 'react'
import Link from 'next/link'

import { getRecaptchaSiteKey } from '@/utils/supabase/config'
import { useRecaptcha } from '@/app/hooks/useRecaptcha'

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

	const siteKey = (() => {
		try {
			return getRecaptchaSiteKey()
		} catch {
			return null
		}
	})()
	const recaptchaLoaded = useRecaptcha(siteKey)

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
					<span className="text-xs font-bold leading-6 text-slate-700 sm:text-sm">
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
					<span className="text-xs font-bold leading-6 text-slate-700 sm:text-sm">
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

			<button
				type="submit"
				disabled={pending}
				className={`w-full rounded-[1.5rem] px-6 py-4 text-sm font-black uppercase tracking-[0.26em] text-white shadow-[0_20px_42px_rgba(31,42,155,0.28)] transition ${
					pending
						? 'pointer-events-none bg-slate-400 shadow-none'
						: 'bg-[#1f2a9b] hover:bg-[#2B1F97]'
				}`}
			>
				{pending ? 'Creando cuenta…' : 'Crear cuenta →'}
			</button>
		</form>
	)
}
