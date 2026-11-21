import type { Metadata } from 'next'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import { storefrontFrameClass } from '@/app/locale/store/storeStyles'
import { createClient } from '@/utils/supabase/server'
import CheckoutFlow from './CheckoutFlow'
import { getCurrentCart, getSupportWhatsappSetting, getYapeAccountSetting, listUserAddressesServer } from '@/app/actions'

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
	const whatsappRes = await getSupportWhatsappSetting().catch(() => ({ ok: true, data: null }))
	const ya = yapeRes.ok ? yapeRes.data ?? null : null
	const initialWhatsapp = whatsappRes.ok ? whatsappRes.data ?? null : null
	const addresses = addressesRes.ok ? (addressesRes.data as unknown as Array<Record<string, unknown>>) ?? [] : []
	const accountEmail = await createClient()
		.then((supabase) => supabase.auth.getUser())
		.then(({ data }) => data?.user?.email ?? null)
		.catch(() => null)

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-20 sm:pt-24">
				<section className={`${storefrontFrameClass} space-y-5 py-6 sm:space-y-6 sm:py-8`}>
					<CheckoutFlow
						initialCart={initialCart ?? { lines: [], totals: { subtotal: 0, discount_total: 0, igv_total: 0, shipping_total: 0, total: 0, currency: 'PEN' } }}
						initialAddresses={addresses as Array<Record<string, unknown>>}
						initialYapeAccount={ya as { phone: string; holder_name: string; qr_image_url: string } | null}
						initialWhatsapp={initialWhatsapp}
						accountEmail={accountEmail}
					/>
				</section>
			</main>

			<Footer />
		</div>
	)
}
