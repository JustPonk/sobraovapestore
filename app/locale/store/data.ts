import 'server-only'

import { createClient } from '@/utils/supabase/server'

const IGV_MULTIPLIER = 1.18

export type StoreFilterKey = 'promociones' | 'nuevo' | 'vapor-ti' | 'desechables' | 'equipos'

export interface StoreProductImage {
	src: string
	alt: string
	position: number
}

export interface StorePromotion {
	id: string
	name: string
	discountType: 'percentage' | 'fixed'
	discountValue: number
	badgeLabel: string
}

export interface StoreVariantSummary {
	id: string
	sku: string
	price: number
	displayPrice: number
	priceIncludesIgv: boolean
	stockAvailable: number
	images: StoreProductImage[]
}

export interface StoreProduct {
	id: string
	name: string
	slug: string
	description: string | null
	categoryName: string | null
	categorySlug: string | null
	tagNames: string[]
	filterSlugs: string[]
	metaLabel: string
	rating: number
	reviewCount: number
	stockAvailable: number
	hasStock: boolean
	promotion: StorePromotion | null
	variant: StoreVariantSummary | null
}

interface StoreRawProduct {
	id: string
	name: string
	slug: string
	description: string | null
	category: { name: string; slug: string } | null
	variants: Array<{
		id: string
		sku: string
		price: number
		price_includes_igv: boolean
		is_active: boolean
		images: Array<{ image_url: string; alt_text: string | null; position: number }>
		inventory: Array<{ quantity: number; reserved_quantity: number }>
	}>
	promotion_products: Array<{
		promotion: {
			id: string
			name: string
			discount_type: 'percentage' | 'fixed'
			discount_value: number
			starts_at: string
			ends_at: string
			is_active: boolean
		} | null
	}>
	reviews: Array<{ rating: number; is_approved: boolean }>
	tag_map: Array<{ tag: { name: string } | null }>
}

function slugifyText(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function toNumber(value: number | string | null | undefined) {
	return Number(value ?? 0)
}

function roundCurrency(value: number) {
	return Math.round(value * 100) / 100
}

function formatDiscountBadge(discountType: 'percentage' | 'fixed', discountValue: number, displayPrice: number) {
	if (discountType === 'percentage') {
		return `-${Math.round(discountValue)}%`
	}

	if (displayPrice <= 0) {
		return '-0%'
	}

	const percentage = Math.round((discountValue / displayPrice) * 100)
	return `-${Math.max(1, percentage)}%`
}

function resolveImageUrl(imageUrl: string | null | undefined) {
	if (!imageUrl) {
		return '/itemhero.png'
	}

	if (/^https?:\/\//i.test(imageUrl)) {
		return imageUrl
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	if (!supabaseUrl) {
		return '/itemhero.png'
	}

	const normalizedPath = imageUrl.replace(/^\/+/, '')
	return `${supabaseUrl}/storage/v1/object/public/${normalizedPath}`
}

function getVariantStock(inventoryRows: Array<{ quantity: number; reserved_quantity: number }>) {
	return inventoryRows.reduce((total, row) => {
		const available = toNumber(row.quantity) - toNumber(row.reserved_quantity)
		return total + Math.max(0, available)
	}, 0)
}

function getActivePromotion(
	promotions: StoreRawProduct['promotion_products'],
	displayPrice: number
): StorePromotion | null {
	const now = Date.now()

	const activePromotions = promotions
		.map((entry) => entry.promotion)
		.filter((promotion): promotion is NonNullable<StoreRawProduct['promotion_products'][number]['promotion']> => {
			if (!promotion?.is_active) return false
			const startsAt = new Date(promotion.starts_at).getTime()
			const endsAt = new Date(promotion.ends_at).getTime()
			return now >= startsAt && now <= endsAt
		})
		.map((promotion) => ({
			id: promotion.id,
			name: promotion.name,
			discountType: promotion.discount_type,
			discountValue: toNumber(promotion.discount_value),
			badgeLabel: formatDiscountBadge(
				promotion.discount_type,
				toNumber(promotion.discount_value),
				displayPrice
			),
		}))

	if (!activePromotions.length) {
		return null
	}

	return activePromotions.sort((left, right) => right.discountValue - left.discountValue)[0]
}

function getAverageRating(reviews: StoreRawProduct['reviews']) {
	const approvedReviews = reviews.filter((review) => review.is_approved)

	if (!approvedReviews.length) {
		return { rating: 0, reviewCount: 0 }
	}

	const total = approvedReviews.reduce((sum, review) => sum + review.rating, 0)
	return {
		rating: total / approvedReviews.length,
		reviewCount: approvedReviews.length,
	}
}

function pickDisplayVariant(rawVariants: StoreRawProduct['variants']) {
	const normalizedVariants = rawVariants
		.filter((variant) => variant.is_active)
		.map((variant) => {
			const images = [...variant.images]
				.sort((left, right) => left.position - right.position)
				.map((image) => ({
					src: resolveImageUrl(image.image_url),
					alt: image.alt_text || variant.sku,
					position: image.position,
				}))

			const stockAvailable = getVariantStock(variant.inventory)
			const displayPrice = variant.price_includes_igv
				? roundCurrency(toNumber(variant.price))
				: roundCurrency(toNumber(variant.price) * IGV_MULTIPLIER)

			return {
				id: variant.id,
				sku: variant.sku,
				price: roundCurrency(toNumber(variant.price)),
				displayPrice,
				priceIncludesIgv: variant.price_includes_igv,
				stockAvailable,
				images,
			}
		})
		.sort((left, right) => {
			if (left.stockAvailable !== right.stockAvailable) {
				return right.stockAvailable - left.stockAvailable
			}

			if (left.images.length !== right.images.length) {
				return right.images.length - left.images.length
			}

			return left.displayPrice - right.displayPrice
		})

	return normalizedVariants[0] ?? null
}

export async function getStoreProducts() {
	const supabase = await createClient()

	const { data, error } = await supabase
		.from('products')
		.select(
			`
				id,
				name,
				slug,
				description,
				category:categories(name, slug),
				variants:product_variants(
					id,
					sku,
					price,
					price_includes_igv,
					is_active,
					images:product_variant_images(image_url, alt_text, position),
					inventory:inventory(quantity, reserved_quantity)
				),
				promotion_products(
					promotion:promotions(id, name, discount_type, discount_value, starts_at, ends_at, is_active)
				),
				reviews:product_reviews(rating, is_approved),
				tag_map:product_tag_map(
					tag:product_tags(name)
				)
			`
		)
		.eq('is_active', true)

	if (error) {
		throw new Error(`No se pudieron cargar los productos de tienda: ${error.message}`)
	}

	const rows = (data ?? []) as StoreRawProduct[]

	return rows
		.map<StoreProduct | null>((product) => {
			const variant = pickDisplayVariant(product.variants ?? [])

			if (!variant) {
				return null
			}

			const tagNames = (product.tag_map ?? [])
				.map((entry) => entry.tag?.name?.trim())
				.filter((tagName): tagName is string => Boolean(tagName))

			const filterSlugs = [
				...(product.category?.slug ? [slugifyText(product.category.slug)] : []),
				...tagNames.map((tagName) => slugifyText(tagName)),
			]

			const promotion = getActivePromotion(product.promotion_products ?? [], variant.displayPrice)
			const { rating, reviewCount } = getAverageRating(product.reviews ?? [])
			const metaLabel = (tagNames[0] || product.category?.name || 'Catalogo').toUpperCase()
			const stockAvailable = variant.stockAvailable

			return {
				id: product.id,
				name: product.name,
				slug: product.slug,
				description: product.description,
				categoryName: product.category?.name ?? null,
				categorySlug: product.category?.slug ?? null,
				tagNames,
				filterSlugs,
				metaLabel,
				rating,
				reviewCount,
				stockAvailable,
				hasStock: stockAvailable > 0,
				promotion,
				variant,
			}
		})
		.filter((product): product is StoreProduct => Boolean(product))
}
