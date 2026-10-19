import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'

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

interface StoreRawPromotion {
	id: string
	name: string
	discount_type: 'percentage' | 'fixed'
	discount_value: number
	starts_at: string
	ends_at: string
	is_active: boolean
}

interface StoreRawCategory {
	name: string
	slug: string
}

interface StoreRawTag {
	name: string
}

export interface StoreVariantSummary {
	id: string
	sku: string
	name: string | null
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
	brandName: string | null
	brandSlug: string | null
	tagNames: string[]
	filterSlugs: string[]
	metaLabel: string
	rating: number
	reviewCount: number
	stockAvailable: number
	hasStock: boolean
	promotion: StorePromotion | null
	variant: StoreVariantSummary | null
	variants: StoreVariantSummary[]
	createdAt: string | null
}

interface StoreRawBrand {
	name: string | null
	slug: string | null
}

interface StoreRawProduct {
	id: string
	name: string
	slug: string
	description: string | null
	created_at: string | null
	category: StoreRawCategory | StoreRawCategory[] | null
	brand: StoreRawBrand | StoreRawBrand[] | null
	variants: Array<{
		id: string
		name: string | null
		sku: string
		price: number
		price_includes_igv: boolean
		is_active: boolean
		images: Array<{ image_url: string; alt_text: string | null; position: number }>
		inventory: Array<{ quantity: number; reserved_quantity: number }>
	}>
	promotion_products: Array<{
		promotion: StoreRawPromotion | StoreRawPromotion[] | null
	}>
	reviews: Array<{ rating: number; is_approved: boolean }>
	tag_map: Array<{ tag: StoreRawTag | StoreRawTag[] | null }>
}

function getSingleRelation<T>(relation: T | T[] | null | undefined) {
	if (Array.isArray(relation)) {
		return relation[0] ?? null
	}

	return relation ?? null
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
		.map((entry) => getSingleRelation(entry.promotion))
		.filter((promotion): promotion is StoreRawPromotion => {
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

function normalizeVariants(rawVariants: StoreRawProduct['variants']): StoreVariantSummary[] {
	return rawVariants
		.filter((variant) => variant.is_active)
		.map((variant) => {
			const images = [...variant.images]
				.sort((left, right) => left.position - right.position)
				.map((image) => ({
					src: resolveImageUrl(image.image_url),
					alt: image.alt_text || variant.name || variant.sku,
					position: image.position,
				}))

			const stockAvailable = getVariantStock(variant.inventory)
			const displayPrice = variant.price_includes_igv
				? roundCurrency(toNumber(variant.price))
				: roundCurrency(toNumber(variant.price) * IGV_MULTIPLIER)

			return {
				id: variant.id,
				sku: variant.sku,
				name: variant.name ?? null,
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
}

function pickDisplayVariant(rawVariants: StoreRawProduct['variants']) {
	return normalizeVariants(rawVariants)[0] ?? null
}

function buildStoreProduct(product: StoreRawProduct): StoreProduct | null {
	const variants = normalizeVariants(product.variants ?? [])
	const variant = variants[0] ?? null
	const category = getSingleRelation(product.category)
	const brand = getSingleRelation(product.brand)

	if (!variant) {
		return null
	}

	const tagNames = (product.tag_map ?? [])
		.map((entry) => getSingleRelation(entry.tag)?.name?.trim())
		.filter((tagName): tagName is string => Boolean(tagName))

	const filterSlugs = [
		...(category?.slug ? [slugifyText(category.slug)] : []),
		...tagNames.map((tagName) => slugifyText(tagName)),
	]

	const promotion = getActivePromotion(product.promotion_products ?? [], variant.displayPrice)
	const { rating, reviewCount } = getAverageRating(product.reviews ?? [])
	const metaLabel = (tagNames[0] || category?.name || 'Catalogo').toUpperCase()
	const stockAvailable = variant.stockAvailable

	return {
		id: product.id,
		name: product.name,
		slug: product.slug,
		description: product.description,
		categoryName: category?.name ?? null,
		categorySlug: category?.slug ?? null,
		brandName: brand?.name ?? null,
		brandSlug: brand?.slug ?? null,
		tagNames,
		filterSlugs,
		metaLabel,
		rating,
		reviewCount,
		stockAvailable,
		hasStock: stockAvailable > 0,
		promotion,
		variant,
		variants,
		createdAt: product.created_at ?? null,
	}
}

export async function getStoreProducts() {
	const supabase = createAdminClient()

	const { data, error } = await supabase
		.from('products')
		.select(
			`
				id,
				name,
				slug,
				description,
				created_at,
				category:categories(name, slug),
				brand:brands(name, slug),
				variants:product_variants(
					id,
					name,
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
		.map<StoreProduct | null>((product) => buildStoreProduct(product))
		.filter((product): product is StoreProduct => Boolean(product))
}

export async function getStoreProductBySlug(slug: string): Promise<StoreProduct | null> {
	const supabase = createAdminClient()

	const { data, error } = await supabase
		.from('products')
		.select(
			`
				id,
				name,
				slug,
				description,
				created_at,
				category:categories(name, slug),
				brand:brands(name, slug),
				variants:product_variants(
					id,
					name,
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
		.eq('slug', slug)
		.maybeSingle()

	if (error) {
		throw new Error(`No se pudo cargar el producto de tienda: ${error.message}`)
	}
	if (!data) return null

	const raw = data as StoreRawProduct
	return buildStoreProduct(raw)
}

// ─── Combos ───────────────────────────────────────────────────────

export interface StoreComboComponent {
	productId: string
	productName: string
	productSlug: string
	brandName: string | null
	quantity: number
	unitPrice: number
	displayPrice: number
	stockAvailable: number
	variants: StoreVariantSummary[]
	imageSrc: string
}

export interface StoreCombo {
	id: string
	name: string
	slug: string
	description: string | null
	sku: string
	price: number
	displayPrice: number
	priceIncludesIgv: boolean
	imageUrl: string
	categoryName: string | null
	categorySlug: string | null
	brandName: string | null
	filterSlugs: string[]
	components: StoreComboComponent[]
	componentTotal: number
	savings: number
	stockAvailable: number
	hasStock: boolean
}

interface StoreRawComboItemProduct {
	id: string
	name: string
	slug: string
	price: number | null
	price_includes_igv: boolean | null
	brand: { name: string } | Array<{ name: string }> | null
	variants: StoreRawProduct['variants']
}

interface StoreRawComboItem {
	product_id: string | null
	variant_id: string | null
	quantity: number
	product: StoreRawComboItemProduct | StoreRawComboItemProduct[] | null
}

interface StoreRawCombo {
	id: string
	name: string
	slug: string
	description: string | null
	sku: string
	price: number
	price_includes_igv: boolean
	is_active: boolean
	image_url: string | null
	category: { name: string } | Array<{ name: string }> | null
	brand: { name: string } | Array<{ name: string }> | null
	combo_items: StoreRawComboItem[]
}

function buildStoreCombo(raw: StoreRawCombo): StoreCombo | null {
	const activeItems = (raw.combo_items ?? []).filter((item) => {
		const product = getSingleRelation(item.product)
		if (!product) return false
		return normalizeVariants(product.variants ?? []).length > 0
	})

	if (!activeItems.length) return null

	const comboPrice = Number(raw.price) || 0
	const comboDisplayPrice = raw.price_includes_igv
		? roundCurrency(comboPrice)
		: roundCurrency(comboPrice * IGV_MULTIPLIER)

	const components: StoreComboComponent[] = activeItems.map((item) => {
		const product = getSingleRelation(item.product)!
		const variants = normalizeVariants(product.variants ?? [])
		const primary = variants[0] ?? null
		const stockAvailable = variants.reduce(
			(sum, variant) => sum + variant.stockAvailable,
			0
		)
		const unitPrice = toNumber(product.price ?? primary?.price ?? 0)
		const priceIncludesIgv = product.price_includes_igv ?? primary?.priceIncludesIgv ?? true
		const displayPrice = priceIncludesIgv
			? roundCurrency(unitPrice)
			: roundCurrency(unitPrice * IGV_MULTIPLIER)
		const productBrand = getSingleRelation(product.brand)
		return {
			productId: product.id,
			productName: product.name ?? 'Producto',
			productSlug: product.slug ?? '',
			brandName: productBrand?.name ?? null,
			quantity: item.quantity,
			unitPrice,
			displayPrice,
			stockAvailable,
			variants,
			imageSrc: primary?.images[0]?.src ?? '/itemhero.png',
		}
	})

	const componentTotal = components.reduce(
		(s, c) => s + c.displayPrice * c.quantity,
		0
	)
	const savings = Math.max(0, componentTotal - comboDisplayPrice)

	// Stock del combo = mínimo de unidades de combo que se pueden armar
	const stockAvailable = components.reduce(
		(min, c) => Math.min(min, Math.floor(c.stockAvailable / (c.quantity || 1))),
		Infinity
	)
	const finalStock = stockAvailable === Infinity ? 0 : stockAvailable

	const category = getSingleRelation(raw.category)
	const categorySlug = category ? slugifyText(category.name) : null
	const filterSlugs = categorySlug ? [categorySlug] : []

	return {
		id: raw.id,
		name: raw.name,
		slug: raw.slug,
		description: raw.description,
		sku: raw.sku,
		price: comboPrice,
		displayPrice: comboDisplayPrice,
		priceIncludesIgv: raw.price_includes_igv,
		imageUrl: resolveImageUrl(raw.image_url),
		categoryName: category?.name ?? null,
		categorySlug,
		brandName: getSingleRelation(raw.brand)?.name ?? null,
		filterSlugs,
		components,
		componentTotal,
		savings,
		stockAvailable: finalStock,
		hasStock: finalStock > 0,
	}
}

const STORE_COMBO_SELECT = `
	id,
	name,
	slug,
	description,
	sku,
	price,
	price_includes_igv,
	is_active,
	image_url,
	category:categories(name),
	brand:brands(name),
	combo_items(
		product_id,
		variant_id,
		quantity,
		product:products(
			id,
			name,
			slug,
			price,
			price_includes_igv,
			brand:brands(name),
			variants:product_variants(
				id,
				sku,
				name,
				price,
				price_includes_igv,
				is_active,
				images:product_variant_images(image_url, alt_text, position),
				inventory:inventory(quantity, reserved_quantity)
			)
		)
	)
`

export async function getStoreCombos(): Promise<StoreCombo[]> {
	const supabase = createAdminClient()

	const { data, error } = await supabase
		.from('combos')
		.select(STORE_COMBO_SELECT)
		.eq('is_active', true)
		.order('created_at', { ascending: false })

	if (error) {
		console.error('[getStoreCombos] error:', error.message)
		return []
	}

	const rows = (data ?? []) as StoreRawCombo[]
	return rows
		.map<StoreCombo | null>((combo) => buildStoreCombo(combo))
		.filter((combo): combo is StoreCombo => Boolean(combo))
}

export async function getStoreComboBySlug(slug: string): Promise<StoreCombo | null> {
	const supabase = createAdminClient()

	const { data, error } = await supabase
		.from('combos')
		.select(STORE_COMBO_SELECT)
		.eq('slug', slug)
		.eq('is_active', true)
		.maybeSingle()

	if (error) {
		console.error('[getStoreComboBySlug] error:', error.message)
		return null
	}

	if (!data) return null
	return buildStoreCombo(data as StoreRawCombo)
}

