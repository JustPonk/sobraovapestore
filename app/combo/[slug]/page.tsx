import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import { getStoreComboBySlug } from '@/app/locale/store/data'
import ComboDetail from '@/app/locale/store/components/ComboDetail'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ComboPageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ComboPageProps): Promise<Metadata> {
	const { slug } = await params
	const combo = await getStoreComboBySlug(slug)
	if (!combo) {
		return { title: 'Combo no encontrado | Sobrao Vape Store' }
	}
	const baseDesc = combo.description?.replace(/\s+/g, ' ').trim().slice(0, 160)
	return {
		title: `${combo.name} ${combo.brandName ? `· ${combo.brandName}` : ''} | Sobrao Vape Store`,
		description:
			baseDesc ||
			`${combo.name} — combo disponible en Sobrao Vape Store. Elige el sabor de cada producto y compra con envíos a todo Lima y Perú.`,
	}
}

export default async function ComboPage({ params }: ComboPageProps) {
	const { slug } = await params
	const combo = await getStoreComboBySlug(slug)

	if (!combo) {
		notFound()
	}

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-28 sm:pt-32">
				<section className="w-full bg-[url('/BGContent.png')] bg-cover bg-center bg-no-repeat">
					<ComboDetail combo={combo} />
				</section>

				<section className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pb-16 sm:px-6 lg:px-8">
					<Link
						href="/tienda"
						className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-500 transition hover:text-[#1f2a9b]"
					>
						← Seguir comprando en Tienda
					</Link>
				</section>
			</main>

			<Footer />
		</div>
	)
}
