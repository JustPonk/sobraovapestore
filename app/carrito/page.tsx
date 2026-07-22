import type { Metadata } from 'next'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import CartPreview from '@/app/locale/store/components/CartPreview'
import {
	storefrontFrameClass,
	storefrontSectionEyebrowClass,
	storefrontSectionTitleClass,
	storefrontSectionTitleWrapClass,
} from '@/app/locale/store/storeStyles'

export const metadata: Metadata = {
	title: 'Carrito | Sobrao Vape Store',
	description: 'Resumen temporal del carrito de Sobrao Vape Store.',
}

interface CarritoPageProps {
	searchParams?: Promise<{ buyNow?: string }>
}

export default async function CarritoPage({ searchParams }: CarritoPageProps) {
	const resolvedSearchParams = await searchParams
	const showBuyNowMessage = Boolean(resolvedSearchParams?.buyNow)

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-28 sm:pt-32">
				<section className={`${storefrontFrameClass} space-y-8 py-10 sm:space-y-10 sm:py-14`}>
					<div className={storefrontSectionTitleWrapClass}>
						<p className={storefrontSectionEyebrowClass}>Resumen de compra</p>
						<h1 className={storefrontSectionTitleClass}>★ CARRITO ★</h1>
					</div>

					<CartPreview showBuyNowMessage={showBuyNowMessage} />
				</section>
			</main>

			<Footer />
		</div>
	)
}
