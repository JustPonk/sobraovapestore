'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Star } from 'lucide-react'

import { upsertCartItem } from '../cartStorage'
import type { StoreProduct } from '../data'

interface RatingStarsProps {
	rating: number
}

function RatingStars({ rating }: RatingStarsProps) {
	return (
		<div className="flex items-center gap-1 text-[#1f2a9b]">
			{Array.from({ length: 5 }).map((_, index) => {
				const fillLevel = Math.max(0, Math.min(1, rating - index))

				return (
					<span key={index} className="relative inline-flex">
						<Star className="h-4 w-4 text-[#c9c0ff]" fill="currentColor" />
						<span
							className="absolute inset-0 overflow-hidden"
							style={{ width: `${fillLevel * 100}%` }}
						>
							<Star className="h-4 w-4 text-[#1f2a9b]" fill="currentColor" />
						</span>
					</span>
				)
			})}
		</div>
	)
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

function DiscountBurst({ label }: { label: string }) {
	return (
		<div className="relative h-[76px] w-[76px] shrink-0">
			<svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_14px_28px_rgba(31,42,155,0.22)]">
				<polygon
					points="50,3 60,18 78,9 80,28 97,24 89,41 100,50 89,59 97,76 80,72 78,91 60,82 50,97 40,82 22,91 20,72 3,76 11,59 0,50 11,41 3,24 20,28 22,9 40,18"
					fill="#38c7ff"
				/>
			</svg>
			<span className="absolute inset-0 flex items-center justify-center text-base font-black uppercase tracking-[0.04em] text-[#10217d]">
				{label}
			</span>
		</div>
	)
}

interface ProductCardProps {
	product: StoreProduct
}

export default function ProductCard({ product }: ProductCardProps) {
	const router = useRouter()
	const [isAdded, setIsAdded] = useState(false)

	if (!product.variant) {
		return null
	}

	const primaryImage = product.variant.images[0]
	const isOutOfStock = !product.hasStock

	const handleAddToCart = () => {
		upsertCartItem({
			productId: product.id,
			productName: product.name,
			productSlug: product.slug,
			variantId: product.variant!.id,
			sku: product.variant!.sku,
			price: product.variant!.displayPrice,
			quantity: 1,
			imageSrc: primaryImage?.src || '/itemhero.png',
		})

		setIsAdded(true)
		window.setTimeout(() => setIsAdded(false), 1400)
	}

	const handleBuyNow = () => {
		handleAddToCart()
		router.push(`/carrito?buyNow=${product.variant!.id}`)
	}

	return (
		<article className="relative flex h-full flex-col gap-5 rounded-[1.6rem] bg-gradient-to-br from-[#ece7ff] to-[#d8d3ff] p-5 shadow-[0_18px_34px_rgba(31,42,155,0.12)] sm:p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="min-h-9">
					{isOutOfStock ? (
						<span className="inline-flex rounded-full bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#1f2a9b] shadow-[0_10px_20px_rgba(31,42,155,0.08)]">
							No hay stock
						</span>
					) : null}
				</div>

				{product.promotion ? <DiscountBurst label={product.promotion.badgeLabel} /> : null}
			</div>

			<div className="relative flex min-h-[220px] items-center justify-center rounded-[1.35rem] bg-white/35 px-4 py-8">
				<Image
					src={primaryImage?.src || '/itemhero.png'}
					alt={primaryImage?.alt || product.name}
					width={220}
					height={220}
					className="h-auto max-h-[220px] w-auto object-contain"
					sizes="(max-width: 768px) 220px, 260px"
				/>
			</div>

			<div className="space-y-4">
				<p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-slate-500">
					{product.metaLabel}
				</p>

				<div className="flex items-start justify-between gap-4">
					<h3 className="max-w-[15rem] text-xl font-black uppercase leading-tight text-[#121212]">
						{product.name}
					</h3>
					<span className="shrink-0 text-lg font-black text-[#1f2a9b] sm:text-xl">
						{formatPen(product.variant.displayPrice)}
					</span>
				</div>

				<div className="flex items-center justify-between gap-3">
					<RatingStars rating={product.rating} />
					<span className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f2a9b]/72">
						{product.reviewCount ? `${product.reviewCount} reseñas` : 'Sin reseñas'}
					</span>
				</div>
			</div>

			<div className="mt-auto flex flex-col gap-3 pt-2">
				<button
					type="button"
					onClick={handleBuyNow}
					disabled={isOutOfStock}
					className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.15em] transition ${
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
					className={`inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-sm font-black uppercase tracking-[0.15em] transition ${
						isOutOfStock
							? 'cursor-not-allowed border-slate-300 bg-white/70 text-slate-400'
							: 'border-[#1f2a9b] bg-white/70 text-[#1f2a9b] hover:-translate-y-0.5 hover:bg-white'
					}`}
				>
					{isAdded ? 'Añadido' : 'Añadir al carrito'}
				</button>
			</div>
		</article>
	)
}
