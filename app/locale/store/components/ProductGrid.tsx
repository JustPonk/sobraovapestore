'use client'

import { useMemo } from 'react'

import type { StoreFilterKey, StoreProduct } from '../data'
import { defaultStoreFilter, storeFilters } from '../filters'
import {
	storefrontFrameClass,
	storefrontSectionEyebrowClass,
	storefrontSectionTitleClass,
	storefrontSectionTitleWrapClass,
} from '../storeStyles'
import FilterTabs from './FilterTabs'
import ProductCard from './ProductCard'

interface ProductGridProps {
	products: StoreProduct[]
	activeFilter: StoreFilterKey
}

function resolveActiveFilter(rawFilter: string | null): StoreFilterKey {
	const matchingFilter = storeFilters.find((filter) => filter.key === rawFilter)
	return matchingFilter?.key ?? defaultStoreFilter
}

export { resolveActiveFilter }

export default function ProductGrid({ products, activeFilter }: ProductGridProps) {
	const activeFilterConfig = storeFilters.find((filter) => filter.key === activeFilter) ?? storeFilters[0]

	const filteredProducts = useMemo(() => {
		return products.filter((product) => {
			if (activeFilter === 'promociones') {
				return Boolean(product.promotion)
			}

			return activeFilterConfig.matchers.some((matcher) => product.filterSlugs.includes(matcher))
		})
	}, [activeFilter, activeFilterConfig.matchers, products])

	return (
		<section className={`${storefrontFrameClass} space-y-8 py-10 sm:space-y-10 sm:py-14`}>
			<FilterTabs activeFilter={activeFilter} />

			<div className={storefrontSectionTitleWrapClass}>
				<p className={storefrontSectionEyebrowClass}>Directo a la categoría</p>
				<h1 className={storefrontSectionTitleClass}>
					★ {activeFilterConfig.label.toUpperCase()} ★
				</h1>
			</div>

			{filteredProducts.length ? (
				<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
					{filteredProducts.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
			) : (
				<div className="flex min-h-[280px] items-center justify-center rounded-[1.8rem] border border-white/70 bg-white/50 px-6 py-12 text-center shadow-[0_16px_30px_rgba(31,42,155,0.08)]">
					<div className="space-y-3">
						<p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f2a9b]">
							Sin resultados
						</p>
						<p className="max-w-[34rem] text-sm leading-7 text-slate-600 sm:text-base">
							Todavía no hay productos publicados para <strong>{activeFilterConfig.label}</strong>.
							En cuanto se carguen en Supabase aparecerán aquí sin necesidad de mockear datos.
						</p>
					</div>
				</div>
			)}
		</section>
	)
}
