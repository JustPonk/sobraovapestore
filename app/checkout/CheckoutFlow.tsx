'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { formatPEN } from '@/utils/format'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import {
	MAX_ADDRESSES_PER_USER,
	getRecaptchaSiteKey,
} from '@/utils/supabase/config'
import {
	createAddress,
	deleteAddress,
	getCurrentCart,
	listUserAddressesServer,
	placeOrderWithYape,
	submitPaymentProof,
	type ActionState,
	type CartPayload,
	type PlaceOrderInput,
} from '@/app/actions'

type Step = 'address' | 'confirm' | 'yape' | 'success'

interface Props {
	initialCart: CartPayload
	initialAddresses: Array<Record<string, unknown>>
	initialYapeAccount: { phone: string; holder_name: string; qr_image_url: string } | null
}

interface UserAddress {
	id: string
	full_name: string
	phone: string
	department: string
	province: string
	district: string
	line1: string
	line2: string | null
	zip_code: string | null
	reference: string | null
	is_default: boolean
}

const RECAPTCHA_SITE_KEY = (() => {
	try {
		return getRecaptchaSiteKey()
	} catch {
		return null
	}
})()

declare global {
	interface Window {
		grecaptcha?: {
			ready: (cb: () => void) => void
			execute: (siteKey: string, options: { action: string }) => Promise<string>
			render?: (container: HTMLElement | string, options: Record<string, unknown>) => number
			getResponse?: (widgetId?: number) => string
			reset?: (widgetId?: number) => void
		}
	}
}

const CheckoutCartSummary: React.FC<{ cart: CartPayload }> = ({ cart }) => {
	const totals = cart.totals
	// Agrupar líneas por combo para mostrarlas como una sola unidad.
	const groups = (() => {
		const result: Array<{ id: string; type: 'combo' | 'product'; comboName?: string; lines: typeof cart.lines }> = []
		const byCombo = new Map<string, typeof cart.lines>()
		for (const line of cart.lines) {
			if (line.combo_id) {
				const key = line.combo_instance_id ?? line.combo_id
				const arr = byCombo.get(key) ?? []
				arr.push(line)
				byCombo.set(key, arr)
			} else {
				result.push({ id: line.id, type: 'product', lines: [line] })
			}
		}
		for (const [comboId, lines] of byCombo) {
			result.push({ id: comboId, type: 'combo', comboName: lines[0]?.combo_name ?? 'Combo', lines })
		}
		return result
	})()
	return (
		<section className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,42,155,0.1)] sm:p-7">
			<p className="text-xs font-black uppercase tracking-[0.3em] text-[#1f2a9b]">Tu pedido</p>
			<ul className="mt-4 divide-y divide-indigo-50/80">
				{groups.map((group) => {
					if (group.type === 'product') {
						const l = group.lines[0]
						return (
							<li key={group.id} className="flex items-center justify-between gap-3 py-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-black text-[#101010]">{l.product?.name ?? l.variant?.sku}</p>
									<p className="mt-0.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
										{l.variant?.sku} · x {l.quantity}
									</p>
								</div>
								<p className="text-sm font-black text-[#1f2a9b]">{formatPEN(l.unit_price * l.quantity)}</p>
							</li>
						)
					}
					const lines = group.lines
					const comboTotal = lines.reduce((s, l) => s + (l.unit_price ?? 0) * (l.quantity ?? 0), 0)
					return (
						<li key={group.id} className="py-3">
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-black text-[#1f2a9b]">
										{group.comboName}
										<span className="ml-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-400">
											combo
										</span>
									</p>
									<ul className="mt-1 space-y-0.5">
										{lines.map((l) => (
											<li key={l.id} className="flex items-center gap-1.5 text-[0.72rem] text-slate-600">
												<span className="font-black text-slate-500">x{l.quantity}</span>
												<span className="truncate">{l.product?.name ?? l.variant?.sku}</span>
											</li>
										))}
									</ul>
								</div>
								<p className="shrink-0 text-sm font-black text-[#1f2a9b]">{formatPEN(comboTotal)}</p>
							</div>
						</li>
					)
				})}
				{cart.lines.length === 0 ? (
					<li className="py-5 text-center text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
						Sin productos en el carrito
					</li>
				) : null}
			</ul>
			<div className="mt-4 space-y-2 text-sm sm:text-base">
				<div className="flex items-center justify-between gap-4">
					<span className="font-bold text-slate-600">Subtotal</span>
					<span className="font-bold text-slate-900">{formatPEN(totals.subtotal)}</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="font-bold text-slate-600">Descuento</span>
					<span className="font-bold text-slate-900">{formatPEN(totals.discount_total)}</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="font-bold text-slate-600">IGV (18%)</span>
					<span className="font-bold text-slate-900">{formatPEN(totals.igv_total)}</span>
				</div>
				<div className="flex items-center justify-between gap-4">
					<span className="font-bold text-slate-600">Envío</span>
					<span className="font-bold text-slate-900">{formatPEN(totals.shipping_total)}</span>
				</div>
				<div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
				<div className="flex items-end justify-between gap-4">
					<span className="text-sm font-black uppercase tracking-[0.28em] text-[#1f2a9b] sm:text-base">Total</span>
					<span className="text-3xl font-black text-[#1f2a9b] sm:text-4xl">{formatPEN(totals.total)}</span>
				</div>
			</div>
		</section>
	)
}

const StepIndicator: React.FC<{ step: Step }> = ({ step }) => {
	const order: Array<Step> = ['address', 'confirm', 'yape', 'success']
	const labels: Record<Step, string> = {
		address: 'Dirección',
		confirm: 'Confirmar',
		yape: 'Pago Yape',
		success: 'Recibido',
	}
	const activeIdx = order.indexOf(step)
	return (
		<ol className="mx-auto flex max-w-[640px] items-center justify-between gap-2 rounded-[1.5rem] border border-white/70 bg-white/70 px-4 py-4 shadow-[0_14px_30px_rgba(31,42,155,0.08)] sm:px-6">
			{order.map((s, idx) => {
				const state = idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'pending'
				return (
					<li key={s} className="flex min-w-0 flex-1 items-center gap-2">
						<span
							className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black shadow-[0_10px_20px_rgba(31,42,155,0.08)] ${
								state === 'done'
									? 'bg-emerald-500 text-white'
									: state === 'active'
										? 'bg-[#1f2a9b] text-white'
										: 'bg-indigo-50 text-slate-500'
							}`}
						>
							{state === 'done' ? '✓' : idx + 1}
						</span>
						<span
							className={`truncate text-[10px] font-black uppercase tracking-[0.18em] sm:text-xs ${
								state === 'pending' ? 'text-slate-500' : 'text-[#1f2a9b]'
							}`}
						>
							{labels[s]}
						</span>
						{idx < order.length - 1 ? (
							<span className="ml-1 hidden h-px flex-1 bg-gradient-to-r from-indigo-200 via-indigo-300 to-transparent sm:block" />
						) : null}
					</li>
				)
			})}
		</ol>
	)
}

const LabeledField: React.FC<{
	label: string
	required?: boolean
	children: React.ReactNode
}> = ({ label, required, children }) => (
	<label className="block space-y-1.5">
		<span className="block text-xs font-black uppercase tracking-[0.22em] text-slate-600">
			{label} {required ? <span className="text-rose-500">*</span> : null}
		</span>
		{children}
	</label>
)

const fieldClass =
	'w-full rounded-[1rem] border border-indigo-100 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-0 transition focus:border-[#1f2a9b] focus:shadow-[0_0_0_4px_rgba(31,42,155,0.12)]'

function useRecaptchaReady(): { ready: boolean; execute: (action: string) => Promise<string | null> } {
	const [ready, setReady] = useState<boolean>(typeof window !== 'undefined' && !!window.grecaptcha)
	useEffect(() => {
		if (!RECAPTCHA_SITE_KEY) {
			setReady(true)
			return
		}
		if (typeof window === 'undefined') return
		if (window.grecaptcha) {
			setReady(true)
			return
		}
		const existing = document.querySelector<HTMLScriptElement>('script[data-sv-recaptcha="1"]')
		if (existing) return
		const s = document.createElement('script')
		s.async = true
		s.defer = true
		s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
		s.dataset.svRecaptcha = '1'
		s.onload = () => setReady(true)
		document.head.appendChild(s)
	}, [])
	const execute = async (action: string): Promise<string | null> => {
		if (!RECAPTCHA_SITE_KEY) return null
		if (!window.grecaptcha) return null
		await new Promise<void>((res) => {
			if (!window.grecaptcha) return res()
			window.grecaptcha.ready(() => res())
		})
		if (!window.grecaptcha) return null
		try {
			const tok = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
			return tok || null
		} catch {
			return null
		}
	}
	return { ready, execute }
}

export default function CheckoutFlow({ initialCart, initialAddresses, initialYapeAccount }: Props) {
	const [step, setStep] = useState<Step>('address')
	const [cart, setCart] = useState<CartPayload>(initialCart)
	const [addresses, setAddresses] = useState<UserAddress[]>(
		(initialAddresses as unknown as UserAddress[]) ?? []
	)
	const [yape, setYape] = useState(initialYapeAccount)

	const [addressMode, setAddressMode] = useState<'existing' | 'new' | 'guest'>('new')
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
	const [newAddress, setNewAddress] = useState({
		full_name: '',
		phone: '',
		email: '',
		department: '',
		province: '',
		district: '',
		line1: '',
		line2: '',
		zip: '',
		reference: '',
	})
	const [notes, setNotes] = useState('')
	const [termsAccepted, setTermsAccepted] = useState(false)
	const [privacyAccepted, setPrivacyAccepted] = useState(false)

	const [placeState, setPlaceState] = useState<
		| ActionState<{
				order_id: string
				order_number: string
				total: number
				currency: string
				payment_id: string
				contact_email: string
				contact_recipient_name: string | null
		  }>
		| null
	>(null)
	const [placePending, setPlacePending] = useState(false)
	const [placeGlobalError, setPlaceGlobalError] = useState<string | null>(null)

	const { execute: executeCaptcha } = useRecaptchaReady()

	async function placeOrderAndWait(payload: PlaceOrderInput): Promise<
		ActionState<{
			order_id: string
			order_number: string
			total: number
			currency: string
			payment_id: string
			contact_email: string
			contact_recipient_name: string | null
		}>
	> {
		setPlacePending(true)
		setPlaceGlobalError(null)
		try {
			const res = (await placeOrderWithYape(payload)) as ActionState<{
				order_id: string
				order_number: string
				total: number
				currency: string
				payment_id: string
				contact_email: string
				contact_recipient_name: string | null
			}>
			setPlaceState(res)
			if (!res.ok) setPlaceGlobalError(res.message || 'No se pudo generar el pedido.')
			return res
		} finally {
			setPlacePending(false)
		}
	}

	const placed = useMemo(
		() => (placeState && placeState.ok ? (placeState.data as NonNullable<typeof placeState.data>) : null),
		[placeState]
	)
	const placeError = useMemo(() => (placeState && !placeState.ok ? placeState.message : null), [placeState])

	const [providerReference, setProviderReference] = useState('')
	const [proofFile, setProofFile] = useState<File | null>(null)
	const [proofPreview, setProofPreview] = useState<string | null>(null)
	const [proofStatus, setProofStatus] = useState<'idle' | 'uploading' | 'submitting' | 'error' | 'ok'>('idle')
	const [proofError, setProofError] = useState<string | null>(null)
	const [successRefreshed, setSuccessRefreshed] = useState(false)

	const [postSignupState, setPostSignupState] = useState<{
		status: 'idle' | 'loading' | 'ok' | 'error'
		message?: string | null
	}>({ status: 'idle' })
	const [signupPassword, setSignupPassword] = useState('')
	const [signupName, setSignupName] = useState('')
	const [signupOptInShown, setSignupOptInShown] = useState(true)

	const [addressServerBusy, setAddressServerBusy] = useState(false)
	const [addressBanner, setAddressBanner] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)
	const [saveAddressOnConfirm, setSaveAddressOnConfirm] = useState(true)

	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [, startTransition] = useTransition()

	useEffect(() => {
		if (addresses.length && !selectedAddressId) {
			const def = addresses.find((a) => a.is_default) ?? addresses[0]
			if (def) {
				setSelectedAddressId(def.id)
				setAddressMode('existing')
				if (!newAddress.email) {
					setNewAddress((s) => ({ ...s, email: '' }))
				}
			}
		} else if (!addresses.length) {
			setAddressMode('new')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [addresses.length])

	useEffect(() => {
		if (cart.lines.length === 0 && successRefreshed === false) {
			startTransition(async () => {
				const latest = await getCurrentCart()
				setCart(latest)
				const addr = await listUserAddressesServer()
				if (addr.ok && Array.isArray(addr.data)) {
					setAddresses(addr.data as unknown as UserAddress[])
				}
			})
			setSuccessRefreshed(true)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const effectiveEmail = useMemo(() => {
		if (addressMode === 'existing' && selectedAddressId) {
			const a = addresses.find((x) => x.id === selectedAddressId)
			if (a?.['email' as keyof UserAddress]) return String(a['email' as keyof UserAddress])
		}
		return newAddress.email
	}, [addressMode, selectedAddressId, addresses, newAddress.email])

	const canGoConfirm = useMemo(() => {
		if (cart.lines.length === 0) return false
		if (!termsAccepted || !privacyAccepted) return false
		const email = effectiveEmail.trim()
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
		if (addressMode === 'existing') return Boolean(selectedAddressId)
		return Boolean(
			newAddress.full_name.trim() &&
				newAddress.phone.trim() &&
				newAddress.department.trim() &&
				newAddress.province.trim() &&
				newAddress.district.trim() &&
				newAddress.line1.trim()
		)
	}, [cart.lines.length, termsAccepted, privacyAccepted, effectiveEmail, addressMode, selectedAddressId, newAddress])

	const userHasAddresses = addresses.length > 0
	const hitAddressLimit = addresses.length >= MAX_ADDRESSES_PER_USER

	async function handleDeleteAddress(addressId: string) {
		if (!confirm('¿Eliminar esta dirección guardada?')) return
		setAddressServerBusy(true)
		setAddressBanner(null)
		try {
			const res = await deleteAddress(addressId)
			if (!res.ok) {
				setAddressBanner({ tone: 'error', text: res.message || 'No se pudo eliminar la dirección.' })
				return
			}
			const next = addresses.filter((a) => a.id !== addressId)
			setAddresses(next)
			if (selectedAddressId === addressId) {
				setSelectedAddressId(next[0]?.id ?? null)
				if (!next.length) setAddressMode('new')
			}
			setAddressBanner({ tone: 'ok', text: 'Dirección eliminada.' })
		} finally {
			setAddressServerBusy(false)
		}
	}

	const readIpAndUa = async (): Promise<{ ip: string | null; ua: string | null }> => {
		try {
			const ua = typeof navigator !== 'undefined' ? navigator.userAgent ?? null : null
			let ip: string | null = null
			try {
				const resp = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
				if (resp.ok) {
					const p = (await resp.json()) as { ip?: string } | null
					if (p?.ip) ip = p.ip
				}
			} catch {
				ip = null
			}
			return { ip, ua }
		} catch {
			return { ip: null, ua: null }
		}
	}

	const buildPlacePayload = async (): Promise<PlaceOrderInput> => {
		const { ip, ua } = await readIpAndUa()
		const contact_email = effectiveEmail.trim()
		const base: PlaceOrderInput = {
			address_mode: addressMode,
			address_id: addressMode === 'existing' ? selectedAddressId : null,
			notes: notes.trim() || null,
			contact_email,
			terms_accepted: termsAccepted,
			privacy_accepted: privacyAccepted,
			ip_address: ip,
			user_agent: ua,
			captcha_token: null,
		}
		if (addressMode === 'new' || addressMode === 'guest') {
			base.address_new = {
				full_name: newAddress.full_name.trim(),
				phone: newAddress.phone.trim(),
				department: newAddress.department.trim(),
				province: newAddress.province.trim(),
				district: newAddress.district.trim(),
				line1: newAddress.line1.trim(),
				line2: newAddress.line2.trim() || null,
				zip: newAddress.zip.trim() || null,
				reference: newAddress.reference.trim() || null,
			}
		}
		return base
	}

	const onProofPick = (file: File | null) => {
		setProofFile(file)
		setProofError(null)
		if (!file) {
			setProofPreview(null)
			return
		}
		const reader = new FileReader()
		reader.onload = (e) => setProofPreview(e.target?.result ? String(e.target.result) : null)
		reader.readAsDataURL(file)
	}

	const onSubmitProof = async () => {
		if (!placed) return
		if (!proofFile) {
			setProofError('Adjunta la captura del comprobante Yape.')
			return
		}
		if (!providerReference.trim()) {
			setProofError('Ingresa el número de operación que te dio Yape.')
			return
		}
		setProofStatus('uploading')
		setProofError(null)
		try {
			const fd = new FormData()
			fd.append('file', proofFile)
			fd.append('payment_id', placed.payment_id)
			fd.append('order_id', placed.order_id)
			const upRes = await fetch('/api/storage/payment-proof', {
				method: 'POST',
				body: fd,
			}).then((r) => r.json() as Promise<ActionState<{ payment_id: string; order_id: string; proof_url: string }>>)
			if (!upRes.ok) {
				setProofError(upRes.message || 'No se pudo guardar el comprobante.')
				setProofStatus('error')
				return
			}
			setProofStatus('submitting')
			const { ip, ua } = await readIpAndUa()
			const captchaToken = RECAPTCHA_SITE_KEY ? await executeCaptcha('yape_proof') : null
			const submit = await submitPaymentProof(
				placed.payment_id,
				placed.order_id,
				providerReference.trim(),
				upRes.data?.proof_url ?? '',
				{ captcha_token: captchaToken, ip_address: ip }
			)
			void ua
			if (!submit.ok) {
				setProofError(submit.message || 'No se pudo registrar el comprobante.')
				setProofStatus('error')
				return
			}
			setProofStatus('ok')
			setStep('success')
		} catch (e) {
			setProofError(e instanceof Error ? e.message : 'Error inesperado.')
			setProofStatus('error')
		}
	}

	const handleCreateAccount = async () => {
		if (!placed) return
		const email = placed.contact_email?.trim()
		if (!email) return
		const password = signupPassword
		if (password.length < 6) {
			setPostSignupState({ status: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' })
			return
		}
		const fullName =
			(signupName.trim() || placed.contact_recipient_name || '').trim() || 'Cliente Sobrao'
		setPostSignupState({ status: 'loading' })
		try {
			const sb = createBrowserClient()
			const { data, error } = await sb.auth.signUp({
				email,
				password,
				options: {
					data: { full_name: fullName },
					emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
				},
			})
			if (error) {
				if (/already registered|already exists|already been taken|duplicate/i.test(error.message || '')) {
					setPostSignupState({
						status: 'error',
						message:
							'Ya existe una cuenta con este correo. Puedes iniciar sesión desde el botón superior — tu pedido ya quedó registrado con nosotros sin cuenta de todos modos.',
					})
					return
				}
				setPostSignupState({ status: 'error', message: error.message || 'No se pudo crear la cuenta.' })
				return
			}
			void data
			setPostSignupState({
				status: 'ok',
				message:
					'Cuenta creada. Te enviamos un correo para confirmar tu dirección. Luego podrás iniciar sesión para ver el estado de tu pedido y guardar direcciones.',
			})
		} catch (e) {
			setPostSignupState({ status: 'error', message: e instanceof Error ? e.message : 'Error inesperado.' })
		}
	}

	return (
		<div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10">
			<div className="mx-auto grid max-w-[720px] lg:hidden lg:max-w-none">
				<StepIndicator step={step} />
			</div>

			{cart.lines.length === 0 && step !== 'success' ? (
				<div className="rounded-[1.8rem] border border-white/70 bg-white/75 p-6 text-center shadow-[0_18px_40px_rgba(31,42,155,0.08)]">
					<p className="text-xs font-black uppercase tracking-[0.24em] text-[#1f2a9b]">Sin productos para procesar</p>
					<p className="mt-3 text-sm font-semibold leading-7 text-slate-700 sm:text-base">
						Agrega productos desde la tienda para continuar con el checkout.
					</p>
					<Link
						href="/tienda"
						className="mt-4 inline-flex items-center justify-center rounded-[1.3rem] bg-[#1f2a9b] px-7 py-3 text-sm font-black uppercase tracking-[0.24em] text-white shadow-[0_14px_30px_rgba(31,42,155,0.28)] hover:bg-[#2B1F97]"
					>
						Ir a la tienda
					</Link>
				</div>
			) : null}

			{step === 'address' && cart.lines.length > 0 ? (
				<div className="mt-6 grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
					<div className="space-y-6 lg:col-span-7">
					<section className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,42,155,0.1)] sm:p-7">
						<p className="text-xs font-black uppercase tracking-[0.3em] text-[#1f2a9b]">Paso 1 · Datos de contacto y entrega</p>

						<div className="mt-4 flex flex-wrap gap-2">
							{userHasAddresses ? (
								<button
									type="button"
									onClick={() => setAddressMode('existing')}
									className={`rounded-full px-3.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] transition ${
										addressMode === 'existing'
											? 'bg-[#1f2a9b] text-white shadow-[0_14px_30px_rgba(31,42,155,0.25)]'
											: 'bg-indigo-50 text-slate-700 hover:bg-indigo-100'
									}`}
								>
									Mis direcciones ({addresses.length}/{MAX_ADDRESSES_PER_USER})
								</button>
							) : null}
							<button
								type="button"
								disabled={hitAddressLimit}
								onClick={() => setAddressMode('new')}
								title={
									hitAddressLimit
										? `Solo puedes tener ${MAX_ADDRESSES_PER_USER} direcciones guardadas. Elimina una antes.`
										: undefined
								}
								className={`rounded-full px-3.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] transition ${
									addressMode === 'new'
										? 'bg-[#1f2a9b] text-white shadow-[0_14px_30px_rgba(31,42,155,0.25)]'
										: hitAddressLimit
										? 'cursor-not-allowed bg-slate-100 text-slate-400'
										: 'bg-indigo-50 text-slate-700 hover:bg-indigo-100'
								}`}
							>
								Nueva dirección
							</button>
							{hitAddressLimit ? (
								<p className="w-full text-[0.74rem] font-black uppercase tracking-[0.2em] text-amber-700">
									· Llegaste al límite de {MAX_ADDRESSES_PER_USER} direcciones guardadas. Elimina una en "Mis direcciones" para agregar otra, o continúa sin guardar.
								</p>
							) : null}
							<button
								type="button"
								onClick={() => setAddressMode('guest')}
								className={`rounded-full px-3.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] transition ${
									addressMode === 'guest'
										? 'bg-[#1f2a9b] text-white shadow-[0_14px_30px_rgba(31,42,155,0.25)]'
										: 'bg-indigo-50 text-slate-700 hover:bg-indigo-100'
								}`}
							>
								Comprar como invitado
							</button>
						</div>

						<div className="mt-5 space-y-5">
							{addressMode === 'existing' ? (
								<div className="space-y-3">
									{addresses.map((a) => (
										<label
											key={a.id}
											className={`flex cursor-pointer items-start gap-3 rounded-[1.3rem] border px-4 py-4 transition ${
												selectedAddressId === a.id
													? 'border-[#1f2a9b] bg-indigo-50/70 shadow-[0_14px_30px_rgba(31,42,155,0.1)]'
													: 'border-indigo-100 bg-white hover:border-indigo-200'
											}`}
										>
											<input
												type="radio"
												name="address"
												className="mt-1 h-4 w-4 accent-[#1f2a9b]"
												checked={selectedAddressId === a.id}
												onChange={() => setSelectedAddressId(a.id)}
											/>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-black text-[#101010]">
													{a.full_name}{' '}
													{a.is_default ? (
														<span className="ml-2 rounded-full bg-[#1f2a9b]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#1f2a9b]">
															Predeterminada
														</span>
													) : null}
												</p>
												<p className="mt-0.5 text-xs font-bold text-slate-600">
													Teléfono: {a.phone}
												</p>
												<p className="mt-1 text-sm font-semibold leading-7 text-slate-800">
													{a.line1}
													{a.line2 ? ` · ${a.line2}` : null}
												</p>
												<p className="text-sm font-semibold leading-7 text-slate-700">
													{a.district} / {a.province} / {a.department}
													{a.zip_code ? ` · ${a.zip_code}` : null}
												</p>
												{a.reference ? (
													<p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
														Referencia: {a.reference}
													</p>
												) : null}
											</div>
											<button
												type="button"
												disabled={addressServerBusy}
												onClick={(e) => {
													e.preventDefault()
													e.stopPropagation()
													void handleDeleteAddress(a.id)
												}}
												className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-3 py-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
											>
												Eliminar
											</button>
										</label>
									))}
								</div>
							) : null}

							{addressMode === 'new' || addressMode === 'guest' ? (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<LabeledField label="Tu correo para el estado del pedido" required>
										<div className="space-y-2">
											<input
												type="email"
												value={newAddress.email}
												onChange={(e) => setNewAddress({ ...newAddress, email: e.target.value })}
												className={fieldClass}
												placeholder="tu.correo@ejemplo.com"
												autoComplete="email"
											/>
											<ul className="rounded-[1rem] bg-indigo-50/60 px-4 py-3 text-xs font-bold leading-6 text-slate-700 sm:text-[0.82rem]">
												<li>✉️ Enviamos aquí las alertas cuando:</li>
												<li>· tu pago Yape se aprueba / se rechaza</li>
												<li>· tu pedido sale para reparto</li>
												<li>· tu pedido fue entregado</li>
											</ul>
											<p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
												🤫 Nunca enviamos spam ni compartimos tus datos.
											</p>
										</div>
									</LabeledField>
									<div className="sm:col-span-2" />
									<LabeledField label="Nombre completo de quien recibe" required>
										<input
											type="text"
											value={newAddress.full_name}
											onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
											className={fieldClass}
											placeholder="Ej. Luis Mendoza"
											autoComplete="name"
										/>
									</LabeledField>
									<LabeledField label="Teléfono móvil" required>
										<input
											type="tel"
											value={newAddress.phone}
											onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
											className={fieldClass}
											placeholder="9XXXXXXXX"
											autoComplete="tel"
										/>
									</LabeledField>
									<LabeledField label="Departamento" required>
										<input
											type="text"
											value={newAddress.department}
											onChange={(e) => setNewAddress({ ...newAddress, department: e.target.value })}
											className={fieldClass}
											placeholder="Ej. Lima"
										/>
									</LabeledField>
									<LabeledField label="Provincia" required>
										<input
											type="text"
											value={newAddress.province}
											onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
											className={fieldClass}
											placeholder="Ej. Lima"
										/>
									</LabeledField>
									<LabeledField label="Distrito" required>
										<input
											type="text"
											value={newAddress.district}
											onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
											className={fieldClass}
											placeholder="Ej. Miraflores"
										/>
									</LabeledField>
									<LabeledField label="Código postal (opcional)">
										<input
											type="text"
											value={newAddress.zip}
											onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })}
											className={fieldClass}
											placeholder="Ej. 15074"
										/>
									</LabeledField>
									<div className="sm:col-span-2">
										<LabeledField label="Dirección (calle / número / lote / etc)" required>
											<input
												type="text"
												value={newAddress.line1}
												onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
												className={fieldClass}
												placeholder="Calle Principal 123 · Dpto 402"
												autoComplete="street-address"
											/>
										</LabeledField>
									</div>
									<div className="sm:col-span-2">
										<LabeledField label="Complemento (interior / manzana / etc · opcional)">
											<input
												type="text"
												value={newAddress.line2}
												onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
												className={fieldClass}
												placeholder="Ej. Interior 8, Mz K Lote 14"
											/>
										</LabeledField>
									</div>
									<div className="sm:col-span-2">
										<LabeledField label="Referencia para el delivery (opcional)">
											<textarea
												value={newAddress.reference}
												onChange={(e) => setNewAddress({ ...newAddress, reference: e.target.value })}
												className={`${fieldClass} min-h-[80px] resize-y`}
												placeholder="Frente a bodega El Sol / portón negro / timbre 2° piso"
											/>
										</LabeledField>
									</div>
									{addressMode === 'new' ? (
										<div className="sm:col-span-2">
											<label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-indigo-100 bg-indigo-50/40 px-4 py-3 hover:bg-indigo-50/80">
												<input
													type="checkbox"
													className="mt-0.5 h-5 w-5 shrink-0 accent-[#1f2a9b]"
													checked={saveAddressOnConfirm && !hitAddressLimit}
													disabled={hitAddressLimit}
													onChange={(e) => setSaveAddressOnConfirm(e.target.checked)}
												/>
												<div className="min-w-0 text-xs font-bold leading-6 text-slate-700 sm:text-sm">
													<p className="font-black uppercase tracking-[0.2em] text-[#1f2a9b]">
														Guardar dirección en mi cuenta
													</p>
													<p className="mt-1 text-[0.78rem] text-slate-600 sm:text-[0.82rem]">
														{hitAddressLimit
															? `Ya tienes ${MAX_ADDRESSES_PER_USER} direcciones guardadas (máximo permitido). Elimina una para volver a habilitar esta opción — igual podrás continuar sin guardar.`
															: `Puedes tener hasta ${MAX_ADDRESSES_PER_USER} direcciones guardadas. El resto de campos los reutilizaremos en tu próxima compra.`}
													</p>
												</div>
											</label>
										</div>
									) : null}
								</div>
							) : null}
						</div>
					</section>

					<section className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,42,155,0.1)] sm:p-7">
						<LabeledField label="Notas para tu pedido (opcional)">
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className={`${fieldClass} min-h-[80px] resize-y`}
								placeholder="Ej. sin bolsa por favor / dejar en portería"
							/>
						</LabeledField>
					</section>

					</div>

					<aside className="lg:sticky lg:top-32 lg:col-span-5 lg:h-fit space-y-6">
						<CheckoutCartSummary cart={cart} />
					</aside>

					<div className="space-y-6 lg:col-span-7">
					<section className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,42,155,0.1)] sm:p-7 space-y-3">
						<label className="flex cursor-pointer items-start gap-3 rounded-[1rem] px-3 py-3 hover:bg-indigo-50/60">
							<input
								type="checkbox"
								className="mt-0.5 h-5 w-5 shrink-0 accent-[#1f2a9b]"
								checked={termsAccepted}
								onChange={(e) => setTermsAccepted(e.target.checked)}
							/>
							<span className="text-sm font-semibold leading-6 text-slate-800">
								Acepto los{' '}
								<Link
									href="/terminos-y-condiciones"
									target="_blank"
									rel="noreferrer"
									className="font-black text-[#1f2a9b] underline underline-offset-4"
								>
									Términos y Condiciones
								</Link>{' '}
								(políticas de envío, cambios, devoluciones y pago rechazado).
							</span>
						</label>
						<label className="flex cursor-pointer items-start gap-3 rounded-[1rem] px-3 py-3 hover:bg-indigo-50/60">
							<input
								type="checkbox"
								className="mt-0.5 h-5 w-5 shrink-0 accent-[#1f2a9b]"
								checked={privacyAccepted}
								onChange={(e) => setPrivacyAccepted(e.target.checked)}
							/>
							<span className="text-sm font-semibold leading-6 text-slate-800">
								Acepto la{' '}
								<Link
									href="/politica-de-privacidad"
									target="_blank"
									rel="noreferrer"
									className="font-black text-[#1f2a9b] underline underline-offset-4"
								>
									Política de Privacidad
								</Link>{' '}
								(qué datos guardamos, para qué y tus derechos según Ley 29733).
							</span>
						</label>
						{(!termsAccepted || !privacyAccepted) && (
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
								Ambos consentimientos son obligatorios para finalizar la compra.
							</p>
						)}
					</section>

					{addressBanner ? (
						<div
							className={`rounded-[1.2rem] border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${
								addressBanner.tone === 'error'
									? 'border-rose-200 bg-rose-50 text-rose-800'
									: 'border-emerald-200 bg-emerald-50 text-emerald-800'
							}`}
						>
							{addressBanner.text}
						</div>
					) : null}

					<button
						type="button"
						disabled={!canGoConfirm || placePending || addressServerBusy}
						onClick={async () => {
							if (
								addressMode === 'new' &&
								saveAddressOnConfirm &&
								!hitAddressLimit
							) {
								setAddressServerBusy(true)
								setAddressBanner(null)
								try {
									const res = await createAddress({
										recipient_name: newAddress.full_name.trim(),
										recipient_phone: newAddress.phone.trim(),
										address_line: `${newAddress.line1.trim()}${
											newAddress.line2.trim() ? ` · ${newAddress.line2.trim()}` : ''
										}`,
										reference: newAddress.reference.trim() || null,
										district: newAddress.district.trim(),
										province: newAddress.province.trim(),
										department: newAddress.department.trim(),
										label: null,
									})
									if (!res.ok) {
										if (
											/reservado|límite|límite|máximo|elimina/i.test(
												res.message || ''
											)
										) {
											setAddressBanner({
												tone: 'error',
												text:
													res.message ||
													'Alcanzaste el límite de direcciones. Puedes continuar sin guardar, o eliminar una dirección existente.',
											})
										} else {
											setAddressBanner({
												tone: 'error',
												text:
													res.message ||
													'No se pudo guardar la dirección. Continuarás sin guardarla en tu cuenta.',
											})
										}
										setStep('confirm')
										return
									}
									if (res.data && typeof res.data === 'object' && 'id' in res.data) {
										const saved = res.data as { id: string }
										const addr = await listUserAddressesServer()
										if (addr.ok && Array.isArray(addr.data)) {
											const list = addr.data as unknown as UserAddress[]
											setAddresses(list)
											const created =
												list.find((x) => x.id === saved.id) ?? list[0] ?? null
											if (created) {
												setSelectedAddressId(created.id)
												setAddressMode('existing')
											}
										}
										setAddressBanner({
											tone: 'ok',
											text: 'Dirección guardada en tu cuenta.',
										})
									}
								} catch (e) {
									void e
									setAddressBanner({
										tone: 'error',
										text: 'No se pudo guardar la dirección. Continuarás sin guardarla.',
									})
								} finally {
									setAddressServerBusy(false)
								}
							}
							setStep('confirm')
						}}
						className={`w-full rounded-[1.5rem] px-7 py-4 text-sm font-black uppercase tracking-[0.26em] text-white shadow-[0_20px_42px_rgba(31,42,155,0.28)] transition sm:text-base ${
							canGoConfirm && !addressServerBusy
								? 'bg-[#1f2a9b] hover:bg-[#2B1F97]'
								: 'pointer-events-none bg-slate-300 shadow-none'
						}`}
					>
						{addressServerBusy
							? 'Guardando dirección en tu cuenta…'
							: 'Continuar a revisar pedido →'}
					</button>
					</div>
				</div>
			) : null}

			{step === 'confirm' && cart.lines.length > 0 ? (
				<form
					action={async (form: FormData) => {
						void form
						const payload = await buildPlacePayload()
						const captchaTok = RECAPTCHA_SITE_KEY ? await executeCaptcha('place_order') : null
						const res = await placeOrderAndWait({ ...payload, captcha_token: captchaTok })
						if (res && res.ok && res.data) setStep('yape')
					}}
					className="mt-6 grid w-full grid-cols-1 gap-6 lg:grid-cols-12"
				>
					<aside className="lg:sticky lg:top-32 lg:col-span-5 lg:h-fit space-y-6 lg:order-2">
						<CheckoutCartSummary cart={cart} />
					</aside>

					<div className="space-y-6 lg:col-span-7 lg:order-1">
					<section className="rounded-[1.6rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,42,155,0.1)] sm:p-7">
						<p className="text-xs font-black uppercase tracking-[0.3em] text-[#1f2a9b]">Dirección de entrega</p>
						{addressMode === 'existing' && selectedAddressId ? (
							(() => {
								const a = addresses.find((x) => x.id === selectedAddressId)
								if (!a) return null
								return (
									<div className="mt-4 space-y-1 text-sm font-semibold leading-7 text-slate-800">
										<p className="font-black text-[#101010]">{a.full_name}</p>
										<p>📧 {effectiveEmail || 'Sin correo'}</p>
										<p>📞 {a.phone}</p>
										<p>
											{a.line1}
											{a.line2 ? ` · ${a.line2}` : null}
										</p>
										<p>
											{a.district} / {a.province} / {a.department}
										</p>
										{a.reference ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Ref: {a.reference}</p> : null}
									</div>
								)
							})()
						) : (
							<div className="mt-4 space-y-1 text-sm font-semibold leading-7 text-slate-800">
								<p className="font-black text-[#101010]">{newAddress.full_name}</p>
								<p>📧 {effectiveEmail || 'Sin correo'}</p>
								<p>📞 {newAddress.phone}</p>
								<p>
									{newAddress.line1}
									{newAddress.line2 ? ` · ${newAddress.line2}` : null}
								</p>
								<p>
									{newAddress.district} / {newAddress.province} / {newAddress.department}
								</p>
								{newAddress.reference ? (
									<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Ref: {newAddress.reference}</p>
								) : null}
							</div>
						)}
						{notes.trim() ? (
							<div className="mt-4 rounded-[1rem] bg-indigo-50/70 px-4 py-3 text-sm font-semibold leading-7 text-slate-800">
								Notas: {notes.trim()}
							</div>
						) : null}
						{placeError || placeGlobalError ? (
							<div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-7 text-rose-700">
								{placeError || placeGlobalError}
							</div>
						) : null}
					</section>

					<section className="rounded-[1.6rem] border border-yellow-200/70 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 shadow-[0_18px_40px_rgba(234,179,8,0.08)] sm:p-7">
						<p className="text-xs font-black uppercase tracking-[0.3em] text-amber-800">Método de pago</p>
						<p className="mt-3 text-sm font-black text-[#1f2a9b] sm:text-base">
							💳 · Yape manual (verificación por nuestro equipo)
						</p>
						<p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
							Generarás el pedido y luego te mostraremos el QR oficial de Sobrao Vape. Pagas el monto exacto, subes la captura y el número de
							operación. Confirmamos el pago por ti en menos de <strong>6 horas</strong> en horario de atención.
						</p>
					</section>

					<div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
						<button
							type="button"
							onClick={() => setStep('address')}
							className="w-full rounded-[1.4rem] border border-indigo-100 bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.26em] text-[#1f2a9b] transition hover:bg-indigo-50 sm:w-auto sm:text-sm"
						>
							← Volver a dirección
						</button>
						<button
							type="submit"
							disabled={placePending}
							className="w-full rounded-[1.5rem] bg-[#1f2a9b] px-7 py-4 text-sm font-black uppercase tracking-[0.26em] text-white shadow-[0_20px_42px_rgba(31,42,155,0.28)] transition hover:bg-[#2B1F97] sm:w-auto sm:text-base disabled:bg-slate-300 disabled:shadow-none"
						>
							{placePending ? 'Reservando stock y generando pedido…' : 'Generar pedido y pagar con Yape →'}
						</button>
					</div>
					</div>
				</form>
			) : null}

			{step === 'yape' && placed ? (
				<section className="grid gap-6">
					<div className="rounded-[1.7rem] border border-white/70 bg-gradient-to-br from-white/90 via-white/90 to-indigo-50/90 p-6 text-center shadow-[0_24px_60px_rgba(31,42,155,0.12)] sm:p-9">
						<p className="text-xs font-black uppercase tracking-[0.34em] text-[#1f2a9b]">Pedido {placed.order_number}</p>
						<p className="mt-4 text-sm font-black uppercase tracking-[0.28em] text-emerald-700">
							Listo. Ahora realiza el pago con Yape
						</p>
						<div className="mt-7 mx-auto grid place-items-center rounded-[2rem] border-4 border-[#1f2a9b]/10 bg-white p-4 shadow-[0_20px_40px_rgba(31,42,155,0.1)] sm:max-w-[360px]">
							{yape?.qr_image_url ? (
								<div className="relative h-[280px] w-[280px]">
									<Image
										src={yape.qr_image_url}
										alt="QR de Yape de Sobrao Vape"
										fill
										sizes="280px"
										className="object-contain"
										priority
									/>
								</div>
							) : (
								<div className="grid h-[280px] w-[280px] place-items-center rounded-[1.4rem] bg-[radial-gradient(circle,rgba(31,42,155,0.12),transparent_70%)] px-5 text-center">
									<div className="space-y-2">
										<p className="text-xs font-black uppercase tracking-[0.22em] text-[#1f2a9b]">Número Yape</p>
										<p className="text-3xl font-black text-[#1f2a9b]">{yape?.phone || 'Configurar en panel'}</p>
										<p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
											Titular: {yape?.holder_name || 'Titular Sobrao'}
										</p>
									</div>
								</div>
							)}
						</div>
						<div className="mt-7 mx-auto grid w-full max-w-[520px] gap-4">
							<p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Monto exacto a pagar</p>
							<p className="text-5xl font-black text-[#1f2a9b] sm:text-7xl">{formatPEN(placed.total)}</p>
							<div className="rounded-[1.5rem] border border-indigo-100 bg-white px-5 py-4 text-left text-sm font-semibold leading-7 text-slate-800 sm:text-base">
								<p>
									Escanea este código con tu app de Yape.{' '}
									<strong className="text-[#1f2a9b]">
										Antes de confirmar el pago, verifica que el nombre que aparezca sea{' '}
										{yape?.holder_name ? `"${yape.holder_name}"` : '"El titular de Sobrao Vape"'}
									</strong>{' '}
									— así te aseguras que el pago va a la cuenta correcta.
								</p>
								<p className="mt-3">
									El QR es fijo, por lo que tienes que <strong>escribir manualmente el monto exacto</strong> dentro de tu app de Yape
									antes de confirmar. Copia el número arriba si tienes dudas.
								</p>
								<p className="mt-3">
									Tu pedido quedará <strong>en revisión</strong> hasta que cotejemos el pago en nuestra app de Yape. En horario de
									atención esto suele tomar{' '}
									<strong className="text-emerald-700">menos de 6 horas</strong>.
								</p>
							</div>
						</div>
					</div>

					<section className="rounded-[1.7rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_40px_rgba(31,42,155,0.1)] sm:p-7">
						<p className="text-xs font-black uppercase tracking-[0.3em] text-[#1f2a9b]">Sube tu comprobante</p>
						{proofStatus === 'ok' ? (
							<p className="mt-4 rounded-[1.2rem] bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
								Comprobante registrado correctamente.
							</p>
						) : null}
						{proofError ? (
							<p className="mt-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
								{proofError}
							</p>
						) : null}

						<div className="mt-5 grid gap-5">
							<div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:items-center">
								<div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-[1.2rem] border-2 border-dashed border-indigo-200 bg-indigo-50/60 sm:h-[200px] sm:w-[200px]">
									{proofPreview ? (
										<Image
											src={proofPreview}
											alt="Previsualización de comprobante Yape"
											fill
											className="object-contain"
										/>
									) : (
										<div className="grid h-full w-full place-items-center px-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
											Arrastra la captura<br />o usa el botón
										</div>
									)}
								</div>
								<div className="space-y-3">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*,.pdf"
										style={{ display: 'none' }}
										onChange={(e) => onProofPick(e.target.files?.[0] ?? null)}
									/>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="w-full rounded-[1.3rem] bg-indigo-50 px-6 py-3.5 text-xs font-black uppercase tracking-[0.22em] text-[#1f2a9b] transition hover:bg-indigo-100 sm:text-sm"
									>
										{proofFile ? 'Cambiar comprobante…' : 'Subir captura o PDF de Yape'}
									</button>
									<p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
										{proofFile ? `Archivo: ${proofFile.name}` : 'Formato recomendado: captura JPG/PNG hasta 8MB.'}
									</p>
								</div>
							</div>

							<LabeledField label="Número de operación Yape (número largo que Yape te muestra)" required>
								<input
									type="text"
									value={providerReference}
									onChange={(e) => setProviderReference(e.target.value)}
									className={fieldClass}
									placeholder="Ej. 2560041239"
								/>
							</LabeledField>
						</div>

						<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								disabled={proofStatus === 'uploading' || proofStatus === 'submitting' || proofStatus === 'ok'}
								onClick={() => {
									setProofStatus('idle')
									setProofError(null)
									setStep('confirm')
								}}
								className="w-full rounded-[1.3rem] border border-indigo-100 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-[0.22em] text-[#1f2a9b] transition hover:bg-indigo-50 sm:w-auto sm:text-sm"
							>
								← Volver al resumen
							</button>
							<button
								type="button"
								disabled={proofStatus !== 'idle' && proofStatus !== 'error'}
								onClick={() => startTransition(onSubmitProof)}
								className={`w-full rounded-[1.5rem] px-7 py-4 text-sm font-black uppercase tracking-[0.26em] text-white shadow-[0_20px_42px_rgba(31,42,155,0.28)] transition sm:w-auto sm:text-base ${
									proofStatus === 'uploading' || proofStatus === 'submitting'
										? 'bg-slate-400 shadow-none'
										: 'bg-[#1f2a9b] hover:bg-[#2B1F97]'
								}`}
							>
								{proofStatus === 'uploading'
									? 'Subiendo comprobante a storage seguro…'
									: proofStatus === 'submitting'
										? 'Registrando comprobante…'
										: proofStatus === 'ok'
											? 'Comprobante enviado ✓'
											: 'Enviar comprobante y finalizar →'}
							</button>
						</div>
					</section>
				</section>
			) : null}

			{step === 'success' && placed ? (
				<section className="grid gap-6">
					<div className="rounded-[1.8rem] border border-emerald-200/70 bg-gradient-to-br from-white via-white to-emerald-50 p-7 text-center shadow-[0_24px_60px_rgba(16,185,129,0.12)] sm:p-10">
						<p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-700">Pedido recibido · verificando pago</p>
						<p className="mt-4 text-3xl font-black text-[#1f2a9b] sm:text-4xl">{placed.order_number}</p>
						<p className="mt-5 text-base font-semibold leading-8 text-slate-800 sm:text-lg">
							¡Listo! Hemos recibido tu comprobante Yape.{' '}
							<strong className="text-emerald-700">Aún no se ha confirmado el pago</strong> — nuestro equipo lo revisará manualmente y te
							avisaremos por correo cuando quede aprobado / rechazado.
						</p>
						<div className="mt-6 mx-auto grid max-w-[520px] gap-3 text-left rounded-[1.5rem] border border-emerald-100 bg-white px-5 py-4 text-sm font-semibold leading-7 text-slate-800 sm:text-base">
							<p>
								<span className="font-black text-[#101010]">Correo registrado:</span>{' '}
								<span className="text-[#1f2a9b] break-all">{placed.contact_email}</span>
							</p>
							<p>
								<span className="font-black text-[#101010]">Monto del pedido:</span>{' '}
								<span className="text-[#1f2a9b]">{formatPEN(placed.total)}</span>
							</p>
							<p>
								<span className="font-black text-[#101010]">Método:</span> Yape · verificación manual
							</p>
							<p>
								<span className="font-black text-[#101010]">Tiempo estimado:</span> menos de 6 horas en horario de atención
							</p>
						</div>

						{signupOptInShown ? (
							<div className="mt-7 rounded-[1.6rem] border border-indigo-100 bg-white p-5 text-left shadow-[0_18px_40px_rgba(31,42,155,0.08)] sm:p-7">
								<p className="text-xs font-black uppercase tracking-[0.28em] text-[#1f2a9b]">
									🎉 Guarda tus datos para la próxima compra
								</p>
								<p className="mt-3 text-sm font-semibold leading-7 text-slate-800 sm:text-base">
									¿Quieres convertir este pedido en tu cuenta permanente? Con una cuenta podrás:
								</p>
								<ul className="mt-2 space-y-1 text-sm font-semibold leading-7 text-slate-800 sm:text-base">
									<li>• Ver el estado de tu envío siempre desde este mismo navegador</li>
									<li>• Guardar direcciones y no volver a escribirlas</li>
									<li>• Ofertas exclusivas para clientes registrados</li>
								</ul>
								<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
									<LabeledField label="Nombre para tu cuenta (se sugiere el del pedido)">
										<input
											type="text"
											value={signupName}
											placeholder={placed.contact_recipient_name || 'Tu nombre'}
											onChange={(e) => setSignupName(e.target.value)}
											className={fieldClass}
											autoComplete="name"
										/>
									</LabeledField>
									<LabeledField label="Contraseña (mínimo 6 caracteres)" required>
										<input
											type="password"
											value={signupPassword}
											onChange={(e) => setSignupPassword(e.target.value)}
											className={fieldClass}
											autoComplete="new-password"
											placeholder="••••••••"
										/>
									</LabeledField>
								</div>
								{postSignupState.status !== 'idle' ? (
									<div
										className={`mt-3 rounded-[1.2rem] px-4 py-3 text-sm font-bold ${
											postSignupState.status === 'ok'
												? 'bg-emerald-50 text-emerald-700'
												: postSignupState.status === 'error'
													? 'bg-rose-50 text-rose-700'
													: 'bg-amber-50 text-amber-700'
										}`}
									>
										{postSignupState.status === 'loading'
											? 'Creando tu cuenta…'
											: postSignupState.message}
									</div>
								) : null}
								<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
									<button
										type="button"
										disabled={postSignupState.status === 'loading'}
										onClick={() => {
											setSignupOptInShown(false)
											setPostSignupState({ status: 'idle' })
										}}
										className="w-full rounded-[1.3rem] border border-indigo-100 bg-white px-6 py-3.5 text-xs font-black uppercase tracking-[0.22em] text-[#1f2a9b] transition hover:bg-indigo-50 sm:w-auto sm:text-sm"
									>
										No, gracias
									</button>
									<button
										type="button"
										onClick={() => startTransition(handleCreateAccount)}
										disabled={
											!placed.contact_email ||
											postSignupState.status === 'loading' ||
											postSignupState.status === 'ok' ||
											signupPassword.length < 6
										}
										className="w-full rounded-[1.4rem] bg-[#1f2a9b] px-7 py-3.5 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(31,42,155,0.26)] transition hover:bg-[#2B1F97] disabled:bg-slate-300 disabled:shadow-none sm:w-auto sm:text-sm"
									>
										{postSignupState.status === 'loading'
											? 'Creando cuenta…'
											: postSignupState.status === 'ok'
												? 'Cuenta creada ✓'
												: 'Crear cuenta y guardar mis datos'}
									</button>
								</div>
							</div>
						) : null}

						<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
							<Link
								href="/tienda"
								className="inline-flex items-center justify-center rounded-[1.4rem] border border-indigo-100 bg-white px-7 py-3.5 text-xs font-black uppercase tracking-[0.24em] text-[#1f2a9b] transition hover:bg-indigo-50 sm:text-sm"
							>
								Seguir comprando
							</Link>
							<Link
								href="/"
								className="inline-flex items-center justify-center rounded-[1.4rem] bg-[#1f2a9b] px-7 py-3.5 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(31,42,155,0.26)] transition hover:bg-[#2B1F97] sm:text-sm"
							>
								Volver al inicio →
							</Link>
						</div>
					</div>
				</section>
			) : null}
		</div>
	)
}
