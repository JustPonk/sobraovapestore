import ClientSection from './clientSection'
import SobraoMessage from './sobraoMessage'
import PromotionsCarrusel, { type PromoCarouselItem } from './PromotionsCarrusel'
import { getStoreProducts } from '@/app/locale/store/data'

function roundCurrency(value: number) {
        return Math.round(value * 100) / 100
}

function resolveOriginalPrice(item: Awaited<ReturnType<typeof getStoreProducts>>[number]) {
        const currentPrice = item.variant?.displayPrice ?? 0
        const compareAtPrice = item.compareAtPrice

        if (compareAtPrice && compareAtPrice > currentPrice) {
                return compareAtPrice
        }

        if (!item.promotion || currentPrice <= 0) {
                return currentPrice
        }

        if (item.promotion.discountType === 'percentage') {
                const ratio = 1 - item.promotion.discountValue / 100
                return ratio > 0 ? roundCurrency(currentPrice / ratio) : currentPrice
        }

        return roundCurrency(currentPrice + item.promotion.discountValue)
}

async function getPromotionCarouselItems(): Promise<PromoCarouselItem[]> {
        const products = await getStoreProducts()

        return products
                .filter((item) => item.isPromoted && item.hasStock)
                .map((item) => {
                        const currentPrice = item.variant?.displayPrice ?? 0
                        const originalPrice = resolveOriginalPrice(item)
                        const hasRealPromotion =
                                currentPrice > 0 &&
                                originalPrice > currentPrice &&
                                Boolean(item.promotionLabel)

                        return {
                                item,
                                currentPrice,
                                originalPrice,
                                hasRealPromotion,
                        }
                })
                .filter(({ hasRealPromotion }) => hasRealPromotion)
                .sort((left, right) => {
                        const leftDiscount = left.originalPrice - left.currentPrice
                        const rightDiscount = right.originalPrice - right.currentPrice
                        return rightDiscount - leftDiscount
                })
                .slice(0, 8)
                .map(({ item, currentPrice, originalPrice }) => ({
                        id: item.id,
                        name: [item.brandName, item.name].filter(Boolean).join(' '),
                        imageSrc: item.imageSrc,
                        originalPrice,
                        currentPrice,
                        discountBadgeSrc: '/icons/ICONO-OFERTA.png',
                        discountLabel: item.promotionLabel || undefined,
                        href: `/producto/${encodeURIComponent(item.slug)}`,
                }))
}

export default async function Content() {
        const promotionItems = await getPromotionCarouselItems().catch(() => [])

	return (
		<div className="w-full overflow-x-hidden bg-cover bg-center bg-no-repeat">
                        {promotionItems.length ? <PromotionsCarrusel items={promotionItems} /> : null}
			<ClientSection />
			<SobraoMessage />
		</div>
	)
}
