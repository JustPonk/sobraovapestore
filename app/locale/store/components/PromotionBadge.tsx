'use client'

import Image from 'next/image'

const PROMO_BADGE_SIZE_CLASS = 'h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28'
const PROMO_BADGE_OFFSET_CLASS = '-right-6 -top-9 sm:-right-7 sm:-top-10 lg:-right-8 lg:-top-11'

/**
 * Estrella de oferta. Debe renderizarse fuera de cualquier contenedor con
 * `overflow-hidden` (como capa superior) para que no se recorte.
 */
export default function PromotionBadge({ label }: { label: string }) {
	return (
		<div
			className={`pointer-events-none absolute z-30 ${PROMO_BADGE_OFFSET_CLASS} ${PROMO_BADGE_SIZE_CLASS}`}
		>
			<Image
				src="/icons/ICONO-OFERTA.png"
				alt="Descuento"
				fill
				className="object-contain drop-shadow-[0_12px_24px_rgba(31,42,155,0.22)]"
			/>
			<span className="absolute inset-0 flex items-center justify-center pb-1 text-[0.7rem] font-black text-[#1f2a9b] sm:text-sm lg:text-base">
				{label}
			</span>
		</div>
	)
}
