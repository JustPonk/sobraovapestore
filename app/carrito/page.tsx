import type { Metadata } from 'next'
import Link from 'next/link'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import CartView from '@/app/locale/store/components/CartView'
import { storefrontFrameClass } from '@/app/locale/store/storeStyles'
import { getCurrentCart } from '@/app/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
	title: 'Carrito | Sobrao Vape Store',
	description: 'Resumen del carrito de Sobrao Vape Store con totales server-side y stock en tiempo real.',
}

interface CarritoPageProps {
	searchParams?: Promise<{ buyNow?: string }>
}

export default async function CarritoPage({ searchParams }: CarritoPageProps) {
	const resolvedSearchParams = await searchParams
	const showBuyNowMessage = Boolean(resolvedSearchParams?.buyNow)
	const initialCart = await getCurrentCart().catch(() => null)

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-24 sm:pt-28">
				<section className={`${storefrontFrameClass} space-y-5 py-6 sm:space-y-6 sm:py-8`}>
					<nav
						aria-label="Breadcrumb"
						className="flex items-center gap-2 text-[0.72rem] font-black uppercase tracking-[0.28em] text-slate-500"
					>
						<Link
							href="/"
							className="transition hover:text-[#1f2a9b]"
						>
							Inicio
						</Link>
						<span aria-hidden="true" className="text-[#1f2a9b]/50">
							/
						</span>
						<Link
							href="/tienda"
							className="transition hover:text-[#1f2a9b]"
						>
							Tienda
						</Link>
						<span aria-hidden="true" className="text-[#1f2a9b]/50">
							/
						</span>
						<span className="text-[#1f2a9b]">Carrito</span>
					</nav>

					<CartView showBuyNowMessage={showBuyNowMessage} initialCart={initialCart ?? null} />
				</section>
			</main>

			<Footer />
		</div>
	)
}
