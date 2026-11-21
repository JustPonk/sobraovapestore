import { NextResponse } from 'next/server'

import { getStoreProducts } from '@/app/locale/store/data'

export const dynamic = 'force-dynamic'

interface SearchSuggestion {
	id: string
	name: string
	slug: string
	imageSrc: string
	price: number
}

function normalize(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const query = (searchParams.get('q') ?? '').trim()
	const rawLimit = Number(searchParams.get('limit') ?? '3')
	const limit = Number.isFinite(rawLimit) ? Math.min(9, Math.max(1, Math.trunc(rawLimit))) : 3

	let products: Awaited<ReturnType<typeof getStoreProducts>>
	try {
		products = await getStoreProducts()
	} catch (error) {
		console.error('[api/search] no se pudo cargar el catálogo:', error)
		return NextResponse.json({ items: [] as SearchSuggestion[] })
	}

	const term = normalize(query)

	// Sin término → sugerencias por defecto (productos con stock primero).
	if (!term) {
		const items: SearchSuggestion[] = [...products]
			.sort((left, right) => {
				if (left.hasStock !== right.hasStock) return left.hasStock ? -1 : 1
				return left.name.localeCompare(right.name)
			})
			.slice(0, limit)
			.map((product) => ({
				id: product.id,
				name: product.name,
				slug: product.slug,
				imageSrc: product.imageSrc,
				price: product.variant?.displayPrice ?? 0,
			}))
		return NextResponse.json({ items })
	}

	const scored = products
		.map((product) => {
			const name = normalize(product.name)
			const tags = product.tagNames.map(normalize)
			const extras = [product.brandName ?? '', product.categoryName ?? ''].map(normalize)

			let score = Number.POSITIVE_INFINITY
			if (name.startsWith(term)) score = 0
			else if (name.includes(term)) score = 1
			else if (tags.some((tag) => tag.includes(term))) score = 2
			else if (extras.some((extra) => extra.includes(term))) score = 3
			return { product, score }
		})
		.filter((entry) => Number.isFinite(entry.score))
		.sort((left, right) => {
			if (left.score !== right.score) return left.score - right.score
			if (left.product.hasStock !== right.product.hasStock) return left.product.hasStock ? -1 : 1
			return left.product.name.localeCompare(right.product.name)
		})

	const items: SearchSuggestion[] = scored.slice(0, limit).map(({ product }) => ({
		id: product.id,
		name: product.name,
		slug: product.slug,
		imageSrc: product.imageSrc,
		price: product.variant?.displayPrice ?? 0,
	}))

	return NextResponse.json({ items })
}
