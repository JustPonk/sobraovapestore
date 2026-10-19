'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

import { formatPEN } from '@/utils/format'
import {
	getCurrentCart,
	removeCartLine,
	syncLocalCartToDb,
	updateCartLineQty,
	type ActionState,
	type CartPayload,
} from '@/app/actions'
import {
	getStoredCart,
	removeComboInstanceFromCart,
	removeStoredItem,
	type StoreCartItem,
	updateStoredItemQty,
} from '@/app/locale/store/cartStorage'

interface CartViewProps {
	showBuyNowMessage?: boolean
	initialCart: CartPayload | null
}

const EmptyCart: React.FC = () => (
	<div className="flex flex-col items-center gap-4 rounded-[1.4rem] border border-white/70 bg-white/75 px-6 py-12 text-center shadow-[0_12px_30px_rgba(31,42,155,0.08)]">
		<div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-indigo-500/15 to-fuchsia-400/10 text-3xl">
			🧺
		</div>
		<p className="text-[0.72rem] font-black uppercase tracking-[0.3em] text-[#1f2a9b]">
			Tu carrito está vacío
		</p>
		<p className="max-w-sm text-sm leading-7 text-slate-600 sm:text-base">
			Añade productos desde la tienda. Los totales se calculan automáticamente con stock en
			tiempo real.
		</p>
		<Link
			href="/tienda"
			className="mt-2 inline-flex items-center justify-center rounded-[1.1rem] bg-[#1f2a9b] px-7 py-2.5 text-[0.72rem] font-black uppercase tracking-[0.24em] text-white shadow-[0_10px_26px_rgba(31,42,155,0.28)] transition hover:bg-[#2B1F97]"
		>
			Ir a la tienda
		</Link>
	</div>
)

export default function CartView({ showBuyNowMessage = false, initialCart }: CartViewProps) {
	const [cart, setCart] = useState<CartPayload | null>(initialCart)
	const [pendingMap, setPendingMap] = useState<Record<string, 'update' | 'remove'>>({})
	const [, startTransition] = useTransition()

	const [syncState, setSyncState] = useState<ActionState<CartPayload> | null>(null)
	const [isSyncPending, setIsSyncPending] = useState(false)

	// Al hidratar sincronizamos carrito local y refrescamos datos desde el server
	const syncStoredCartAndFetchLatest = useCallback(async () => {
		try {
			setIsSyncPending(true)
			const stored = getStoredCart()
			if (stored.length > 0) {
				const res = await syncLocalCartToDb(
					stored.map((x: StoreCartItem) => ({
						variant_id: x.variantId,
						quantity: x.quantity,
						unit_price: x.price ?? null,
						combo_id: x.comboId ?? null,
						combo_name: x.comboName ?? null,
						combo_instance_id: x.comboInstanceId ?? null,
					}))
				)
				setSyncState(res)
				if (res.ok && res.data) {
					const payload = res.data as CartPayload
					setCart(payload)
					return
				}
			}
			const latest = await getCurrentCart()
			setCart(latest)
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'No se pudo conectar con el carrito en el servidor.'
			setSyncState({ ok: false, message })
		} finally {
			setIsSyncPending(false)
		}
	}, [])

	useEffect(() => {
		startTransition(() => {
			void syncStoredCartAndFetchLatest()
		})
		const onUpdated = () => {
			startTransition(() => {
				void syncStoredCartAndFetchLatest()
			})
		}
		window.addEventListener('sobrao-cart-updated', onUpdated)
		return () => window.removeEventListener('sobrao-cart-updated', onUpdated)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		if (!syncState) return
		if (syncState.ok && syncState.data) {
			setCart(syncState.data as CartPayload)
		}
	}, [syncState])

	const totals = cart?.totals
	const items = cart?.lines ?? []
	const storedCount = typeof window !== 'undefined' ? getStoredCart().length : 0

	const onQty = (lineId: string, variantId: string, nextQty: number, comboId?: string | null) => {
		setPendingMap((m) => ({ ...m, [lineId]: 'update' }))
		startTransition(async () => {
			const res = await updateCartLineQty(lineId, nextQty)
			if (res.ok && res.data) {
				// Update BOTH React state AND localStorage to keep previews and page refresh consistent
				setCart(res.data as CartPayload)
				const clamped = Math.max(1, Math.floor(Number(nextQty) || 1))
				updateStoredItemQty(variantId, clamped, comboId ?? null)
			}
			setPendingMap((m) => {
				const copy = { ...m }
				delete copy[lineId]
				return copy
			})
		})
	}

	const onRemove = (lineId: string, variantId: string, comboId?: string | null, comboInstanceId?: string | null) => {
		setPendingMap((m) => ({ ...m, [lineId]: 'remove' }))
		startTransition(async () => {
			const res = await removeCartLine(lineId)
			if (res.ok && res.data) {
				setCart(res.data as CartPayload)
				if (comboInstanceId) {
					removeComboInstanceFromCart(comboInstanceId)
				} else {
					removeStoredItem(variantId, comboId ?? null)
				}
			}
			setPendingMap((m) => {
				const copy = { ...m }
				delete copy[lineId]
				return copy
			})
		})
	}

	const canCheckout = useMemo(() => {
		if (!items.length) return false
		return items.every(
			(l) => (l.available_stock == null ? true : l.available_stock >= l.quantity)
		)
	}, [items])

	// Agrupar líneas por combo para mostrarlas como una sola unidad.
	// Cada combo agregado usa su propio combo_instance_id, de modo que queda aislado.
	const groups = useMemo(() => {
		const result: Array<{
			id: string
			type: 'combo' | 'product'
			comboInstanceId?: string | null
			comboName?: string
			lines: typeof items
		}> = []
		const byCombo = new Map<string, typeof items>()
		for (const line of items) {
			if (line.combo_id) {
				const key = line.combo_instance_id ?? line.combo_id
				const arr = byCombo.get(key) ?? []
				arr.push(line)
				byCombo.set(key, arr)
			} else {
				result.push({ id: line.id, type: 'product', lines: [line] })
			}
		}
		for (const [key, lines] of byCombo) {
			result.push({
				id: key,
				type: 'combo',
				comboInstanceId: lines[0]?.combo_instance_id ?? null,
				comboName: lines[0]?.combo_name ?? 'Combo',
				lines,
			})
		}
		return result
	}, [items])

	function stockBadge(stock: number | null | undefined) {
		if (stock == null) return null
		if (stock <= 0) return { text: 'Agotado', className: 'text-rose-600' }
		if (stock < 5) return { text: 'Casi agotado', className: 'text-amber-600' }
		return { text: 'Hay stock', className: 'text-emerald-600' }
	}

	const hasDroppedMessage = Boolean(
		syncState?.ok && syncState?.message && syncState.message.includes('omitieron')
	)
	const bannerLevel = (() => {
		if (syncState && !syncState.ok) return 'error'
		if (isSyncPending) return 'info'
		if (showBuyNowMessage && items.length > 0 && !hasDroppedMessage) return 'success'
		if (hasDroppedMessage) return 'warn'
		if (storedCount > 0 && items.length === 0) return 'warn'
		if (showBuyNowMessage) return 'info'
		return null
	})()

	return (
		<div className="mx-auto w-full max-w-[1440px] px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10">
			{bannerLevel ? (
				<div
					className={`mb-5 rounded-[1.1rem] border px-4 py-3 text-sm font-bold ${
						bannerLevel === 'error'
							? 'border-rose-200 bg-rose-50 text-rose-700'
							: bannerLevel === 'warn'
								? 'border-amber-200 bg-amber-50 text-amber-800'
								: bannerLevel === 'success'
									? 'border-emerald-200 bg-emerald-50 text-emerald-800'
									: 'border-[#7dd8ff]/60 bg-[#eef9ff] text-[#1f2a9b]'
					}`}
				>
					{bannerLevel === 'error' && syncState && !syncState.ok ? (
						<>
							<p className="mb-1 uppercase tracking-[0.2em] text-[0.66rem] opacity-80">
								No se pudo sincronizar
							</p>
							<p>{syncState.message ?? 'Error inesperado al cargar el carrito.'}</p>
							<button
								type="button"
								onClick={() => void syncStoredCartAndFetchLatest()}
								className="mt-2 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-rose-700"
							>
								Reintentar
							</button>
						</>
					) : bannerLevel === 'warn' && hasDroppedMessage && syncState?.message ? (
						<>
							<p className="mb-1 uppercase tracking-[0.18em] text-[0.66rem] opacity-80">
								Algunos productos no se agregaron
							</p>
							<p className="whitespace-pre-wrap leading-relaxed">{syncState.message}</p>
							<button
								type="button"
								onClick={() => void syncStoredCartAndFetchLatest()}
								className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-amber-700"
							>
								Volver a sincronizar
							</button>
						</>
					) : bannerLevel === 'warn' ? (
						<>
							<p className="mb-1 uppercase tracking-[0.18em] text-[0.66rem] opacity-80">
								Producto en cola
							</p>
							<p>
								Tienes {storedCount} producto
								{storedCount === 1 ? '' : 's'} pendiente
								{storedCount === 1 ? '' : 's'} en tu navegador. Si no se agregan automáticamente,
								es probable que no haya stock disponible.
							</p>
							<button
								type="button"
								onClick={() => void syncStoredCartAndFetchLatest()}
								className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-amber-700"
							>
								Volver a sincronizar
							</button>
						</>
					) : bannerLevel === 'success' ? (
						'El producto fue agregado y quedó listo para continuar con tu compra.'
					) : showBuyNowMessage && isSyncPending ? (
						'Agregando tu producto al carrito y sincronizando stock…'
					) : showBuyNowMessage ? (
						'Sincronizando tu compra con el inventario…'
					) : (
						'Sincronizando productos del navegador con tu carrito…'
					)}
				</div>
			) : null}

			{!items.length ? <EmptyCart /> : null}

			{items.length ? (
				<div className="mx-auto w-full max-w-[1280px]">
					<nav
						aria-label="Flujo de compra"
						className="mb-6 flex w-full items-center justify-center gap-3 text-center text-sm font-semibold sm:gap-4 sm:text-base"
					>
						<span className="text-lg font-black uppercase tracking-[0.22em] text-[#111111] sm:text-xl">
							Carrito
						</span>
						<span className="text-slate-300">›</span>
						<span className="text-slate-400 uppercase tracking-[0.18em] sm:font-bold">
							Recojo o Delivery
						</span>
						<span className="text-slate-300">›</span>
						<span className="text-slate-300 uppercase tracking-[0.18em]">
							Orden completada
						</span>
					</nav>

				<div className="grid w-full gap-5 lg:grid-cols-12 lg:items-start">
					{/* Left: Productos */}
				<section className="lg:col-span-7 space-y-5">
						<div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 rounded-t-[1.3rem] border border-b-0 border-white/80 bg-white/40 px-4 py-3.5 text-xs font-black uppercase tracking-[0.22em] text-slate-700 sm:px-5 sm:text-[0.7rem] md:grid">
							<div className="pl-2">Producto</div>
							<div className="text-center">Precio</div>
							<div className="text-center">Cantidad</div>
							<div className="pr-2 text-right">Subtotal</div>
						</div>

						<div className="space-y-3">
							{groups.map((group) => {
								if (group.type === 'product') {
									const line = group.lines[0]
									const variant = line.variant
									const product = line.product
									const img = variant?.primary_image ?? '/itemhero.png'
									const attributes = (variant?.attributes ?? []).slice(0, 3)
									const isPending = Boolean(pendingMap[line.id])
									const unitSubtotal = line.unit_price * line.quantity
									const compareAt =
										variant &&
										typeof variant.compare_at_price === 'number' &&
										variant.compare_at_price > line.unit_price
											? variant.compare_at_price
											: null
									const badge = stockBadge(line.available_stock)
									const productHref = product?.slug ? `/producto/${product.slug}` : '/tienda'
									return (
										<article
											key={line.id}
											className={`relative grid grid-cols-1 gap-3 rounded-[1.3rem] border border-white/70 bg-white/90 p-3.5 shadow-[0_6px_18px_rgba(31,42,155,0.05)] sm:p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:rounded-none md:border-t-0 md:shadow-none md:last:rounded-b-[1.3rem] md:last:border ${
												isPending ? 'opacity-60' : ''
											}`}
										>
											<button
												type="button"
												onClick={() => onRemove(line.id, variant?.id ?? '', null)}
												className="absolute right-3 top-3 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 shadow transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 md:right-4 md:top-4"
												disabled={isPending}
												aria-label="Eliminar producto"
											>
												✕
											</button>

											<div className="flex items-start gap-3 md:gap-4">
												<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[0.9rem] bg-[#f4f0ff] sm:h-24 sm:w-24">
													<Image
														src={img}
														alt={product?.name ?? variant?.sku ?? ''}
														fill
														className="object-contain p-2"
														sizes="96px"
													/>
												</div>
												<div className="min-w-0 flex-1 pt-1">
													<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
														Producto
													</p>
													<Link
														href={productHref}
														className="text-[0.96rem] font-black leading-snug text-[#111111] transition hover:text-[#1f2a9b] sm:text-[1.02rem]"
													>
														{product?.name ?? variant?.sku}
													</Link>
													{attributes.length ? (
														<p className="mt-1 line-clamp-2 text-[0.78rem] font-semibold text-slate-600">
															{attributes
																.map((a) => `${a.name}: ${a.value}`)
																.join(' · ')}
														</p>
													) : null}
													{badge ? (
														<p
															className={`mt-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${badge.className}`}
														>
															{badge.text}
														</p>
													) : null}
												</div>
											</div>

											<div className="md:text-center">
												<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
													Precio
												</p>
												{compareAt ? (
													<p className="text-xs font-bold line-through text-slate-400">
														{formatPEN(compareAt)}
													</p>
												) : null}
												<p className="text-sm font-black text-[#111111] sm:text-base">
													{formatPEN(line.unit_price)}
												</p>
											</div>

											<div className="md:flex md:justify-center">
												<div>
													<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
														Cantidad
													</p>
													<div className="inline-flex items-center border border-slate-300 bg-white">
														<button
															type="button"
															className="grid h-10 w-10 place-items-center text-base font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 sm:h-11 sm:w-11"
															disabled={line.quantity <= 1 || isPending}
															onClick={() =>
																onQty(line.id, variant?.id ?? '', line.quantity - 1, null)
															}
															aria-label="Restar una unidad"
														>
															−
														</button>
														<span className="min-w-[2.4ch] px-1 text-center text-sm font-black text-[#111111] sm:text-base">
															{line.quantity}
														</span>
														<button
															type="button"
															className="grid h-10 w-10 place-items-center text-base font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 sm:h-11 sm:w-11"
															disabled={
																isPending ||
																(line.available_stock != null &&
																	line.quantity >= line.available_stock)
															}
															onClick={() =>
																onQty(line.id, variant?.id ?? '', line.quantity + 1, null)
															}
															aria-label="Sumar una unidad"
														>
															+
														</button>
													</div>
												</div>
											</div>

											<div className="md:text-right">
												<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
													Subtotal
												</p>
												<p className="text-sm font-black text-[#111111] sm:text-base">
													{formatPEN(unitSubtotal)}
												</p>
											</div>
										</article>
									)
								}

								// ── Grupo de combo ──────────────────────────────────────
								const lines = group.lines
								const representative = lines[0]
								const comboTotal = lines.reduce(
									(s, l) => s + (l.unit_price ?? 0) * (l.quantity ?? 0),
									0
								)
								const comboImg = representative?.variant?.primary_image ?? '/itemhero.png'
								const isPending = Boolean(pendingMap[representative?.id ?? ''])
								const minAvailable = lines.reduce(
									(acc, l) =>
										Math.min(acc, l.available_stock == null ? Infinity : l.available_stock),
									Infinity
								)
								const badge = stockBadge(
									Number.isFinite(minAvailable) ? minAvailable : null
								)
								const comboId = representative?.combo_id ?? null
								return (
									<article
										key={group.id}
										className={`relative grid grid-cols-1 gap-3 rounded-[1.3rem] border border-[#ffe8c7] bg-[#fffbf3] p-3.5 shadow-[0_6px_18px_rgba(31,42,155,0.05)] sm:p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:rounded-none md:border-t-0 md:shadow-none md:last:rounded-b-[1.3rem] md:last:border ${
											isPending ? 'opacity-60' : ''
										}`}
									>
										<button
											type="button"
											onClick={() =>
												onRemove(
													representative?.id ?? '',
													representative?.variant_id ?? '',
													comboId,
													group.comboInstanceId
												)
											}
											className="absolute right-3 top-3 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 shadow transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 md:right-4 md:top-4"
											disabled={isPending}
											aria-label="Eliminar combo"
										>
											✕
										</button>

										<div className="flex items-start gap-3 md:gap-4">
											<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[0.9rem] bg-[#f4f0ff] sm:h-24 sm:w-24">
												<Image
													src={comboImg}
													alt={group.comboName ?? 'Combo'}
													fill
													className="object-contain p-2"
													sizes="96px"
												/>
												<span className="absolute left-1 top-1 rounded bg-[#1f2a9b] px-1.5 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white">
													Combo
												</span>
											</div>
											<div className="min-w-0 flex-1 pt-1">
												<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
													Producto
												</p>
												<Link
													href="/tienda"
													className="text-[0.96rem] font-black leading-snug text-[#1f2a9b] transition hover:underline sm:text-[1.02rem]"
												>
													{group.comboName ?? 'Combo'}
												</Link>
												{badge ? (
													<p
														className={`mt-1 text-[0.62rem] font-black uppercase tracking-[0.16em] ${badge.className}`}
													>
														{badge.text}
													</p>
												) : null}
												<ul className="mt-2 space-y-1">
													{lines.map((l) => {
														const compVariant = l.variant
														const compProduct = l.product
														const compHref = compProduct?.slug
															? `/producto/${compProduct.slug}`
															: '/tienda'
														const compCompareAt =
															compVariant &&
															typeof compVariant.compare_at_price === 'number' &&
															compVariant.compare_at_price > (compVariant.price ?? 0)
																? compVariant.compare_at_price
																: null
														return (
															<li
																key={l.id}
																className="flex items-center justify-between gap-2 text-[0.78rem]"
															>
																<span className="flex min-w-0 items-center gap-1.5">
																	<span className="font-black text-slate-500">
																		x{l.quantity}
																	</span>
																	<Link
																		href={compHref}
																		className="truncate font-semibold text-slate-700 transition hover:text-[#1f2a9b]"
																	>
																		{compProduct?.name ?? compVariant?.sku}
																	</Link>
																</span>
																<span className="shrink-0 text-right">
																	{compCompareAt ? (
																		<span className="mr-1 text-[0.68rem] font-bold line-through text-slate-400">
																			{formatPEN(compCompareAt)}
																		</span>
																	) : null}
																	<span className="font-bold text-slate-600">
																		{formatPEN(compVariant?.price ?? l.unit_price)}
																	</span>
																</span>
															</li>
														)
													})}
												</ul>
											</div>
										</div>

										<div className="md:text-center">
											<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
												Precio
											</p>
											<p className="text-sm font-black text-[#111111] sm:text-base">
												{formatPEN(comboTotal)}
											</p>
											<p className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-slate-400">
												precio combo
											</p>
										</div>

										<div className="md:flex md:justify-center">
											<div>
												<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
													Cantidad
												</p>
												<span className="inline-flex min-w-[3.2rem] items-center justify-center border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-[#111111] sm:text-base">
													1
												</span>
											</div>
										</div>

										<div className="md:text-right">
											<p className="md:hidden mb-1 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
												Subtotal
											</p>
											<p className="text-sm font-black text-[#111111] sm:text-base">
												{formatPEN(comboTotal)}
											</p>
										</div>
									</article>
								)
							})}
						</div>

						<div className="pt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
							<div className="w-full max-w-[280px] space-y-2">
								<label className="block text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500">
									Cupón
								</label>
								<div className="flex flex-col gap-2 sm:flex-row">
									<input
										type="text"
										placeholder="Coupon code"
										disabled
										className="w-full rounded-none border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1f2a9b]/20"
									/>
									<button
										type="button"
										disabled
										className="w-full rounded-none bg-slate-100 px-6 py-3 text-[0.72rem] font-black uppercase tracking-[0.22em] text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed sm:w-auto"
									>
										Aplicar cupón
									</button>
								</div>
							</div>
						</div>
					</section>

					{/* Right: Summary sticky */}
					<aside className="lg:col-span-5 lg:sticky lg:top-32 space-y-4">
						<section className="rounded-[1.2rem] border border-slate-200 bg-white p-5 sm:p-6">
							<p className="text-sm font-semibold leading-7 text-center text-slate-600 sm:text-[0.96rem]">
								Agrega{' '}
								<span className="font-black text-[#1f2a9b]">S/. 285.00 más</span> y te enviaremos
								el pedido gratis.
							</p>
							<div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
								<div
									className="h-full rounded-full bg-emerald-500"
									style={{
										width: `${Math.max(
											5,
											Math.min(
												100,
												(((totals?.subtotal ?? 0) * 100) / 285)
											)
										)}%`,
									}}
								/>
							</div>
						</section>

						<section className="space-y-5 rounded-[1.2rem] border border-slate-200 bg-white p-5 sm:p-6">
							<h2 className="text-xl font-black uppercase tracking-[0.18em] text-[#111111] sm:text-2xl">
								Totales del carrito
							</h2>

							<div className="space-y-3 pt-2 text-sm sm:text-[0.96rem]">
								<div className="flex items-center justify-between gap-3">
									<span className="font-semibold text-slate-700">Subtotal</span>
									<span className="font-black text-slate-900">
										{formatPEN(totals?.subtotal ?? 0)}
									</span>
								</div>
								{totals && totals.discount_total && totals.discount_total > 0 ? (
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold text-slate-700">Descuento</span>
										<span className="font-black text-rose-600">
											− {formatPEN(totals.discount_total)}
										</span>
									</div>
								) : null}
							</div>

							<div className="my-2 h-px w-full bg-slate-200" />

							<div className="flex items-end justify-between gap-3">
								<span className="text-base font-black uppercase tracking-[0.2em] text-[#111111] sm:text-lg">
									Total
								</span>
								<span className="text-3xl font-black text-[#111111] sm:text-4xl">
									{formatPEN(totals?.total ?? 0)}
								</span>
							</div>

							<Link
								href="/checkout"
								className={`mt-3 flex w-full items-center justify-center px-6 py-5 text-sm font-black uppercase tracking-[0.24em] text-white transition sm:text-base ${
									canCheckout
										? 'bg-[#1f2a9b] hover:bg-[#2B1F97] active:bg-[#2B1F97]'
										: 'pointer-events-none bg-slate-300 shadow-none'
								}`}
							>
								{canCheckout ? (
									<>
										Finalizar compra&nbsp;&nbsp;→
									</>
								) : (
									'Revisa el stock de los productos'
								)}
							</Link>

							<p className="pt-2 text-center text-[0.62rem] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-[0.66rem]">
								El total se vuelve a calcular en el servidor antes de generar tu pedido.
							</p>
						</section>
					</aside>
				</div>
				</div>
			) : null}
		</div>
	)
}
