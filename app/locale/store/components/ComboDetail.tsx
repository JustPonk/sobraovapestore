'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, Package, ShoppingBag, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { addComboToCart } from '../cartStorage'
import type { StoreCombo, StoreComboComponent, StoreVariantSummary } from '../data'

interface ComboDetailProps {
	combo: StoreCombo
}

interface GalleryImage {
	key: string
	src: string
	alt: string
}

function formatPen(value: number) {
	return new Intl.NumberFormat('es-PE', {
		style: 'currency',
		currency: 'PEN',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
		.format(value)
		.replace('PEN', 'S/.')
}

function RatingStars({ rating }: { rating: number }) {
	return (
		<div className="flex items-center gap-1 text-[#1f2a9b]">
			{Array.from({ length: 5 }).map((_, index) => {
				const fillLevel = Math.max(0, Math.min(1, rating - index))
				return (
					<span key={index} className="relative inline-flex">
						<Star className="h-6 w-6 text-[#c9c0ff]" fill="currentColor" />
						<span
							className="absolute inset-0 overflow-hidden"
							style={{ width: `${fillLevel * 100}%` }}
						>
							<Star className="h-6 w-6 text-[#1f2a9b]" fill="currentColor" />
						</span>
					</span>
				)
			})}
		</div>
	)
}

function variantOptionLabel(v: StoreVariantSummary): string {
	const name = v.name?.trim()
	if (name) return name
	return v.sku || 'Clásico'
}

function SectionTitle({ label }: { label: string }) {
	return (
		<h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-black uppercase text-[#1f2a9b]">
			<Star className="h-6 w-6 shrink-0 text-[#1f2a9b]" fill="currentColor" />
			<span>{label}</span>
		</h2>
	)
}

/** Primera variante con stock de un componente (o la primera disponible). */
function defaultVariantFor(component: StoreComboComponent): StoreVariantSummary | null {
	return (
		component.variants.find((variant) => variant.stockAvailable > 0) ??
		component.variants[0] ??
		null
	)
}

export default function ComboDetail({ combo }: ComboDetailProps) {
	const router = useRouter()

	// Un sabor seleccionado por producto del combo
	const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() => {
		const initial: Record<string, string> = {}
		for (const component of combo.components) {
			initial[component.productId] = defaultVariantFor(component)?.id ?? ''
		}
		return initial
	})
	const [activeImageIndex, setActiveImageIndex] = useState(0)
	const [isAdded, setIsAdded] = useState(false)

	const baseStock = useMemo(() => {
		if (!combo.components.length) return 0
		let min = Infinity
		for (const component of combo.components) {
			const variantId = selectedVariants[component.productId]
			const variant =
				component.variants.find((v) => v.id === variantId) ?? defaultVariantFor(component)
			const units = Math.floor((variant?.stockAvailable ?? 0) / (component.quantity || 1))
			if (units < min) min = units
		}
		return min === Infinity ? 0 : min
	}, [combo.components, selectedVariants])

	const isOutOfStock = baseStock <= 0

	const galleryImages = useMemo<GalleryImage[]>(() => {
		const images: GalleryImage[] = [
			{ key: 'combo-main', src: combo.imageUrl, alt: combo.name },
		]
		for (const component of combo.components) {
			const variantId = selectedVariants[component.productId]
			const variant =
				component.variants.find((v) => v.id === variantId) ?? defaultVariantFor(component)
			const variantImages = variant?.images?.length
				? variant.images
				: [{ src: component.imageSrc, alt: component.productName, position: 0 }]
			for (const image of variantImages) {
				images.push({
					key: `${component.productId}-${image.src}`,
					src: image.src,
					alt: image.alt || component.productName,
				})
			}
		}
		// Evitar duplicados por URL
		const seen = new Set<string>()
		return images.filter((image) => {
			if (seen.has(image.src)) return false
			seen.add(image.src)
			return true
		})
	}, [combo.imageUrl, combo.name, combo.components, selectedVariants])

	const safeImageIndex = Math.max(0, Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1)))
	const activeImage = galleryImages[safeImageIndex] ?? {
		key: 'fallback',
		src: '/itemhero.png',
		alt: combo.name,
	}

	useEffect(() => {
		setActiveImageIndex(0)
	}, [selectedVariants])

	const handleAddToCart = () => {
		if (isOutOfStock) return
		const components = combo.components.map((component) => {
			const variantId = selectedVariants[component.productId]
			const variant =
				component.variants.find((v) => v.id === variantId) ?? defaultVariantFor(component)
			return {
				productId: component.productId,
				variantId: variant?.id ?? '',
				productName: component.productName,
				productSlug: component.productSlug,
				sku: variant?.sku ?? '',
				displayPrice: component.displayPrice,
				quantity: component.quantity,
				imageSrc: variant?.images[0]?.src ?? component.imageSrc,
			}
		})
		addComboToCart(combo.id, combo.name, combo.displayPrice, combo.componentTotal, components)
		setIsAdded(true)
		window.setTimeout(() => setIsAdded(false), 1400)
	}

	const handleBuyNow = () => {
		if (isOutOfStock) return
		handleAddToCart()
		router.push('/carrito')
	}

	const metaLabel = (combo.categoryName || 'Combo').toUpperCase()

	return (
		<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
			<nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-500">
				<Link href="/" className="transition hover:text-[#1f2a9b]">
					Inicio
				</Link>
				<span className="text-slate-300">/</span>
				<Link href="/tienda" className="transition hover:text-[#1f2a9b]">
					Tienda
				</Link>
				<span className="text-slate-300">/</span>
				<span className="text-[#1f2a9b]/80 max-w-[20rem] truncate">{combo.name}</span>
			</nav>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-20 items-start">
				{/* COLUMNA IZQUIERDA — GALERÍA */}
				<div className="space-y-5">
					<div className="relative mx-auto aspect-square w-full rounded-[2rem] bg-[#dcd5ff] shadow-[0_18px_44px_rgba(31,42,155,0.14)] overflow-hidden">
						<Image
							src={activeImage.src}
							alt={activeImage.alt || combo.name}
							fill
							className="object-contain p-8 sm:p-10 transition duration-300 ease-out"
							sizes="(max-width: 1024px) 100vw, 560px"
							priority
						/>
					</div>
					<div className="flex flex-wrap gap-5">
						{galleryImages.map((image, i) => (
							<button
								key={image.key}
								type="button"
								onClick={() => setActiveImageIndex(i)}
								className={`relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-2xl bg-[#dcd5ff] transition ${
									i === safeImageIndex && galleryImages.length > 1
										? 'ring-4 ring-[#1f2a9b]/30 shadow-[0_14px_26px_rgba(31,42,155,0.22)]'
										: 'shadow-[0_10px_22px_rgba(31,42,155,0.12)] hover:ring-2 hover:ring-[#1f2a9b]/20'
								}`}
								aria-label={`Ver imagen ${i + 1}`}
							>
								<Image
									src={image.src}
									alt={image.alt || `${combo.name} ${i + 1}`}
									fill
									className="object-contain p-4"
								/>
							</button>
						))}
					</div>
				</div>

				{/* COLUMNA DERECHA — INFORMACIÓN */}
				<div className="space-y-7 sm:space-y-8">
					<div className="rounded-2xl bg-[#1f2a9b] px-6 py-4 sm:px-8 sm:py-5 text-white shadow-[0_18px_36px_rgba(31,42,155,0.32)]">
						<div className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-[0.28em] text-white/80">
							<Package className="h-4 w-4" />
							{metaLabel}
						</div>
						<h1 className="mt-1 text-3xl sm:text-4xl lg:text-5xl font-black uppercase leading-none">
							{combo.name}
						</h1>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<span
								className={`h-4 w-4 rounded-full ring-4 ring-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)] ${
									isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'
								}`}
							/>
							<span
								className={`text-sm font-black uppercase tracking-[0.2em] ${
									isOutOfStock ? 'text-rose-700' : 'text-emerald-700'
								}`}
							>
								{isOutOfStock ? 'Sin stock' : 'Hay stock'}
							</span>
						</div>
						<RatingStars rating={5} />
					</div>

					{/* SABORES DE CADA PRODUCTO DEL COMBO */}
					<div className="space-y-4">
						<SectionTitle label="Elige tus sabores:" />
						<div className="space-y-3">
							{combo.components.map((component) => {
								const selectedId = selectedVariants[component.productId] ?? ''
								const selected =
									component.variants.find((v) => v.id === selectedId) ??
									defaultVariantFor(component)
								return (
									<div
										key={component.productId}
										className="rounded-[1.3rem] bg-white/70 border border-white/60 px-4 py-3 shadow-[0_10px_22px_rgba(31,42,155,0.06)]"
									>
										<div className="flex items-center justify-between gap-3">
											<Link
												href={`/producto/${encodeURIComponent(component.productSlug)}`}
												className="min-w-0 truncate text-sm font-black uppercase tracking-[0.08em] text-slate-800 transition hover:text-[#1f2a9b]"
											>
												{component.quantity}× {component.productName}
											</Link>
											{component.brandName ? (
												<span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-slate-400">
													{component.brandName}
												</span>
											) : null}
										</div>
										{component.variants.length > 1 ? (
											<div className="relative mt-2">
												<select
													value={selected?.id ?? ''}
													onChange={(e) =>
														setSelectedVariants((prev) => ({
															...prev,
															[component.productId]: e.target.value,
														}))
													}
													className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pr-12 pl-4 text-sm font-bold uppercase tracking-[0.06em] text-slate-900 outline-none transition focus:border-[#1f2a9b]/30 focus:ring-4 focus:ring-[#1f2a9b]/10"
												>
													{component.variants.map((v) => (
														<option key={v.id} value={v.id} disabled={v.stockAvailable <= 0}>
															{variantOptionLabel(v)}
															{v.stockAvailable <= 0
																? ' · Agotado'
																: v.stockAvailable < 5
																	? ' · Casi agotado'
																	: ' · Hay stock'}
														</option>
													))}
												</select>
												<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
													<ChevronDown className="h-5 w-5" />
												</span>
											</div>
										) : (
											<p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
												{selected ? variantOptionLabel(selected) : 'Sabor único'}
											</p>
										)}
									</div>
								)
							})}
						</div>
					</div>

					{/* PRECIO + COMPRA */}
					<div className="grid grid-cols-1 gap-5 items-end">
						<div className="flex items-end gap-4">
							<span className="text-6xl sm:text-7xl font-black text-[#1f2a9b] leading-none">
								{formatPen(combo.displayPrice)}
							</span>
							{combo.savings > 0 ? (
								<span className="pb-2 text-lg text-slate-400 line-through tabular-nums">
									{formatPen(combo.componentTotal)}
								</span>
							) : null}
						</div>

						<button
							type="button"
							onClick={handleAddToCart}
							disabled={isOutOfStock}
							className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-base font-black uppercase tracking-[0.1em] transition ${
								isOutOfStock
									? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400'
									: 'border-[#1f2a9b]/20 bg-white text-[#1f2a9b] hover:bg-[#f5f2ff]'
							}`}
						>
							<ShoppingBag className="h-5 w-5" />
							{isAdded ? 'Añadido' : 'Agregar al carrito'}
						</button>

						<button
							type="button"
							onClick={handleBuyNow}
							disabled={isOutOfStock}
							className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-black uppercase tracking-[0.1em] transition ${
								isOutOfStock
									? 'cursor-not-allowed bg-slate-400 text-white/80'
									: 'bg-[#1f2a9b] text-white hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(31,42,155,0.34)]'
							}`}
						>
							Comprar ahora
						</button>
					</div>

					{/* SOBRE EL COMBO */}
					<div className="space-y-4">
						<SectionTitle label="Sobre el combo" />
						<div className="rounded-[1.8rem] bg-white/70 border border-white/60 px-6 py-5 sm:px-7 sm:py-6 shadow-[0_12px_28px_rgba(31,42,155,0.08)]">
							<p className="text-[0.98rem] leading-8 text-slate-700 whitespace-pre-line">
								{combo.description?.trim() ||
									'Combo 100% original. Elige el sabor de cada producto y recíbelo a todo Lima y provincias.'}
							</p>
						</div>
					</div>

					<Link
						href="/tienda"
						className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 transition hover:text-[#1f2a9b]"
					>
						<ChevronLeft className="h-4 w-4" />
						Volver a tienda
					</Link>
				</div>
			</div>
		</div>
	)
}
