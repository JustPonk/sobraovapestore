'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Package } from 'lucide-react'

import type { StoreCombo } from '../data'
import { addComboToCart } from '../cartStorage'
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

interface ComboCardProps {
	combo: StoreCombo
}

export default function ComboCard({ combo }: ComboCardProps) {
	const router = useRouter()
	const [isAdded, setIsAdded] = useState(false)

	const isOutOfStock = !combo.hasStock
	const detailHref = `/combo/${encodeURIComponent(combo.slug)}`
	const discountPct =
		combo.componentTotal > 0
			? Math.round((combo.savings / combo.componentTotal) * 100)
			: 0

	/** Elige por defecto el primer sabor con stock de cada producto del combo. */
	function buildDefaultComponents() {
		return combo.components.map((component) => {
			const variant =
				component.variants.find((v) => v.stockAvailable > 0) ?? component.variants[0]
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
	}

	function handleAddToCart() {
		if (isOutOfStock) return
		addComboToCart(
			combo.id,
			combo.name,
			combo.displayPrice,
			combo.componentTotal,
			buildDefaultComponents()
		)
		setIsAdded(true)
		window.setTimeout(() => setIsAdded(false), 1400)
	}

	function handleBuyNow() {
		if (isOutOfStock) return
		handleAddToCart()
		router.push('/carrito')
	}

	return (
		<div className="relative h-full w-full">
			{combo.savings > 0 ? <PromotionBadge label={`-${discountPct}%`} /> : null}

			<article className="group relative flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#fff5e6]/90 to-[#ffe6c7]/90 shadow-[0_18px_34px_rgba(31,42,155,0.12)] transition">
				{isOutOfStock ? (
					<span className="absolute left-4 top-4 z-20 inline-flex rounded-full bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#1f2a9b] shadow-[0_10px_20px_rgba(31,42,155,0.08)]">
						Sin stock
					</span>
				) : null}

				<Link
					href={detailHref}
					className="relative flex flex-1 items-center justify-center bg-white/55 border-b border-white/40 backdrop-blur-[2px] pt-10 pb-6 px-4 min-h-[200px] transition focus:outline-none focus:ring-4 focus:ring-[#1f2a9b]/15"
					aria-label={`Ver detalles de ${combo.name}`}
				>
					<Image
						src={combo.imageUrl}
						alt={combo.name}
						width={200}
						height={200}
						className="h-auto max-h-[200px] w-auto object-contain transition duration-300 ease-out group-hover:scale-[1.04]"
						sizes="(max-width: 768px) 200px, 240px"
					/>
				</Link>

				<div className="flex flex-col gap-3 p-4 sm:p-5">
					<Link
						href={detailHref}
						className="block rounded-[1.3rem] bg-[#fff8ed]/75 border border-white/50 px-4 py-3 space-y-2 transition hover:bg-[#fff3e0]"
					>
						<div className="flex items-center gap-1.5">
							<Package className="h-3.5 w-3.5 text-[#935a00]" />
							<span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#935a00]">
								Combo
							</span>
							{combo.brandName ? (
								<span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#935a00]/70">
									· {combo.brandName}
								</span>
							) : null}
						</div>
						<h3 className="min-w-0 truncate text-xl font-black uppercase leading-tight text-[#121212]">
							{combo.name}
						</h3>
					</Link>

					<div className="flex items-end justify-between gap-3">
						<div>
							{combo.savings > 0 ? (
								<span className="block text-[0.7rem] text-slate-400 line-through tabular-nums">
									{formatPen(combo.componentTotal)}
								</span>
							) : null}
							<span className="text-xl font-black text-[#1f2a9b] sm:text-2xl tabular-nums">
								{formatPen(combo.displayPrice)}
							</span>
						</div>
						{combo.hasStock ? (
							<span
								className={`text-[0.68rem] font-black uppercase tracking-[0.1em] ${
									combo.stockAvailable < 5 ? 'text-amber-600' : 'text-emerald-600'
								}`}
							>
								{combo.stockAvailable < 5 ? 'Casi agotado' : 'Hay stock'}
							</span>
						) : (
							<span className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-rose-600">
								Agotado
							</span>
						)}
					</div>

					<div className="rounded-[1.3rem] bg-[#ffe8c7]/60 border border-white/45 px-4 py-3">
						<div className="flex flex-col gap-2">
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
					</div>
				</div>
			</article>
		</div>
	)
}
