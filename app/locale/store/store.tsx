import { getStoreProducts } from './data'
import ProductGrid from './components/ProductGrid'
import { storefrontFrameClass } from './storeStyles'

export default async function Store() {
	try {
		const products = await getStoreProducts()

		return <ProductGrid products={products} />
	} catch (error) {
		return (
			<section className={`${storefrontFrameClass} py-12 sm:py-16`}>
				<div className="rounded-[1.8rem] border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700 shadow-[0_12px_24px_rgba(185,28,28,0.08)]">
					<p className="text-sm font-black uppercase tracking-[0.24em]">Error de catálogo</p>
					<p className="mt-3 text-sm leading-7 sm:text-base">
						No se pudo cargar la tienda en este momento.
						{error instanceof Error ? ` ${error.message}` : ''}
					</p>
				</div>
			</section>
		)
	}
}
