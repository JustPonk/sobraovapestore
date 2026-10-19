'use client'

import { useMemo } from 'react'

import type { StoreFilterKey, StoreProduct, StoreCombo } from '../data'
import { storeFilters } from '../filters'
import {
	storefrontFrameClass,
	storefrontSectionEyebrowClass,
	storefrontSectionTitleClass,
	storefrontSectionTitleWrapClass,
} from '../storeStyles'
import FilterTabs from './FilterTabs'
import ProductCard from './ProductCard'
import ComboCard from './ComboCard'

type CatalogItem =
	| { type: 'product'; data: StoreProduct }
	| { type: 'combo'; data: StoreCombo }

interface ProductGridProps {
	products: StoreProduct[]
	combos: StoreCombo[]
	activeFilter: StoreFilterKey
}

function matchFilter(item: CatalogItem, activeFilter: StoreFilterKey, matchers: string[]): boolean {
	if (item.type === 'product') {
		const product = item.data
		if (activeFilter === 'promociones') {
			const hasPromotion = Boolean(product.promotion)
			const inPromotionsCategory = product.categorySlug === 'promociones'
			const hasPromotionInSlugs = product.filterSlugs.includes('promociones')
			return hasPromotion || inPromotionsCategory || hasPromotionInSlugs
		}
		if (activeFilter === 'nuevo') {
			const inNuevoCategory =
				product.categorySlug === 'nuevo' || product.filterSlugs.includes('nuevo')
			let withinSevenDays = false
			if (product.createdAt) {
				const diff = Date.now() - new Date(product.createdAt).getTime()
				withinSevenDays = Number.isFinite(diff) && diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7
			}
			if (inNuevoCategory || withinSevenDays) return true
			return matchers.some((matcher) => product.filterSlugs.includes(matcher))
		}
		return matchers.some((matcher) => product.filterSlugs.includes(matcher))
	}

	// Combo: filtrar por categoría del combo
	const combo = item.data
	if (activeFilter === 'promociones') {
		return combo.categorySlug === 'promociones' || combo.filterSlugs.includes('promociones')
	}
	if (activeFilter === 'nuevo') {
		return combo.categorySlug === 'nuevo' || combo.filterSlugs.includes('nuevo')
	}
	return matchers.some((matcher) => combo.filterSlugs.includes(matcher))
}

export default function ProductGrid({ products, combos, activeFilter }: ProductGridProps) {
	const activeFilterConfig = storeFilters.find((filter) => filter.key === activeFilter) ?? storeFilters[0]

	const filteredItems = useMemo(() => {
		const allItems: CatalogItem[] = [
			...products.map<CatalogItem>((product) => ({ type: 'product', data: product })),
			...combos.map<CatalogItem>((combo) => ({ type: 'combo', data: combo })),
		]
		return allItems.filter((item) => matchFilter(item, activeFilter, activeFilterConfig.matchers))
	}, [activeFilter, activeFilterConfig.matchers, products, combos])

	return (
		<section className={`${storefrontFrameClass} space-y-8 py-10 sm:space-y-10 sm:py-14`}>
			<FilterTabs activeFilter={activeFilter} />

			<div className={storefrontSectionTitleWrapClass}>
				<p className={storefrontSectionEyebrowClass}>Directo a la categoría</p>
				<h1 className={storefrontSectionTitleClass}>
					★ {activeFilterConfig.label.toUpperCase()} ★
				</h1>
			</div>

			{filteredItems.length ? (
				<div className="mx-auto grid w-full max-w-[80rem] grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 justify-items-center">
					{filteredItems.map((item) => (
						<div key={`${item.type}-${item.data.id}`} className="w-full max-w-[24rem]">
							{item.type === 'product' ? (
								<ProductCard product={item.data} activeFilter={activeFilter} />
							) : (
								<ComboCard combo={item.data} />
							)}
						</div>
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
