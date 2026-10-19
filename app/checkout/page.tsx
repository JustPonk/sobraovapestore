import type { Metadata } from 'next'
import Link from 'next/link'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import { storefrontFrameClass } from '@/app/locale/store/storeStyles'
import CheckoutFlow from './CheckoutFlow'
import { getCurrentCart, getYapeAccountSetting, listUserAddressesServer } from '@/app/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
	title: 'Checkout | Sobrao Vape Store',
	description: 'Finaliza tu compra en Sobrao Vape Store con pago Yape manual seguro.',
}

export default async function CheckoutPage() {
	const initialCart = await getCurrentCart().catch(() => null)
	const yapeRes = await getYapeAccountSetting().catch(() => ({ ok: true, data: null }))
	const addressesRes = await listUserAddressesServer().catch(() => ({ ok: true, data: [] }))
	const ya = yapeRes.ok ? yapeRes.data ?? null : null
	const addresses = addressesRes.ok ? (addressesRes.data as unknown as Array<Record<string, unknown>>) ?? [] : []

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
						<Link href="/" className="transition hover:text-[#1f2a9b]">
							Inicio
						</Link>
						<span aria-hidden="true" className="text-[#1f2a9b]/50">
							/
						</span>
						<Link href="/tienda" className="transition hover:text-[#1f2a9b]">
							Tienda
						</Link>
						<span aria-hidden="true" className="text-[#1f2a9b]/50">
							/
						</span>
						<Link href="/carrito" className="transition hover:text-[#1f2a9b]">
							Carrito
						</Link>
						<span aria-hidden="true" className="text-[#1f2a9b]/50">
							/
						</span>
						<span className="text-[#1f2a9b]">Checkout</span>
					</nav>

					<CheckoutFlow
						initialCart={initialCart ?? { lines: [], totals: { subtotal: 0, discount_total: 0, igv_total: 0, shipping_total: 0, total: 0, currency: 'PEN' } }}
						initialAddresses={addresses as Array<Record<string, unknown>>}
						initialYapeAccount={ya as { phone: string; holder_name: string; qr_image_url: string } | null}
					/>
				</section>
			</main>

			<Footer />
		</div>
	)
}
