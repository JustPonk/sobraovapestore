import type { Metadata } from 'next'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import Store from '@/app/locale/store/store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
	title: 'Tienda | Sobrao Vape Store',
	description: 'Catálogo de productos, promociones y stock disponible de Sobrao Vape Store.',
}

interface TiendaPageProps {
	searchParams?: Promise<{ filter?: string }>
}

export default async function TiendaPage({ searchParams }: TiendaPageProps) {
	const resolvedSearchParams = await searchParams

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-28 sm:pt-32">
				<section className="w-full bg-[url('/BGContent.png')] bg-cover bg-center bg-no-repeat">
					<Store activeFilterParam={resolvedSearchParams?.filter} />
				</section>
			</main>

			<Footer />
		</div>
	)
}
