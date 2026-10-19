'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, Minus, Plus, ShoppingBag, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { upsertCartItem } from '../cartStorage'
import type { StoreProduct, StoreVariantSummary, StoreProductImage } from '../data'

interface ProductDetailProps {
	product: StoreProduct
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
	return v.sku
}

function SectionTitle({ label }: { label: string }) {
	return (
		<h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-black uppercase text-[#1f2a9b]">
			<Star className="h-6 w-6 shrink-0 text-[#1f2a9b]" fill="currentColor" />
			<span>{label}</span>
		</h2>
	)
}

export default function ProductDetail({ product }: ProductDetailProps) {
	const router = useRouter()
	const [variantId, setVariantId] = useState<string>(product.variant?.id ?? product.variants[0]?.id ?? '')
	const [activeImageIndex, setActiveImageIndex] = useState(0)
	const [qty, setQty] = useState(1)
	const [isAdded, setIsAdded] = useState(false)

	const selectedVariant = useMemo<StoreVariantSummary | null>(() => {
		return product.variants.find((v) => v.id === variantId) ?? product.variant ?? product.variants[0] ?? null
	}, [variantId, product.variants, product.variant])

	const variantImages = selectedVariant?.images ?? ([] as StoreProductImage[])
	const safeImageIndex = Math.max(0, Math.min(activeImageIndex, Math.max(0, variantImages.length - 1)))
	const activeImage = variantImages[safeImageIndex] ?? {
		src: '/itemhero.png',
		alt: product.name,
		position: 0,
	}
	const isOutOfStock = (selectedVariant?.stockAvailable ?? 0) <= 0
	const displayPrice = selectedVariant?.displayPrice ?? product.variant?.displayPrice ?? 0

	useEffect(() => {
		setActiveImageIndex(0)
	}, [selectedVariant?.id])

	const handleAddToCart = () => {
		if (!selectedVariant) return
		upsertCartItem({
			productId: product.id,
			productName: product.name,
			productSlug: product.slug,
			variantId: selectedVariant.id,
			sku: selectedVariant.sku,
			price: selectedVariant.displayPrice,
			quantity: Math.min(qty, Math.max(1, selectedVariant.stockAvailable || 1)),
			imageSrc: activeImage.src,
		})
		setIsAdded(true)
		window.setTimeout(() => setIsAdded(false), 1400)
	}

	const handleBuyNow = () => {
		if (!selectedVariant) return
		handleAddToCart()
		router.push(`/carrito?buyNow=${selectedVariant.id}`)
	}

	const MAX_QTY = Math.max(1, selectedVariant?.stockAvailable ?? 1)
	const boundedQty = Math.max(1, Math.min(qty, isOutOfStock ? 1 : MAX_QTY))
	const metaLabel = (product.categoryName || product.metaLabel || 'Producto').toUpperCase()

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
				{product.categoryName ? (
					<>
						<span className="text-slate-300">/</span>
						<Link
							href={`/tienda?filter=${encodeURIComponent(product.categorySlug ?? 'promociones')}`}
							className="transition hover:text-[#1f2a9b]"
						>
							{product.categoryName}
						</Link>
					</>
				) : null}
				<span className="text-slate-300">/</span>
				<span className="text-[#1f2a9b]/80 max-w-[20rem] truncate">{product.name}</span>
			</nav>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-20 items-start">
				{/* COLUMNA IZQUIERDA — GALERÍA */}
				<div className="space-y-5">
					<div className="relative mx-auto aspect-square w-full rounded-[2rem] bg-[#dcd5ff] shadow-[0_18px_44px_rgba(31,42,155,0.14)] overflow-hidden">
						<Image
							src={activeImage.src}
							alt={activeImage.alt || product.name}
							fill
							className="object-contain p-8 sm:p-10 transition duration-300 ease-out"
							sizes="(max-width: 1024px) 100vw, 560px"
							priority
						/>
					</div>
					{/* Thumbnails — lila */}
					<div className="flex flex-wrap gap-5">
						{(variantImages.length ? variantImages : [activeImage]).map((img, i) => (
							<button
								key={`${img.src}-${i}`}
								type="button"
								onClick={() => setActiveImageIndex(i)}
								className={`relative h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-2xl bg-[#dcd5ff] transition ${
									i === safeImageIndex && variantImages.length > 1
										? 'ring-4 ring-[#1f2a9b]/30 shadow-[0_14px_26px_rgba(31,42,155,0.22)]'
										: 'shadow-[0_10px_22px_rgba(31,42,155,0.12)] hover:ring-2 hover:ring-[#1f2a9b]/20'
								}`}
								aria-label={`Ver imagen ${i + 1}`}
							>
								<Image
									src={img.src}
									alt={img.alt || `${product.name} ${i + 1}`}
									fill
									className="object-contain p-4"
								/>
							</button>
						))}
					</div>
				</div>

				{/* COLUMNA DERECHA — INFORMACIÓN */}
				<div className="space-y-7 sm:space-y-8">
					{/* HEADER barra azul */}
					<div className="rounded-2xl bg-[#1f2a9b] px-6 py-4 sm:px-8 sm:py-5 text-white shadow-[0_18px_36px_rgba(31,42,155,0.32)]">
						<div className="text-[0.75rem] font-black uppercase tracking-[0.28em] text-white/80">
							{metaLabel}
						</div>
						<h1 className="mt-1 text-3xl sm:text-4xl lg:text-5xl font-black uppercase leading-none">
							{product.name}
						</h1>
					</div>

					{/* HAY STOCK + ESTRELLAS */}
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
						<RatingStars rating={product.rating} />
					</div>

					{/* SABOR (antes Características) */}
					<div className="space-y-4">
						<SectionTitle label="Sabor:" />
						<div className="relative">
							<select
								value={selectedVariant?.id ?? ''}
								onChange={(e) => setVariantId(e.target.value)}
								className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-14 pl-5 text-base text-slate-900 outline-none transition focus:border-[#1f2a9b]/30 focus:ring-4 focus:ring-[#1f2a9b]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
							>
								{product.variants.map((v) => {
									const stockLabel =
										v.stockAvailable <= 0
											? ' · Agotado'
											: v.stockAvailable < 5
												? ' · Casi agotado'
												: ' · Hay stock'
									return (
										<option
											key={v.id}
											value={v.id}
											disabled={v.stockAvailable <= 0}
										>
											{variantOptionLabel(v)}
											{stockLabel}
										</option>
									)
								})}
							</select>
							<span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
								<ChevronDown className="h-6 w-6" />
							</span>
						</div>
						{selectedVariant?.name ? (
							<p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1f2a9b]/70">
								Sabor seleccionado: <span className="text-[#1f2a9b]">{selectedVariant.name}</span>
								{product.brandName ? <span className="ml-3 text-slate-400">· {product.brandName}</span> : null}
							</p>
						) : null}
					</div>

					{/* PRECIO + COMPRA */}
					<div className="grid grid-cols-1 gap-5 items-end">
						<div className="text-6xl sm:text-7xl font-black text-[#1f2a9b] leading-none">
							{formatPen(displayPrice)}
						</div>

						{/* Bloque unido: [Agregar al carrito ][- Qty +] */}
						<div className="flex items-stretch overflow-hidden rounded-2xl border border-[#1f2a9b]/20 shadow-[0_14px_28px_rgba(31,42,155,0.08)]">
							<button
								type="button"
								onClick={handleAddToCart}
								disabled={isOutOfStock}
								className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-black uppercase tracking-[0.1em] transition ${
									isOutOfStock
										? 'cursor-not-allowed bg-slate-200 text-slate-400'
										: 'bg-white text-[#1f2a9b] hover:bg-[#f5f2ff]'
								}`}
							>
								<ShoppingBag className="h-5 w-5" />
								{isAdded ? 'Añadido' : 'Agregar al carrito'}
							</button>
							<div className="flex items-center bg-[#ece7ff]">
								<button
									type="button"
									aria-label="Disminuir cantidad"
									onClick={() => setQty((q) => Math.max(1, q - 1))}
									className="h-full w-12 text-[#1f2a9b] hover:bg-[#ddd3ff] disabled:cursor-not-allowed disabled:text-slate-400"
									disabled={boundedQty <= 1}
								>
									<Minus className="h-5 w-5 mx-auto" />
								</button>
								<span className="w-14 text-center text-xl font-black text-[#1f2a9b]">
									{boundedQty}
								</span>
								<button
									type="button"
									aria-label="Aumentar cantidad"
									onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
									className="h-full w-12 text-[#1f2a9b] hover:bg-[#ddd3ff] disabled:cursor-not-allowed disabled:text-slate-400"
									disabled={isOutOfStock || boundedQty >= MAX_QTY}
								>
									<Plus className="h-5 w-5 mx-auto" />
								</button>
							</div>
						</div>

						{/* Comprar ahora */}
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

					{/* SOBRE EL PRODUCTO */}
					<div className="space-y-4">
						<SectionTitle label="Sobre el producto" />
						<div className="rounded-[1.8rem] bg-white/70 border border-white/60 px-6 py-5 sm:px-7 sm:py-6 shadow-[0_12px_28px_rgba(31,42,155,0.08)]">
							<p className="text-[0.98rem] leading-8 text-slate-700 whitespace-pre-line">
								{product.description?.trim() ||
									'Producto 100% original. Entrega a todo Lima y provincias. Aceptamos Yape, Plin, tarjeta y transferencia.'}
							</p>
						</div>
					</div>

					{/* MEDIOS DE PAGO */}
					<div className="space-y-4">
						<SectionTitle label="Medios de pago" />
						<div className="rounded-[1.6rem] bg-slate-200/80 border border-slate-300 px-6 py-12 sm:px-8 sm:py-14 flex items-center justify-center shadow-inner">
							<span className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
								Stripe · Yape · Plin · Transferencia
							</span>
						</div>
					</div>

					{/* BENEFICIOS ENVÍO */}
					<div className="flex flex-col gap-4 rounded-[1.8rem] border border-[#1f2a9b]/10 bg-white/50 px-6 py-6 sm:px-8 sm:py-7">
						<div className="flex items-start gap-4">
							<div className="relative h-16 w-16 shrink-0 text-[#1f2a9b]">
								<Star className="h-full w-full" fill="currentColor" />
							</div>
							<ul className="space-y-2 pt-1 text-sm font-semibold text-[#1f2a9b]/90">
								<li>Envíos gratis a partir de S/.200</li>
								<li>Envío 100% seguro y de calidad</li>
								<li>Tú decides cómo lo entregamos</li>
							</ul>
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
