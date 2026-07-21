'use client'

import BrandsCarrusel from './brandsCarrusel'
import ClientSection from './clientSection'
import SobraoMessage from './sobraoMessage'
import PromotionsCarrusel, { type PromoCarouselItem } from './PromotionsCarrusel'

// 👉 TEMPORARY: reemplaza esto por el fetch real a Supabase (promotions +
// promotion_products + product_variants) apenas lo tengas listo. Ajusta los
// paths de imageSrc/discountBadgeSrc a donde realmente pusiste tus PNGs
// dentro de /public.
const placeholderPromotions: PromoCarouselItem[] = [
	{
		id: '1',
		name: 'Vape Sobrao 10k Puffs',
		imageSrc: '/products/vape-sobrao-10k.png',
		originalPrice: 124.99,
		currentPrice: 89.99,
		discountBadgeSrc: '/icons/badge-33.png',
	},
	{
		id: '2',
		name: 'Vape Sobrao 10k Puffs',
		imageSrc: '/products/vape-sobrao-10k.png',
		originalPrice: 124.99,
		currentPrice: 89.99,
		discountBadgeSrc: '/icons/badge-33.png',
	},
	{
		id: '3',
		name: 'Vape Sobrao 10k Puffs',
		imageSrc: '/products/vape-sobrao-10k.png',
		originalPrice: 124.99,
		currentPrice: 89.99,
		discountBadgeSrc: '/icons/badge-33.png',
	},
]

export default function Content() {
	return (
		<div className="w-full overflow-x-hidden bg-cover bg-center bg-no-repeat">
			<BrandsCarrusel />
			<PromotionsCarrusel items={placeholderPromotions} />
			<ClientSection />
			<SobraoMessage />
		</div>
	)
}