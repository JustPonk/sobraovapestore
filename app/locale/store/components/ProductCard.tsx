'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { upsertCartItem } from '../cartStorage'
import type { StoreProduct, StoreVariantSummary } from '../data'
import PromotionBadge from './PromotionBadge'

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

function getVariantFallbackImage(v: StoreVariantSummary | null | undefined, fallback: string) {
	const first = v?.images?.[0]
	return { src: first?.src ?? fallback, alt: first?.alt ?? 'Producto' }
}

const HOVER_ROTATE_MS = 1200

interface ProductCardProps {
	product: StoreProduct
}

export default function ProductCard({ product }: ProductCardProps) {
	const router = useRouter()
	const [isAdded, setIsAdded] = useState(false)
	const [activeIdx, setActiveIdx] = useState(0)
	const rotateTimerRef = useRef<number | null>(null)

	const variants = product.variants?.length ? product.variants : product.variant ? [product.variant] : []
	const safeActiveIdx = Math.max(0, Math.min(activeIdx, Math.max(0, variants.length - 1)))
	const activeVariant: StoreVariantSummary | null = variants[safeActiveIdx] ?? product.variant

	const hasAnyStock = variants.some((v) => v.stockAvailable > 0)
	const activeVariantStock = activeVariant?.stockAvailable ?? 0
	const isOutOfStock = !hasAnyStock || activeVariantStock <= 0

	const { src: imageSrc, alt: imageAlt } = getVariantFallbackImage(activeVariant, product.imageSrc)
	const displayPrice = activeVariant?.displayPrice ?? product.variant?.displayPrice ?? 0
	const previousPrice = product.compareAtPrice && product.compareAtPrice > displayPrice ? product.compareAtPrice : null

	function startRotation() {
		if (variants.length <= 1) return
		if (rotateTimerRef.current != null) return
		rotateTimerRef.current = window.setInterval(() => {
			setActiveIdx((i) => (i + 1) % variants.length)
		}, HOVER_ROTATE_MS)
	}

	function stopRotation() {
		if (rotateTimerRef.current != null) {
			window.clearInterval(rotateTimerRef.current)
			rotateTimerRef.current = null
		}
		setActiveIdx(0)
	}

	useEffect(() => {
		return () => stopRotation()
	}, [])

	const handleAddToCart = () => {
		const variantToAdd = activeVariant ?? product.variant
		if (!variantToAdd) return
		const { src: cartImg } = getVariantFallbackImage(variantToAdd, product.imageSrc)

		upsertCartItem({
			productId: product.id,
			productName: product.name,
			productSlug: product.slug,
			variantId: variantToAdd.id,
			sku: variantToAdd.sku,
			price: variantToAdd.displayPrice,
			quantity: 1,
			imageSrc: cartImg,
		})

		setIsAdded(true)
		window.setTimeout(() => setIsAdded(false), 1400)
	}

	const handleBuyNow = () => {
		const variantToAdd = activeVariant ?? product.variant
		if (!variantToAdd) return
		handleAddToCart()
		router.push(`/carrito?buyNow=${variantToAdd.id}`)
	}

	const isPromoCard = Boolean(
		product.isPromoted ||
			product.promotion ||
			product.categorySlug === 'promociones' ||
			product.filterSlugs.includes('promociones')
	)

	if (!product.variant && !variants.length) {
		return null
	}

	return (
		<div className="relative h-full w-full">
			{isPromoCard ? <PromotionBadge label={product.promotionLabel} /> : null}

			<article
				onMouseEnter={startRotation}
				onMouseLeave={stopRotation}
				className="group relative flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#ece7ff]/90 to-[#d8d3ff]/90 shadow-[0_18px_34px_rgba(31,42,155,0.12)] transition"
			>
				{isOutOfStock ? (
					<span className="absolute left-4 top-4 z-20 inline-flex rounded-full bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#1f2a9b] shadow-[0_10px_20px_rgba(31,42,155,0.08)]">
						Sin stock
					</span>
				) : null}

				<Link
					href={`/producto/${encodeURIComponent(product.slug)}`}
					className="relative flex flex-1 items-center justify-center bg-white/55 border-b border-white/40 px-4 pb-3 pt-6 backdrop-blur-[2px] transition focus:outline-none focus:ring-4 focus:ring-[#1f2a9b]/15 sm:min-h-[280px] sm:pb-6 sm:pt-10"
					aria-label={`Ver detalles de ${product.name}`}
				>
					<Image
						src={imageSrc}
						alt={imageAlt || product.name}
						width={240}
						height={240}
						className="h-auto max-h-[240px] w-auto object-contain transition duration-300 ease-out group-hover:scale-[1.04]"
						sizes="(max-width: 768px) 240px, 280px"
					/>
					{variants.length > 1 ? (
						<div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
							{variants.map((v, i) => (
								<span
									key={v.id ?? i}
									className={`h-1.5 rounded-full transition-all ${
										i === safeActiveIdx ? 'w-5 bg-[#1f2a9b]' : 'w-1.5 bg-[#1f2a9b]/25'
									}`}
								/>
							))}
						</div>
					) : null}
				</Link>

				<div className="p-0 sm:p-5">
					<div className="sm:hidden">
						<div className="border-t border-white/50 bg-[#f3efff]/75 transition">
							<Link
								href={`/producto/${encodeURIComponent(product.slug)}`}
								className="block px-3 pt-3 transition hover:bg-[#efeaff]"
							>
							<h3 className="min-w-0 break-words text-base font-black uppercase leading-tight text-[#121212] [font-family:var(--font-thunder)]">
								{[product.brandName, product.name].filter(Boolean).join(' ')}
							</h3>
							</Link>
							<div className="mt-3 flex items-end justify-between gap-3 px-3 pb-3">
								<button
									type="button"
									onClick={(event) => {
										event.preventDefault()
										handleAddToCart()
									}}
									disabled={isOutOfStock}
									aria-label={`Añadir ${product.name} al carrito`}
									className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
										isOutOfStock
											? 'cursor-not-allowed bg-slate-400 text-white/80'
											: 'bg-[#1f2a9b] text-white hover:scale-105 hover:shadow-[0_10px_18px_rgba(31,42,155,0.28)]'
									}`}
								>
									<Plus className="h-5 w-5" strokeWidth={3} />
								</button>
								<div className="min-w-0 text-right tabular-nums">
									{previousPrice ? (
										<span className="block text-xs font-semibold text-slate-400 line-through">
											{formatPen(previousPrice)}
										</span>
									) : null}
									<span className="block text-lg font-black leading-none text-[#1f2a9b]">
										{formatPen(displayPrice)}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="hidden flex-col gap-3 sm:flex">
					<Link
						href={`/producto/${encodeURIComponent(product.slug)}`}
						className="block rounded-[1.3rem] bg-[#f3efff]/75 border border-white/50 px-4 py-3 space-y-3 transition hover:bg-[#efeaff]"
					>
						<div className="flex items-end justify-between gap-3">
							<h3 className="min-w-0 truncate text-xl font-black uppercase leading-tight text-[#121212]">
								{[product.brandName, product.name].filter(Boolean).join(' ')}
							</h3>
							<span className="shrink-0 text-lg font-black text-[#1f2a9b] sm:text-xl">
								{formatPen(displayPrice)}
							</span>
						</div>
					</Link>

					<div className="rounded-[1.3rem] bg-[#e9e1ff]/60 border border-white/45 px-4 py-3">
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={handleBuyNow}
								disabled={isOutOfStock}
								className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.1em] transition ${
									isOutOfStock
										? 'cursor-not-allowed bg-slate-400 text-white/80'
										: 'bg-[#1f2a9b] text-white hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(31,42,155,0.28)]'
								}`}
							>
								Comprar ahora
							</button>

							<button
								type="button"
								onClick={handleAddToCart}
								disabled={isOutOfStock}
								className={`inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-xs font-black uppercase tracking-[0.1em] transition ${
									isOutOfStock
										? 'cursor-not-allowed border-slate-300 bg-white/70 text-slate-400'
										: 'border-[#1f2a9b] bg-white/70 text-[#1f2a9b] hover:-translate-y-0.5 hover:bg-white'
								}`}
							>
								{isAdded ? 'Añadido' : 'Añadir al carrito'}
							</button>
						</div>
					</div>
					</div>
				</div>
			</article>
		</div>
	)
}
