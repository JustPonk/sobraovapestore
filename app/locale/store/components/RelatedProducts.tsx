import { Star } from 'lucide-react'

import type { StoreProduct } from '../data'
import { storefrontFrameClass } from '../storeStyles'
import ProductCard from './ProductCard'

interface RelatedProductsProps {
	products: StoreProduct[]
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
	if (!products.length) {
		return null
	}

	return (
		<section className={`${storefrontFrameClass} pb-16 sm:pb-20`}>
			<div className="flex items-center gap-2 pb-6">
				<Star className="h-6 w-6 shrink-0 text-[#1f2a9b]" fill="currentColor" />
				<h2 className="text-2xl font-black uppercase tracking-[0.12em] text-[#1f2a9b] sm:text-3xl">
					También te podría gustar
				</h2>
			</div>

			<div className="mx-auto grid w-full max-w-[80rem] grid-cols-1 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-6 md:gap-y-14 justify-items-center">
				{products.map((product) => (
					<div key={product.id} className="w-full max-w-[24rem]">
						<ProductCard product={product} />
					</div>
				))}
			</div>
		</section>
	)
}
