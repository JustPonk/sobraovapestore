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
	searchQuery?: string | null
}

function normalizeText(value: string | null | undefined): string {
	return (value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
}

function matchQuery(item: CatalogItem, query: string): boolean {
	const target = normalizeText(query)
	if (!target) return false

	if (item.type === 'product') {
		const product = item.data
		const haystack = [
			product.name,
			product.brandName,
			product.categoryName,
			...product.tagNames,
		]
		return haystack.some((value) => normalizeText(value).includes(target))
	}

	const combo = item.data
	const haystack = [combo.name, combo.brandName, combo.categoryName]
	return haystack.some((value) => normalizeText(value).includes(target))
}

function matchFilter(item: CatalogItem, activeFilter: StoreFilterKey, matchers: string[]): boolean {
	if (item.type === 'product') {
		const product = item.data
		if (activeFilter === 'promociones') {
			const hasPromotion = Boolean(product.promotion)
			const inPromotionsCategory = product.categorySlug === 'promociones'
			const hasPromotionInSlugs = product.filterSlugs.includes('promociones')
			return product.isPromoted || hasPromotion || inPromotionsCategory || hasPromotionInSlugs
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

function isPromotedItem(item: CatalogItem): boolean {
	return item.type === 'product' && item.data.isPromoted
}

export default function ProductGrid({ products, combos, activeFilter, searchQuery }: ProductGridProps) {
	const activeFilterConfig = storeFilters.find((filter) => filter.key === activeFilter) ?? storeFilters[0]

	const trimmedQuery = (searchQuery ?? '').trim()
	const isSearching = trimmedQuery.length > 0

	const filteredItems = useMemo(() => {
		const allItems: CatalogItem[] = [
			...products.map<CatalogItem>((product) => ({ type: 'product', data: product })),
			...combos.map<CatalogItem>((combo) => ({ type: 'combo', data: combo })),
		]
		if (isSearching) {
			return allItems.filter((item) => matchQuery(item, trimmedQuery))
		}
		const filtered = allItems.filter((item) =>
			matchFilter(item, activeFilter, activeFilterConfig.matchers)
		)
		if (activeFilter === 'promociones') return filtered
		// Los productos en promoción se muestran primero en su categoría real.
		return filtered.sort(
			(left, right) => Number(isPromotedItem(right)) - Number(isPromotedItem(left))
		)
	}, [activeFilter, activeFilterConfig.matchers, isSearching, products, combos, trimmedQuery])

        return (
                <section className={`${storefrontFrameClass} space-y-7 pt-0 pb-10 sm:space-y-9 sm:pt-6 sm:pb-14`}>
			{isSearching ? null : <FilterTabs activeFilter={activeFilter} />}

			<div className={storefrontSectionTitleWrapClass}>
				<p className={storefrontSectionEyebrowClass}>
					{isSearching ? 'Resultados de búsqueda' : 'Directo a la categoría'}
				</p>
				<h1 className={storefrontSectionTitleClass}>
					{isSearching
						? `★ ${trimmedQuery.toUpperCase()} ★`
						: `★ ${activeFilterConfig.label.toUpperCase()} ★`}
				</h1>
			</div>

			{filteredItems.length ? (
				<div className="mx-auto grid w-full max-w-[80rem] grid-cols-2 gap-x-3 gap-y-8 px-2 sm:gap-x-5 sm:gap-y-12 sm:px-0 md:grid-cols-3 md:gap-x-6 md:gap-y-14 justify-items-center">
					{filteredItems.map((item) => (
						<div key={`${item.type}-${item.data.id}`} className="w-full max-w-[24rem]">
							{item.type === 'product' ? (
								<ProductCard product={item.data} />
							) : (
								<ComboCard combo={item.data} />
							)}
						</div>
					))}
				</div>
                        ) : (
                                <div className="mx-auto flex min-h-[280px] w-full max-w-[80rem] items-center justify-center rounded-[1.8rem] border border-white/70 bg-white/50 px-6 py-12 text-center shadow-[0_16px_30px_rgba(31,42,155,0.08)]">
					<div className="space-y-3">
						<p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f2a9b]">
							Sin resultados
						</p>
						{isSearching ? (
							<p className="max-w-[34rem] text-sm leading-7 text-slate-600 sm:text-base">
								No encontramos productos para <strong>{trimmedQuery}</strong>. Prueba con otro
								nombre, sabor o etiqueta.
							</p>
						) : (
							<p className="max-w-[34rem] text-sm leading-7 text-slate-600 sm:text-base">
                                                                Todavía no hay productos disponibles para <strong>{activeFilterConfig.label}</strong>.
                                                                Pronto encontrarás opciones nuevas en esta categoría.
							</p>
						)}
					</div>
				</div>
			)}
		</section>
	)
}
