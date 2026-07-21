'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { getStoredCart, type StoreCartItem } from '../cartStorage'

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

export default function CartPreview() {
	const searchParams = useSearchParams()
	const [cartItems, setCartItems] = useState<StoreCartItem[]>([])

	useEffect(() => {
		const syncCart = () => setCartItems(getStoredCart())

		syncCart()
		window.addEventListener('sobrao-cart-updated', syncCart)

		return () => {
			window.removeEventListener('sobrao-cart-updated', syncCart)
		}
	}, [])

	const total = useMemo(
		() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
		[cartItems]
	)

	return (
		<div className="space-y-6">
			{searchParams.get('buyNow') ? (
				<div className="rounded-[1.4rem] border border-[#7dd8ff]/60 bg-[#eef9ff] px-5 py-4 text-sm font-bold text-[#1f2a9b]">
					El producto fue agregado y quedó listo para continuar con tu flujo de checkout.
				</div>
			) : null}

			{cartItems.length ? (
				<>
					<div className="space-y-4">
						{cartItems.map((item) => (
							<article
								key={item.variantId}
								className="flex items-center gap-4 rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[0_14px_30px_rgba(31,42,155,0.08)]"
							>
								<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] bg-[#f4f0ff]">
									<Image src={item.imageSrc} alt={item.productName} fill className="object-contain p-2" />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="text-sm font-black uppercase text-[#101010] sm:text-base">
										{item.productName}
									</h3>
									<p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
										{item.sku}
									</p>
								</div>
								<div className="text-right">
									<p className="text-sm font-black text-[#1f2a9b] sm:text-base">
										{formatPen(item.price)}
									</p>
									<p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
										Cant. {item.quantity}
									</p>
								</div>
							</article>
						))}
					</div>

					<div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_14px_30px_rgba(31,42,155,0.08)]">
						<div className="flex items-center justify-between gap-4">
							<span className="text-sm font-black uppercase tracking-[0.18em] text-[#1f2a9b]">
								Total
							</span>
							<span className="text-xl font-black text-[#1f2a9b]">{formatPen(total)}</span>
						</div>
					</div>
				</>
			) : (
				<div className="rounded-[1.8rem] border border-white/70 bg-white/70 px-6 py-12 text-center shadow-[0_16px_30px_rgba(31,42,155,0.08)]">
					<p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f2a9b]">
						Tu carrito está vacío
					</p>
					<p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
						Añade productos desde la tienda para empezar tu compra.
					</p>
				</div>
			)}
		</div>
	)
}
