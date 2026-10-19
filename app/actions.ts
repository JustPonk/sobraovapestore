'use server'

import { cookies } from 'next/headers'

import { logAudit } from '@/utils/audit/log'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
	calculateShippingEstimate,
	getRecaptchaSecretKey,
	getRecaptchaSiteKey,
	MAX_ADDRESSES_PER_USER,
	WAREHOUSE_ADDRESS,
	type UbigeoDraft,
} from '@/utils/supabase/config'

const GUEST_COOKIE = 'sv_guest_session'

export interface ActionState<TData = unknown> {
	ok: boolean
	message?: string | null
	data?: TData | null
	error?: string | null
	issues?: Record<string, string>
}

export interface CartTotals {
	subtotal: number
	discount_total: number
	igv_total: number
	shipping_total: number
	total: number
	currency: string
	applied_coupon_code?: string | null
	applied_coupon_id?: string | null
}

export interface CartLine {
	id: string
	cart_id: string
	variant_id: string
	quantity: number
	unit_price: number
	combo_id?: string | null
	combo_name?: string | null
	combo_instance_id?: string | null
	product?: { id: string; name: string; slug: string; brand?: { id: string; name: string } | null } | null
	variant?: {
		id: string
		sku: string
		price: number
		compare_at_price?: number | null
		price_includes_igv: boolean
		low_stock_threshold: number
		attributes?: Array<{ name: string; value: string }> | null
		primary_image?: string | null
	} | null
	available_stock?: number | null
}

export interface CartPayload {
	cart_id?: string | null
	lines: CartLine[]
	totals: CartTotals
	applied_address_id?: string | null
	applied_shipping_method_id?: string | null
	applied_shipping_draft?: (UbigeoDraft & { enabled: boolean; label?: string | null }) | null
}

interface VariantPriced {
	id: string
	sku: string
	price: number
	compare_at_price: number | null
	price_includes_igv: boolean
	low_stock_threshold: number
	product_id: string
	product_name: string
	product_slug: string
	brand_name: string | null
	primary_image: string | null
	attributes: Array<{ name: string; value: string }>
	available: number
}

async function readVariantBatch(
	variantIds: string[],
	admin: ReturnType<typeof createAdminClient>
): Promise<Record<string, VariantPriced>> {
	if (!variantIds.length) return {}
	const uniqueIds = Array.from(new Set(variantIds))
	const { data, error } = await admin
		.from('product_variants')
		.select(
			`
			id,
			sku,
			price,
			price_includes_igv,
			is_active,
			product:products!left(id, name, slug, is_active, compare_at_price),
			primary_img:product_variant_images!left(id, image_url, position),
			inventory:inventory!left(quantity, reserved_quantity)
		`
		)
		.in('id', uniqueIds)
	if (error) {
		console.error('[readVariantBatch] PostgREST error:', error)
	}
	console.log('[readVariantBatch] input variantIds:', uniqueIds)
	console.log('[readVariantBatch] raw rows returned (pre-filter):', (data ?? []).length)
	if ((data ?? []).length > 0) {
		console.log('[readVariantBatch] raw row ids received:', (data as unknown as Array<{ id: string }>).map((r) => r.id))
	}

	const byId: Record<string, VariantPriced> = {}
	const foundIds: string[] = []
	for (const row of (data ?? []) as unknown as Array<{
		id: string
		sku: string
		price: number
		price_includes_igv: boolean
		is_active?: unknown
		product: unknown
		primary_img: unknown
		inventory: unknown
	}>) {
		const variantActive = row.is_active !== false
		const rawProduct = row.product as unknown as
			| Array<{
					id: string
					name: string
					slug: string
					is_active?: unknown
					compare_at_price?: number | null
			  }>
			| {
					id: string
					name: string
					slug: string
					is_active?: unknown
					compare_at_price?: number | null
			  }
			| null
			| undefined
		const productList = Array.isArray(rawProduct)
			? rawProduct
			: rawProduct && typeof rawProduct === 'object' && 'id' in rawProduct
				? [rawProduct as { id: string; name: string; slug: string; is_active?: unknown; compare_at_price?: number | null }]
				: []
		const product = productList.find((p) => p.is_active !== false) ?? productList[0] ?? null
		if (!variantActive || !product) {
			console.log('[readVariantBatch] skipping inactive variant/product:', row.id, 'variantActive=', variantActive, 'product?', !!product)
			continue
		}
		const imgs = (row.primary_img as unknown as Array<{ image_url: string; position: number }> | null) ?? []
		imgs.sort((a, b) => a.position - b.position)
		const inv = (row.inventory as unknown as Array<{ quantity: number; reserved_quantity: number }> | null) ?? []
		const qty = inv.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
		const res = inv.reduce((s, r) => s + (Number(r.reserved_quantity) || 0), 0)
		const compareAt = Number(product.compare_at_price)
		foundIds.push(row.id)
		byId[row.id] = {
			id: row.id,
			sku: row.sku,
			price: Number(row.price) || 0,
			compare_at_price: Number.isFinite(compareAt) && compareAt > 0 ? compareAt : null,
			price_includes_igv: Boolean(row.price_includes_igv),
			low_stock_threshold: 0,
			product_id: product.id ?? '',
			product_name: product.name ?? 'Producto',
			product_slug: product.slug ?? '',
			brand_name: null,
			primary_image: imgs[0]?.image_url ?? null,
			attributes: [],
			available: Math.max(0, qty - res),
		}
	}
	const notFound = uniqueIds.filter((id) => !foundIds.includes(id))
	console.log('[readVariantBatch] variantIds NOT found or inactive:', notFound)
	return byId
}

function calcTotals(
	lines: Array<{ variant_id: string; quantity: number; unit_price_from_db: number; price_includes_igv: boolean }>,
	overrideShipping?: number | null | undefined
): CartTotals {
	let subtotal = 0
	let igvTotal = 0
	for (const l of lines) {
		const qty = Math.max(0, Number(l.quantity) || 0)
		const unit = Number(l.unit_price_from_db) || 0
		const lineGross = qty * unit
		if (l.price_includes_igv) {
			const sub = lineGross / 1.18
			subtotal += sub
			igvTotal += lineGross - sub
		} else {
			subtotal += lineGross
			igvTotal += lineGross * 0.18
		}
	}
	const discountTotal = 0
	const shippingTotal = Math.max(0, Number(overrideShipping) || 0)
	return {
		subtotal: Math.round(subtotal * 100) / 100,
		discount_total: discountTotal,
		igv_total: Math.round(igvTotal * 100) / 100,
		shipping_total: shippingTotal,
		total: Math.round((subtotal + igvTotal + shippingTotal - discountTotal) * 100) / 100,
		currency: 'PEN',
	}
}

function generateGuestSessionId(): string {
	if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in (globalThis.crypto as Crypto)) {
		return (globalThis.crypto as Crypto).randomUUID()
	}
	const rand = Math.random().toString(16).slice(2, 14)
	return `legacy_${Date.now().toString(36)}_${rand}`
}

async function getCurrentScope(): Promise<
	| { mode: 'user'; userId: string }
	| { mode: 'guest'; sessionId: string }
> {
	const cookieStore = await cookies()
	const supabase = await createClient()
	const { data } = await supabase.auth.getUser()
	const userId = data?.user?.id
	if (userId) return { mode: 'user', userId }
	const existingSessionId = cookieStore.get(GUEST_COOKIE)?.value
	if (existingSessionId && existingSessionId.length >= 12) {
		return { mode: 'guest', sessionId: existingSessionId }
	}
	const freshSessionId = generateGuestSessionId()
	try {
		cookieStore.set(GUEST_COOKIE, freshSessionId, {
			path: '/',
			maxAge: 60 * 60 * 24 * 30,
			sameSite: 'lax',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
		})
	} catch {
	}
	return { mode: 'guest', sessionId: freshSessionId }
}

async function ensureCart(
	admin: ReturnType<typeof createAdminClient>,
	scope: { mode: 'user'; userId: string } | { mode: 'guest'; sessionId: string }
): Promise<string | null> {
	if (!admin) return null
	try {
		if (scope.mode === 'user') {
			const existing = await admin
				.from('carts')
				.select('id, user_id, session_id, status')
				.eq('user_id', scope.userId)
				.eq('status', 'active')
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle()
			console.log('[ensureCart] user mode select existing:', existing.data, 'error:', existing.error)
			if (existing.error) console.error('[ensureCart] user mode SELECT PostgREST error:', existing.error)
			const row = (existing.data as unknown as { id: string } | null) ?? null
			if (row) return row.id
			const insertRes = await admin
				.from('carts')
				.insert({ user_id: scope.userId, status: 'active' })
				.select('id')
				.single()
			console.log('[ensureCart] user mode insert:', insertRes.data, 'error:', insertRes.error)
			return (insertRes.data as unknown as { id: string } | null)?.id ?? null
		} else {
			const existing = await admin
				.from('carts')
				.select('id, session_id, status')
				.eq('session_id', scope.sessionId)
				.eq('status', 'active')
				.is('user_id', null)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle()
			console.log('[ensureCart] guest mode sessionId=', scope.sessionId, 'existing.data=', existing.data, 'error:', existing.error)
			if (existing.error) console.error('[ensureCart] guest mode SELECT PostgREST error:', existing.error)
			const row = (existing.data as unknown as { id: string } | null) ?? null
			if (row) return row.id
			const insertRes = await admin
				.from('carts')
				.insert({ session_id: scope.sessionId, user_id: null, status: 'active' })
				.select('id')
				.single()
			console.log('[ensureCart] guest mode new cart insert:', insertRes.data, 'error:', insertRes.error)
			return (insertRes.data as unknown as { id: string } | null)?.id ?? null
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		console.error('[ensureCart] error creating/loading cart:', message)
		return null
	}
}

async function loadCartLines(
	admin: ReturnType<typeof createAdminClient>,
	scope: { mode: 'user'; userId: string } | { mode: 'guest'; sessionId: string }
): Promise<CartPayload> {
	if (!admin) return { lines: [], totals: calcTotals([]), applied_shipping_draft: null }
	const cartId = await ensureCart(admin, scope)
	if (!cartId) return { lines: [], totals: calcTotals([]), applied_shipping_draft: null }

	const cartRow = (await admin
		.from('carts')
		.select('id, shipping_draft, shipping_total_applied')
		.eq('id', cartId)
		.limit(1)
		.maybeSingle()) as unknown as {
		data:
			| { id: string; shipping_draft: unknown; shipping_total_applied: unknown }
			| null
	}
	const rawDraft = cartRow.data?.shipping_draft
	const appliedDraft =
		rawDraft && typeof rawDraft === 'object' ? (rawDraft as CartPayload['applied_shipping_draft']) : null
	const appliedShipping = Number(cartRow.data?.shipping_total_applied) || 0

	const { data } = await admin
		.from('cart_items')
		.select('id, cart_id, variant_id, quantity, unit_price, combo_id, combo_name, combo_instance_id')
		.eq('cart_id', cartId)
		.order('created_at', { ascending: true })
	const items = (data as unknown as Array<{ id: string; cart_id: string; variant_id: string; quantity: number; unit_price: number; combo_id?: string | null; combo_name?: string | null; combo_instance_id?: string | null }> | null) ?? []
	const variantMap = await readVariantBatch(items.map((i) => i.variant_id), admin)
	const lines: CartLine[] = items.map((row) => {
		const v = variantMap[row.variant_id]
		// Preferir el precio almacenado en cart_items (precio proporcional de combo)
		// si está definido y es mayor a 0; de lo contrario usar el precio de BD.
		const storedPrice = Number(row.unit_price) || 0
		const realPrice = storedPrice > 0 ? storedPrice : (v ? v.price : 0)
		return {
			id: row.id,
			cart_id: row.cart_id,
			variant_id: row.variant_id,
			quantity: row.quantity,
			unit_price: realPrice,
			combo_id: row.combo_id ?? null,
			combo_name: row.combo_name ?? null,
			combo_instance_id: row.combo_instance_id ?? null,
			product: v
				? {
						id: v.product_id,
						name: v.product_name,
						slug: v.product_slug,
						brand: v.brand_name ? { id: '', name: v.brand_name } : null,
					}
				: null,
			variant: v
				? {
						id: v.id,
						sku: v.sku,
						price: v.price,
						compare_at_price: v.compare_at_price,
						price_includes_igv: v.price_includes_igv,
						low_stock_threshold: v.low_stock_threshold,
						attributes: v.attributes,
						primary_image: v.primary_image,
					}
				: null,
			available_stock: v?.available ?? null,
		}
	})
	const totals = calcTotals(
		lines.map((l) => ({
			variant_id: l.variant_id,
			quantity: l.quantity,
			unit_price_from_db: l.unit_price,
			price_includes_igv: Boolean(l.variant?.price_includes_igv),
		})),
		appliedShipping > 0 ? appliedShipping : null
	)
	return { cart_id: cartId, lines, totals, applied_shipping_draft: appliedDraft ?? null }
}

export async function getCurrentCart(): Promise<CartPayload> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { lines: [], totals: calcTotals([]) }
	return loadCartLines(admin, scope)
}

export async function syncLocalCartToDb(serverCart: Array<{ variant_id: string; quantity: number; unit_price?: number | null; combo_id?: string | null; combo_name?: string | null; combo_instance_id?: string | null }>): Promise<ActionState<CartPayload>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible para sincronizar el carrito.' }
	const cartId = await ensureCart(admin, scope)
	console.log('[syncLocalCartToDb] ensureCart result cartId:', cartId, 'scope.mode:', scope.mode)
	if (!cartId) {
		return {
			ok: false,
			message:
				'No se pudo inicializar el carrito en el servidor. Cierra la pestaña, vuelve a abrir la tienda e inténtalo nuevamente.',
		}
	}
	const incoming = serverCart.map((row) => ({
		variant_id: String(row.variant_id),
		quantity: Math.max(1, Number(row.quantity) || 1),
		unit_price: row.unit_price != null ? Number(row.unit_price) : null,
		combo_id: row.combo_id ? String(row.combo_id) : null,
		combo_name: row.combo_name ? String(row.combo_name) : null,
		combo_instance_id: row.combo_instance_id ? String(row.combo_instance_id) : null,
	}))
	const variantMap = await readVariantBatch(incoming.map((x) => x.variant_id), admin)

	const dropped: Array<{ variant_id: string; reason: string; product_name?: string; sku?: string }> = []
	const sanitized: typeof incoming = []

	for (const row of incoming) {
		const info = variantMap[row.variant_id]
		console.log('[syncLocalCartToDb] check variant:', row.variant_id, 'info?', !!info, 'available:', info?.available)
		if (!info) {
			dropped.push({
				variant_id: row.variant_id,
				reason: 'Variante no encontrada o inactiva en la base.',
			})
			continue
		}
		if (info.available <= 0) {
			dropped.push({
				variant_id: row.variant_id,
				product_name: info.product_name,
				sku: info.sku,
				reason: `Sin stock disponible (reservado o agotado). available=${info.available}`,
			})
			continue
		}
		sanitized.push(row)
	}
	console.log('[syncLocalCartToDb] sanitized items count:', sanitized.length, 'dropped items count:', dropped.length)

	for (const line of sanitized) {
		// La constraint única es (cart_id, variant_id, combo_id, combo_instance_id).
		// combo_id y combo_instance_id son null para ítems standalone; cada combo
		// agregado usa su propio combo_instance_id para quedar aislado.
		const existingQuery = admin
			.from('cart_items')
			.select('id, quantity')
			.eq('cart_id', cartId)
			.eq('variant_id', line.variant_id)
		if (line.combo_id) {
			existingQuery.eq('combo_id', line.combo_id)
		} else {
			existingQuery.is('combo_id', null)
		}
		if (line.combo_instance_id) {
			existingQuery.eq('combo_instance_id', line.combo_instance_id)
		} else {
			existingQuery.is('combo_instance_id', null)
		}
		const existing = (await existingQuery.limit(1).maybeSingle()) as unknown as { data: { id: string; quantity: number } | null; error?: unknown }
		console.log('[syncLocalCartToDb] existing cart_item for variant', line.variant_id, ':', existing.data?.id, 'error:', existing.error)
		const safeQty = Math.min(
			line.quantity,
			Number(variantMap[line.variant_id].available) || line.quantity
		)
		// Usar el precio proporcional del combo si viene del carrito local,
		// de lo contrario el precio de la variante en BD.
		const unitPrice = line.unit_price != null && line.unit_price > 0
			? line.unit_price
			: variantMap[line.variant_id].price
		if (existing.data) {
			const up = await admin
				.from('cart_items')
				.update({
					quantity: safeQty,
					unit_price: unitPrice,
					combo_id: line.combo_id,
					combo_name: line.combo_name,
					combo_instance_id: line.combo_instance_id,
				})
				.eq('id', existing.data.id)
			console.log('[syncLocalCartToDb] update cart_item result:', up)
			if (up.error) console.error('[syncLocalCartToDb] update cart_item PostgREST error:', up.error)
		} else {
			const ins = await admin.from('cart_items').insert({
				cart_id: cartId,
				variant_id: line.variant_id,
				quantity: safeQty,
				unit_price: unitPrice,
				combo_id: line.combo_id,
				combo_name: line.combo_name,
				combo_instance_id: line.combo_instance_id,
			})
			console.log('[syncLocalCartToDb] insert cart_item result:', ins)
		}
	}
	const payload = await loadCartLines(admin, scope)

	if (dropped.length > 0) {
		const head = `Se agregaron ${sanitized.length} producto${sanitized.length === 1 ? '' : 's'} al carrito.`
		const tail = dropped
			.map((d) => {
				const label = d.product_name ? `${d.product_name} (${d.sku ?? d.variant_id.slice(0, 8)})` : `Variante ${d.variant_id.slice(0, 8)}`
				return `• ${label}: ${d.reason}`
			})
			.join('  \n')
		return {
			ok: true,
			data: payload,
			message: `${head} Se omitieron ${dropped.length} producto${dropped.length === 1 ? '' : 's'}:\n${tail}`,
		}
	}

	return { ok: true, data: payload }
}

export async function updateCartLineQty(cartItemId: string, newQuantity: number): Promise<ActionState<CartPayload>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible.' }
	const cartId = await ensureCart(admin, scope)
	const qty = Math.max(1, Math.floor(Number(newQuantity) || 1))
	if (qty < 1) return { ok: false, message: 'Cantidad no válida.' }

	const before = (await admin
		.from('cart_items')
		.select('id, cart_id, variant_id, quantity, unit_price')
		.eq('id', cartItemId)
		.eq('cart_id', cartId)
		.maybeSingle()) as unknown as {
		data: { id: string; variant_id: string; quantity: number; unit_price: number } | null
	}
	if (!before.data) return { ok: false, message: 'Ítem no encontrado en el carrito.' }
	const variants = await readVariantBatch([before.data.variant_id], admin)
	const v = variants[before.data.variant_id]
	if (!v) return { ok: false, message: 'Variante no disponible.' }
	if (qty > v.available) {
		return {
			ok: false,
			message: `No hay stock suficiente. ${v.product_name} (${v.sku}) tiene ${v.available} unidades disponibles.`,
		}
	}

	// Los combos tienen cantidad fija (1) y se gestionan por instancia; aquí solo
	// se ajustan líneas sueltas, usando el precio actual de la variante.
	await admin.from('cart_items').update({ quantity: qty, unit_price: v.price, updated_at: new Date().toISOString() }).eq('id', cartItemId)
	const payload = await loadCartLines(admin, scope)
	return { ok: true, data: payload }
}

export async function removeCartLine(cartItemId: string): Promise<ActionState<CartPayload>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible.' }
	const cartId = await ensureCart(admin, scope)
	const row = (await admin
		.from('cart_items')
		.select('id, combo_id, combo_instance_id')
		.eq('id', cartItemId)
		.eq('cart_id', cartId)
		.maybeSingle()) as unknown as {
		data: { id: string; combo_id?: string | null; combo_instance_id?: string | null } | null
	}
	// Si pertenece a un combo, eliminar todas las líneas de esa instancia.
	if (row.data?.combo_instance_id) {
		await admin
			.from('cart_items')
			.delete()
			.eq('cart_id', cartId)
			.eq('combo_instance_id', row.data.combo_instance_id)
	} else if (row.data?.combo_id) {
		await admin
			.from('cart_items')
			.delete()
			.eq('cart_id', cartId)
			.eq('combo_id', row.data.combo_id)
	} else {
		await admin.from('cart_items').delete().eq('id', cartItemId).eq('cart_id', cartId)
	}
	const payload = await loadCartLines(admin, scope)
	return { ok: true, data: payload }
}

export async function ensureGuestCartSession(): Promise<ActionState<{ sessionId: string | null }>> {
	const cookieStore = await cookies()
	return { ok: true, data: { sessionId: cookieStore.get(GUEST_COOKIE)?.value ?? null } }
}

export interface SavedAddress {
	id: string
	user_id: string | null
	recipient_name: string
	recipient_phone: string
	address_line: string
	reference: string | null
	district: string
	province: string
	department: string
	label?: string | null
}

export async function getAddressesForCurrentUser(): Promise<ActionState<SavedAddress[]>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible.', data: [] }
	if (scope.mode !== 'user') {
		return { ok: true, data: [] }
	}
	const { data, error } = await admin
		.from('user_addresses')
		.select(
			'id, user_id, recipient_name, recipient_phone, address_line, reference, district, province, department'
		)
		.eq('user_id', scope.userId)
		.order('created_at', { ascending: false })
	if (error) {
		console.error('[getAddressesForCurrentUser] PostgREST error:', error)
		return { ok: false, message: 'No se pudo cargar las direcciones.', data: [] }
	}
	return { ok: true, data: ((data as unknown as SavedAddress[] | null) ?? []) }
}

async function validateAddressLimit(
	admin: ReturnType<typeof createAdminClient>,
	userId: string
): Promise<{ ok: boolean; count: number; message?: string }> {
	const count = ((await admin
		.from('user_addresses')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)) as unknown as { count: number | null }).count ?? 0
	if (count >= MAX_ADDRESSES_PER_USER) {
		return {
			ok: false,
			count,
			message: `Has alcanzado el límite de ${MAX_ADDRESSES_PER_USER} direcciones guardadas. Elimina una antes de agregar una nueva.`,
		}
	}
	return { ok: true, count }
}

export async function createAddress(input: {
	recipient_name: string
	recipient_phone: string
	address_line: string
	reference?: string | null
	district: string
	province: string
	department: string
	label?: string | null
}): Promise<ActionState<SavedAddress>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible.' }
	if (scope.mode !== 'user') {
		return {
			ok: false,
			message: 'Direcciones solo se guardan para clientes con cuenta. Puedes comprar como invitado sin guardar.',
		}
	}
	const name = (input.recipient_name ?? '').trim()
	const phone = (input.recipient_phone ?? '').trim()
	const line1 = (input.address_line ?? '').trim()
	const district = (input.district ?? '').trim()
	const province = (input.province ?? '').trim()
	const department = (input.department ?? '').trim()
	if (!name || !phone || !line1 || !district || !province || !department) {
		return { ok: false, message: 'Faltan datos requeridos para la dirección.' }
	}
	const limit = await validateAddressLimit(admin, scope.userId)
	if (!limit.ok) {
		return { ok: false, message: limit.message }
	}
	const payload: Record<string, unknown> = {
		user_id: scope.userId,
		recipient_name: name,
		recipient_phone: phone,
		address_line: line1,
		reference: (input.reference ?? '').trim() || null,
		district,
		province,
		department,
	}
	if (input.label && String(input.label).trim()) payload.label = String(input.label).trim()
	const { data, error } = await admin
		.from('user_addresses')
		.insert(payload as never)
		.select(
			'id, user_id, recipient_name, recipient_phone, address_line, reference, district, province, department'
		)
		.single()
	if (error) {
		console.error('[createAddress] PostgREST error:', error)
		return { ok: false, message: 'No se pudo guardar la dirección.' }
	}
	return { ok: true, data: data as unknown as SavedAddress }
}

export async function deleteAddress(addressId: string): Promise<ActionState<boolean>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible.', data: false }
	if (scope.mode !== 'user') {
		return { ok: false, message: 'No hay direcciones guardadas para modo invitado.', data: false }
	}
	if (!addressId) {
		return { ok: false, message: 'Selecciona una dirección para eliminar.', data: false }
	}
	const { error } = await admin
		.from('user_addresses')
		.delete()
		.eq('id', addressId)
		.eq('user_id', scope.userId)
	if (error) {
		console.error('[deleteAddress] PostgREST error:', error)
		return { ok: false, message: 'No se pudo eliminar la dirección.', data: false }
	}
	return { ok: true, data: true }
}

export async function applyShippingToCart(input: {
	enabled: boolean
	draft?: UbigeoDraft | null
}): Promise<ActionState<CartPayload>> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'Sesión no disponible.' }
	const cartId = await ensureCart(admin, scope)
	if (!cartId) return { ok: false, message: 'No se pudo inicializar el carrito.' }

	let amount = 0
	let storedDraft: CartPayload['applied_shipping_draft'] = null
	if (input.enabled) {
		const draft = input.draft ?? null
		if (!draft) {
			return { ok: false, message: 'Selecciona departamento, provincia y destino para ver el costo de delivery.' }
		}
		const dep = (draft.department ?? '').trim()
		const prov = (draft.province ?? '').trim()
		const dist = (draft.district ?? '').trim()
		if (!dep || !prov || !dist) {
			return { ok: false, message: 'Completa departamento, provincia y distrito.' }
		}
		const estimate = calculateShippingEstimate(WAREHOUSE_ADDRESS, draft)
		amount = Math.max(0, Number(estimate.amount) || 0)
		storedDraft = {
			enabled: true,
			department: dep,
			province: prov,
			district: dist,
			address_line: (draft.address_line ?? '').trim() || null,
			label: estimate.description,
		}
	} else {
		storedDraft = {
			enabled: false,
			department: '',
			province: '',
			district: '',
			address_line: null,
			label: 'Retiro en tienda',
		}
	}

	await admin
		.from('carts')
		.update({
			shipping_draft: storedDraft as never,
			shipping_total_applied: amount,
			updated_at: new Date().toISOString(),
		})
		.eq('id', cartId)
	const payload = await loadCartLines(admin, scope)
	return { ok: true, data: payload }
}

export async function getYapeAccountSetting(): Promise<
	ActionState<{ phone: string; holder_name: string; qr_image_url: string } | null>
> {
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'No disponible.' }
	const { data } = await admin.from('settings').select('key, value').eq('key', 'yape_account').limit(1).maybeSingle()
	const row = data as unknown as { key: string; value: unknown } | null
	const value = row?.value as
		| { phone?: string | null; holder_name?: string | null; qr_image_url?: string | null }
		| null
		| undefined
	return {
		ok: true,
		data: {
			phone: value?.phone ?? '',
			holder_name: value?.holder_name ?? 'Titular de la cuenta Sobrao Vape',
			qr_image_url: value?.qr_image_url ?? '',
		},
	}
}

export interface PlaceOrderInput {
	address_mode: 'existing' | 'new' | 'guest'
	address_id?: string | null
	address_new?: {
		full_name: string
		phone: string
		department: string
		province: string
		district: string
		line1: string
		line2?: string | null
		zip?: string | null
		reference?: string | null
	} | null
	notes?: string | null
	shipping_method_id?: string | null
	contact_email: string
	terms_accepted: boolean
	privacy_accepted: boolean
	ip_address?: string | null
	user_agent?: string | null
	captcha_token?: string | null
}

const RECAPTCHA_MIN_SCORE = 0.5
const MAX_ORDERS_PER_HOUR_PER_IP = 3
const MIN_SECONDS_BETWEEN_GUEST_ORDERS = 180
const MAX_PROOF_SUBMITS_PER_HOUR_PER_IP = 10

function isValidEmail(value: string | null | undefined): boolean {
	const v = (value ?? '').trim()
	if (!v) return false
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false
	return v.length <= 254
}

async function verifyCaptchaOrSkip(
	token: string | null | undefined,
	remoteIp: string | null | undefined
): Promise<{ ok: boolean; score?: number; message?: string }> {
	const secret = getRecaptchaSecretKey()
	const siteKey = getRecaptchaSiteKey()
	if (!secret || !siteKey) {
		return { ok: true }
	}
	if (!token) {
		return { ok: false, message: 'Verificación anti-bot incompleta. Inténtalo de nuevo.' }
	}
	try {
		const url = 'https://www.google.com/recaptcha/api/siteverify'
		const form = new URLSearchParams()
		form.append('secret', secret)
		form.append('response', token)
		if (remoteIp) form.append('remoteip', remoteIp)
		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: form.toString(),
			cache: 'no-store',
		})
		const payload = (await resp.json()) as { success: boolean; score?: number; 'error-codes'?: string[] } | null
		if (!payload || !payload.success) {
			return { ok: false, message: 'Verificación anti-bot fallida. Inténtalo en 5 minutos.' }
		}
		const score = typeof payload.score === 'number' ? payload.score : 1
		if (score < RECAPTCHA_MIN_SCORE) {
			return {
				ok: false,
				message: 'Sospechamos de actividad automatizada. Inténtalo en 5 minutos.',
				score,
			}
		}
		return { ok: true, score }
	} catch (e) {
		console.warn('[captcha] verify error skipped:', e instanceof Error ? e.message : String(e))
		return { ok: true }
	}
}

export async function placeOrderWithYape(input: PlaceOrderInput): Promise<
	ActionState<{
		order_id: string
		order_number: string
		total: number
		currency: string
		payment_id: string
		contact_email: string
		contact_recipient_name: string | null
	}>
> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'No disponible en este momento.' }

	if (!input.terms_accepted) return { ok: false, message: 'Acepta los Términos y Condiciones para continuar.' }
	if (!input.privacy_accepted) return { ok: false, message: 'Acepta la Política de Privacidad para continuar.' }
	if (!isValidEmail(input.contact_email)) return { ok: false, message: 'Ingresa un correo electrónico válido.' }

	const captchaCheck = await verifyCaptchaOrSkip(input.captcha_token ?? null, input.ip_address ?? null)
	if (!captchaCheck.ok) return { ok: false, message: captchaCheck.message }

	const now = new Date()
	const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
	const threeMinAgo = new Date(now.getTime() - MIN_SECONDS_BETWEEN_GUEST_ORDERS * 1000).toISOString()
	if (input.ip_address) {
		const ipCount = ((await admin
			.from('orders')
			.select('id', { count: 'exact', head: true })
			.eq('ip_address', input.ip_address)
			.gte('created_at', hourAgo)) as unknown as { count: number | null }).count ?? 0
		if (ipCount >= MAX_ORDERS_PER_HOUR_PER_IP) {
			return {
				ok: false,
				message: `Límite de pedidos alcanzado. Máximo ${MAX_ORDERS_PER_HOUR_PER_IP} pedidos por hora. Inténtalo más tarde.`,
			}
		}
	}
	if (scope.mode === 'guest') {
		const lastGuest = ((await admin
			.from('orders')
			.select('created_at')
			.eq('user_id', null)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle()) as unknown as { data: { created_at: string } | null }).data
		if (lastGuest && new Date(lastGuest.created_at).getTime() > new Date(threeMinAgo).getTime()) {
			return {
				ok: false,
				message: `Para continuar espera ${MIN_SECONDS_BETWEEN_GUEST_ORDERS} segundos entre pedidos.`,
			}
		}
	}

	const cartId = await ensureCart(admin, scope)
	if (!cartId) return { ok: false, message: 'No existe un carrito para finalizar la compra.' }
	const rawItems = (await admin
		.from('cart_items')
		.select('id, cart_id, variant_id, quantity, unit_price')
		.eq('cart_id', cartId)) as unknown as {
		data: Array<{ id: string; variant_id: string; quantity: number; unit_price: number }> | null
	}
	const items = rawItems.data ?? []
	if (!items.length) return { ok: false, message: 'Tu carrito está vacío.' }

	const variantIds = items.map((i) => i.variant_id)
	const priced = await readVariantBatch(variantIds, admin)
	const linesReady: Array<{
		variant_id: string
		quantity: number
		price: number
		price_includes_igv: boolean
		product_id: string
		product_name: string
		sku: string
		available: number
		warehouse_id?: string | null
	}> = []

	for (const it of items) {
		const v = priced[it.variant_id]
		if (!v) {
			return {
				ok: false,
				message: `La variante ${it.variant_id} ya no está disponible. Actualiza tu carrito.`,
			}
		}
		if (it.quantity > v.available) {
			return {
				ok: false,
				message: `Stock insuficiente para ${v.product_name} (${v.sku}). Hay ${v.available} unidades disponibles.`,
			}
		}
		// Usar el precio almacenado en cart_items (precio proporcional de combo)
		// si está definido; de lo contrario el precio de la variante en BD.
		const storedPrice = Number(it.unit_price) || 0
		const finalPrice = storedPrice > 0 ? storedPrice : v.price
		linesReady.push({
			variant_id: v.id,
			quantity: it.quantity,
			price: finalPrice,
			price_includes_igv: v.price_includes_igv,
			product_id: v.product_id,
			product_name: v.product_name,
			sku: v.sku,
			available: v.available,
		})
	}

	const MAX_UNITS_PER_SKU = 5
	const MAX_TOTAL_UNITS = 10
	const totalUnits = linesReady.reduce((s, l) => s + l.quantity, 0)
	for (const l of linesReady) {
		if (l.quantity > MAX_UNITS_PER_SKU) {
			return {
				ok: false,
				message: `Límite por producto: máximo ${MAX_UNITS_PER_SKU} unidades de ${l.product_name} (${l.sku}).`,
			}
		}
	}
	if (totalUnits > MAX_TOTAL_UNITS) {
		return {
			ok: false,
			message: `Límite por pedido: máximo ${MAX_TOTAL_UNITS} unidades en total (tienes ${totalUnits}).`,
		}
	}

	const totals = calcTotals(
		linesReady.map((l) => ({
			variant_id: l.variant_id,
			quantity: l.quantity,
			unit_price_from_db: l.price,
			price_includes_igv: l.price_includes_igv,
		}))
	)

	let userId: string | null = null
	if (scope.mode === 'user') {
		userId = scope.userId
	}

	let addressId: string | null = input.address_id ?? null
	const addressSnapshotLines: string[] = []
	let contactSnapshot: {
		recipient_name: string
		recipient_phone: string
		address_line: string | null
		reference: string | null
		district: string | null
		province: string | null
		department: string | null
	} | null = null

	const combineAddressLine = (line1: string, line2: string | null | undefined, zip: string | null | undefined): string => {
		const parts: string[] = []
		const l1 = line1?.trim() ?? ''
		if (l1) parts.push(l1)
		const l2 = line2?.trim() ?? ''
		if (l2) parts.push(l2)
		const z = zip?.trim() ?? ''
		if (z) parts.push(`(CP ${z})`)
		return parts.join(' · ')
	}
	const combineReference = (ref: string | null | undefined): string | null => {
		const r = ref?.trim() ?? ''
		return r ? r : null
	}

	const persistAddressSnapshot = async (addr: NonNullable<PlaceOrderInput['address_new']>): Promise<string | null> => {
		const recipient_name = addr.full_name.trim()
		const recipient_phone = addr.phone.trim()
		const address_line = combineAddressLine(addr.line1, addr.line2, addr.zip)
		const reference = combineReference(addr.reference)
		const department = addr.department.trim()
		const province = addr.province.trim()
		const district = addr.district.trim()
		const payload = {
			// userId may be null for guest checkouts; migration 29 makes user_id nullable
			user_id: userId,
			recipient_name,
			recipient_phone,
			address_line,
			reference,
			district,
			province,
			department,
			is_default: false,
		}
		const ins = (await admin
			.from('user_addresses')
			.insert(payload)
			.select('id')
			.single()) as unknown as { data: { id: string } | null; error?: { message?: string } | null }
		if (ins.error) {
			console.error('[placeOrderWithYape] persistAddressSnapshot insert error:', JSON.stringify(ins.error))
		}
		return ins.data?.id ?? null
	}

	if (input.address_mode === 'new' && input.address_new) {
		if (!input.address_new.full_name.trim()) return { ok: false, message: 'Falta el nombre completo de recepción.' }
		if (!input.address_new.phone.trim()) return { ok: false, message: 'Falta el teléfono de contacto.' }
		if (!input.address_new.department.trim() || !input.address_new.province.trim() || !input.address_new.district.trim()) {
			return { ok: false, message: 'Falta ubigeo: departamento / provincia / distrito.' }
		}
		if (!input.address_new.line1.trim()) return { ok: false, message: 'Falta la dirección (calle / número / etc).' }
		const newId = await persistAddressSnapshot(input.address_new)
		if (newId) addressId = newId
		contactSnapshot = {
			recipient_name: input.address_new.full_name.trim(),
			recipient_phone: input.address_new.phone.trim(),
			address_line: combineAddressLine(input.address_new.line1, input.address_new.line2, input.address_new.zip) || null,
			reference: combineReference(input.address_new.reference),
			district: input.address_new.district.trim() || null,
			province: input.address_new.province.trim() || null,
			department: input.address_new.department.trim() || null,
		}
		addressSnapshotLines.push(
			...[
				`Recibe: ${input.address_new.full_name.trim()}`,
				`Teléfono: ${input.address_new.phone.trim()}`,
				combineAddressLine(input.address_new.line1, input.address_new.line2, input.address_new.zip),
				`${input.address_new.district.trim()} / ${input.address_new.province.trim()} / ${input.address_new.department.trim()}`,
				combineReference(input.address_new.reference)
					? `Ref: ${combineReference(input.address_new.reference)}`
					: null,
			].filter(Boolean) as string[]
		)
	} else if (input.address_mode === 'existing' && addressId) {
		const whereClause = admin
			.from('user_addresses')
			.select(
				'id, recipient_name, recipient_phone, address_line, reference, district, province, department, user_id'
			)
			.eq('id', addressId)
			.limit(1)
		if (userId) whereClause.eq('user_id', userId)
		const a = (await whereClause.maybeSingle()) as unknown as {
			data: Record<string, unknown> | null
		}
		if (!a.data) return { ok: false, message: 'Dirección seleccionada no existe.' }
		const recipient_name = String(a.data.recipient_name ?? '').trim()
		const recipient_phone = String(a.data.recipient_phone ?? '').trim()
		const address_line = String(a.data.address_line ?? '').trim() || null
		const reference = a.data.reference ? String(a.data.reference) : null
		const district = String(a.data.district ?? '').trim() || null
		const province = String(a.data.province ?? '').trim() || null
		const department = String(a.data.department ?? '').trim() || null
		contactSnapshot = { recipient_name, recipient_phone, address_line, reference, district, province, department }
		addressSnapshotLines.push(
			...[
				`Recibe: ${recipient_name}`,
				`Teléfono: ${recipient_phone}`,
				address_line,
				[district, province, department].filter(Boolean).join(' / ') || null,
				reference ? `Ref: ${reference}` : null,
			].filter(Boolean) as string[]
		)
	} else if (input.address_mode === 'guest' && input.address_new) {
		if (!input.address_new.full_name.trim()) return { ok: false, message: 'Falta el nombre completo de recepción.' }
		if (!input.address_new.phone.trim()) return { ok: false, message: 'Falta el teléfono de contacto.' }
		if (!input.address_new.department.trim() || !input.address_new.province.trim() || !input.address_new.district.trim()) {
			return { ok: false, message: 'Falta ubigeo: departamento / provincia / distrito.' }
		}
		if (!input.address_new.line1.trim()) return { ok: false, message: 'Falta la dirección (calle / número / etc).' }
		const newId = await persistAddressSnapshot(input.address_new)
		if (newId) addressId = newId
		contactSnapshot = {
			recipient_name: input.address_new.full_name.trim(),
			recipient_phone: input.address_new.phone.trim(),
			address_line: combineAddressLine(input.address_new.line1, input.address_new.line2, input.address_new.zip) || null,
			reference: combineReference(input.address_new.reference),
			district: input.address_new.district.trim() || null,
			province: input.address_new.province.trim() || null,
			department: input.address_new.department.trim() || null,
		}
		addressSnapshotLines.push(
			...[
				`Recibe: ${input.address_new.full_name.trim()}`,
				`Teléfono: ${input.address_new.phone.trim()}`,
				combineAddressLine(input.address_new.line1, input.address_new.line2, input.address_new.zip),
				`${input.address_new.district.trim()} / ${input.address_new.province.trim()} / ${input.address_new.department.trim()}`,
				combineReference(input.address_new.reference)
					? `Ref: ${combineReference(input.address_new.reference)}`
					: null,
			].filter(Boolean) as string[]
		)
	} else {
		return { ok: false, message: 'Falta seleccionar o completar la dirección de entrega.' }
	}

	const contactEmail = input.contact_email.trim().toLowerCase()
	const acceptedAt = new Date().toISOString()

	const addressSnapshot = addressSnapshotLines.join(' | ')

	const ymd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
	const seqCount = ((await admin
		.from('orders')
		.select('id', { count: 'exact', head: true })
		.gte('created_at', new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString())
		.lt(
			'created_at',
			new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)).toISOString()
		)) as unknown as { count: number | null }).count ?? 0
	const seq = String(seqCount + 1).padStart(5, '0')
	const finalOrderNumber = `SV-${ymd}-${seq}`

	const reservationsDue = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString()

	// BEGIN: atomic-ish block (best-effort atomicity via sequential writes + exception rollback)
	let createdOrder: {
		id: string
		order_number: string
		total: number
		currency: string
	} | null = null
	let createdPaymentId: string | null = null

	const createdReservationIds: string[] = []
	const createdMovementIds: string[] = []
	const insertedOrderItemIds: string[] = []

	try {
		console.log(`[placeOrderWithYape] STEP 1 (reservas) BEGIN; lines=${linesReady.length}`)
		for (const line of linesReady) {
			const warehouseResp = (await admin
				.from('inventory')
				.select('id, warehouse_id, quantity, reserved_quantity')
				.eq('variant_id', line.variant_id)
				.order('quantity', { ascending: false })
				.limit(1)
				.maybeSingle()) as unknown as {
				data: { id: string; warehouse_id: string; quantity: number; reserved_quantity: number } | null
				error?: { code?: string; message?: string; details?: string; hint?: string } | null
			}
			if (warehouseResp.error) {
				console.error('[placeOrderWithYape] STEP 1 PostgREST ERROR (inventory select):', JSON.stringify(warehouseResp.error))
				throw new Error(
					`No se pudo consultar inventario para ${line.sku}: ${warehouseResp.error.message || warehouseResp.error.code}`
				)
			}
			if (!warehouseResp.data) {
				throw new Error(`No existe inventario para ${line.sku}.`)
			}
			const warehouseId = warehouseResp.data.warehouse_id
			console.log(`[placeOrderWithYape] STEP 1 variant=${line.variant_id} sku=${line.sku} qty=${line.quantity} warehouseRowId=${warehouseResp.data.id} warehouseId=${warehouseId} available=${Number(warehouseResp.data.quantity) - Number(warehouseResp.data.reserved_quantity)}`)
			// IMPORTANTE ESQUEMA stock_reservations: id + inventory_id (FK inventory NOT NULL) + cart_id + order_id + quantity.
			// NO EXISTEN columnas: variant_id, warehouse_id, released_at. NO CAMBIAR SIN MIGRACIÓN.
			const resResp = (await admin
				.from('stock_reservations')
				.insert({
					order_id: null,
					cart_id: cartId,
					inventory_id: warehouseResp.data.id,
					quantity: line.quantity,
					status: 'active',
					expires_at: reservationsDue,
				})
				.select('id')
				.single()) as unknown as {
				data: { id: string } | null
				error?: { code?: string; message?: string; details?: string; hint?: string } | null
			}
			if (resResp.error) {
				console.error('[placeOrderWithYape] STEP 1 PostgREST ERROR (stock_reservations insert):', JSON.stringify(resResp.error))
				throw new Error(
					`No se pudo insertar reserva para ${line.sku}: ${resResp.error.message || resResp.error.code || 'error desconocido'}`
				)
			}
			if (!resResp.data) throw new Error('No se pudo generar la reserva de stock (fila vacía).')
			createdReservationIds.push(resResp.data.id)
			const updResp = (await admin
				.from('inventory')
				.update({
					reserved_quantity: (Number(warehouseResp.data.reserved_quantity) || 0) + line.quantity,
				})
				.eq('id', warehouseResp.data.id)) as unknown as {
				error?: { code?: string; message?: string; details?: string; hint?: string } | null
			}
			if (updResp.error) {
				console.error('[placeOrderWithYape] STEP 1 PostgREST ERROR (inventory update reserved_quantity):', JSON.stringify(updResp.error))
				throw new Error(
					`No se pudo bloquear stock en inventario para ${line.sku}: ${updResp.error.message || updResp.error.code}`
				)
			}
		}
		console.log(`[placeOrderWithYape] STEP 1 (reservas) END; reservationIds=`, createdReservationIds)

		console.log(`[placeOrderWithYape] STEP 2 (order create) BEGIN; orderNumber=${finalOrderNumber}`)
		const orderInsPayload: Record<string, unknown> = {
			order_number: finalOrderNumber,
			user_id: userId,
			address_id: addressId,
			status: 'pending',
			subtotal: totals.subtotal,
			discount_total: totals.discount_total,
			igv_total: totals.igv_total,
			shipping_total: totals.shipping_total,
			total: totals.total,
			currency: 'PEN',
			notes: input.notes?.trim() || null,
			contact_email: contactEmail,
			terms_accepted_at: acceptedAt,
			privacy_accepted_at: acceptedAt,
			ip_address: input.ip_address?.trim() || null,
			user_agent: input.user_agent?.trim() || null,
		}
		if (contactSnapshot) {
			orderInsPayload.contact_recipient_name = contactSnapshot.recipient_name || null
			orderInsPayload.contact_recipient_phone = contactSnapshot.recipient_phone || null
			orderInsPayload.contact_address_line = contactSnapshot.address_line || null
			orderInsPayload.contact_reference = contactSnapshot.reference || null
			orderInsPayload.contact_district = contactSnapshot.district || null
			orderInsPayload.contact_province = contactSnapshot.province || null
			orderInsPayload.contact_department = contactSnapshot.department || null
		}
		// IMPORTANTE ESQUEMA orders: NO EXISTE columna address_snapshot (PGRST204). NO CAMBIAR SIN MIGRACIÓN.
		const orderIns = (await admin
			.from('orders')
			.insert(orderInsPayload)
			.select('id, order_number, total, currency')
			.single()) as unknown as {
			data: { id: string; order_number: string; total: number; currency: string } | null
			error?: { code?: string; message?: string; details?: string; hint?: string } | null
		}
		if (orderIns.error) {
			console.error('[placeOrderWithYape] STEP 2 PostgREST ERROR (orders insert):', JSON.stringify(orderIns.error))
			throw new Error(
				`No se pudo crear la orden: ${orderIns.error.message || orderIns.error.code || 'error desconocido'}`
			)
		}
		if (!orderIns.data) throw new Error('No se pudo crear la orden (fila vacía).')
		createdOrder = orderIns.data
		console.log(`[placeOrderWithYape] STEP 2 (order create) END; orderId=${createdOrder.id}`)

		console.log(`[placeOrderWithYape] STEP 2b (associate reservations) BEGIN; orderId=${createdOrder.id}`)
		await admin.from('stock_reservations').update({ order_id: createdOrder.id }).in('id', createdReservationIds)
		console.log(`[placeOrderWithYape] STEP 2b (associate reservations) END`)

		console.log(`[placeOrderWithYape] STEP 3 (order items) BEGIN; lines=${linesReady.length}`)
		for (const line of linesReady) {
			const lineGross = line.quantity * line.price
			let lineSubtotal: number
			let lineIgv: number
			if (line.price_includes_igv) {
				lineSubtotal = lineGross / 1.18
				lineIgv = lineGross - lineSubtotal
			} else {
				lineSubtotal = lineGross
				lineIgv = lineGross * 0.18
			}
			const ins = (await admin
				.from('order_items')
				.insert({
					order_id: createdOrder.id,
					variant_id: line.variant_id,
					product_name_snapshot: line.product_name,
					sku_snapshot: line.sku,
					quantity: line.quantity,
					unit_price: line.price,
					igv_amount: Math.round(lineIgv * 100) / 100,
					subtotal: Math.round(lineSubtotal * 100) / 100,
				})
				.select('id')
				.single()) as unknown as { data: { id: string } | null }
			if (ins.data) insertedOrderItemIds.push(ins.data.id)
		}
		console.log(`[placeOrderWithYape] STEP 3 (order items) END; insertedItemIds=`, insertedOrderItemIds)

		console.log(`[placeOrderWithYape] STEP 4 (payment Yape) BEGIN; amount=${createdOrder.total}`)
		const pay = (await admin
			.from('payments')
			.insert({
				order_id: createdOrder.id,
				method: 'yape',
				provider: 'manual',
				provider_reference: null,
				proof_url: null,
				amount: createdOrder.total,
				status: 'pending',
				paid_at: null,
			})
			.select('id')
			.single()) as unknown as { data: { id: string } | null }
		if (!pay.data) throw new Error('No se pudo inicializar el pago.')
		createdPaymentId = pay.data.id
		console.log(`[placeOrderWithYape] STEP 4 (payment Yape) END; paymentId=${createdPaymentId}`)

		console.log(`[placeOrderWithYape] STEP 5 (audit log) BEGIN; orderId=${createdOrder.id}`)
		await logAudit({
			userId,
			action: 'create',
			resourceType: 'orders',
			resourceId: createdOrder.id,
			diff: {
				old: null,
				new: {
					order_number: createdOrder.order_number,
					status: 'pending',
					total: createdOrder.total,
					currency: createdOrder.currency,
					line_items: linesReady.length,
					payment_id: createdPaymentId,
					address_snapshot: addressSnapshot,
				},
			},
			note: `Cliente generó pedido ${createdOrder.order_number} con pago Yape pendiente.`,
		})
		console.log(`[placeOrderWithYape] STEP 5 (audit log) END`)

		console.log(`[placeOrderWithYape] STEP 6 (admin notif) BEGIN`)
		try {
			const adminRole = (await admin
				.from('roles')
				.select('id, name')
				.eq('name', 'admin')
				.limit(1)
				.maybeSingle()) as unknown as { data: { id: number } | null }
			if (adminRole.data?.id) {
				const shortTotal = (createdOrder.total).toFixed(2)
				await admin.from('notifications').insert({
					target_role_id: adminRole.data.id,
					target_user_id: null,
					type: 'order_update',
					title: `Nuevo pedido YAPE pendiente`,
					message: `Nuevo pedido ${createdOrder.order_number} pendiente de verificar pago Yape — S/ ${shortTotal}.`,
					data: { order_id: createdOrder.id, channel: 'web', kind: 'yape_pending' },
				})
			}
		} catch (notifErr) {
			console.warn('[placeOrderWithYape] STEP 6 (admin notif) best-effort skipped:', notifErr instanceof Error ? notifErr.message : String(notifErr))
		}
		console.log(`[placeOrderWithYape] STEP 6 (admin notif) END`)
	} catch (e) {
		console.error(
			'[placeOrderWithYape] CAUGHT THROW (will ROLLBACK):',
			e instanceof Error ? e.message : String(e),
			'\nSTACK:',
			e instanceof Error ? e.stack : 'n/a'
		)
		const msg = e instanceof Error ? e.message : 'Error inesperado al generar la orden.'
		if (createdReservationIds.length) {
			console.log(`[placeOrderWithYape] ROLLBACK: releasing ${createdReservationIds.length} reservations`)
			await admin
				.from('stock_reservations')
				.update({ status: 'released' })
				.in('id', createdReservationIds)
			for (const rid of createdReservationIds) {
				const r = (await admin
					.from('stock_reservations')
					.select('id, inventory_id, quantity')
					.eq('id', rid)
					.limit(1)
					.maybeSingle()) as unknown as {
					data: { inventory_id: string; quantity: number } | null
				}
				if (r.data) {
					const inv = (await admin
						.from('inventory')
						.select('id, reserved_quantity')
						.eq('id', r.data.inventory_id)
						.limit(1)
						.maybeSingle()) as unknown as {
						data: { id: string; reserved_quantity: number } | null
					}
					if (inv.data) {
						const newReserved = Math.max(0, (Number(inv.data.reserved_quantity) || 0) - r.data.quantity)
						await admin.from('inventory').update({ reserved_quantity: newReserved }).eq('id', inv.data.id)
					}
				}
			}
		}
		if (createdPaymentId) {
			console.log(`[placeOrderWithYape] ROLLBACK: deleting payment ${createdPaymentId}`)
			await admin.from('payments').delete().eq('id', createdPaymentId)
		}
		if (createdOrder) {
			console.log(`[placeOrderWithYape] ROLLBACK: deleting order ${createdOrder.id} and its items`)
			if (insertedOrderItemIds.length) {
				await admin.from('order_items').delete().in('id', insertedOrderItemIds)
			}
			await admin.from('orders').delete().eq('id', createdOrder.id)
		}
		return { ok: false, message: msg }
	}

	return {
		ok: true,
		data: {
			order_id: createdOrder.id,
			order_number: createdOrder.order_number,
			total: createdOrder.total,
			currency: createdOrder.currency,
			payment_id: createdPaymentId as string,
			contact_email: contactEmail,
			contact_recipient_name: contactSnapshot?.recipient_name ?? null,
		},
	}
}

export async function submitPaymentProof(
	paymentId: string,
	orderId: string,
	providerReference: string,
	proofPublicUrl: string,
	extra?: { captcha_token?: string | null; ip_address?: string | null }
): Promise<ActionState<{ payment_id: string; order_id: string; order_status: string }>> {
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'No disponible en este momento.' }
	if (!providerReference.trim()) {
		return { ok: false, message: 'Ingresa el número de operación de Yape.' }
	}
	if (!proofPublicUrl) {
		return { ok: false, message: 'Adjunta la captura del comprobante Yape.' }
	}

	const captchaCheck = await verifyCaptchaOrSkip(extra?.captcha_token ?? null, extra?.ip_address ?? null)
	if (!captchaCheck.ok) return { ok: false, message: captchaCheck.message }

	const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
	const orderRowForProof = (await admin
		.from('orders')
		.select('id, ip_address')
		.eq('id', orderId)
		.limit(1)
		.maybeSingle()) as unknown as { data: { id: string; ip_address: string | null } | null }
	const resolvedIp = extra?.ip_address?.trim() || orderRowForProof.data?.ip_address || null
	if (resolvedIp) {
		const recentProofs = ((await admin
			.from('orders')
			.select('id', { count: 'exact', head: true })
			.eq('ip_address', resolvedIp)
			.gte('updated_at', hourAgo)) as unknown as { count: number | null }).count ?? 0
		if (recentProofs >= MAX_PROOF_SUBMITS_PER_HOUR_PER_IP) {
			return {
				ok: false,
				message: `Límite alcanzado: máximo ${MAX_PROOF_SUBMITS_PER_HOUR_PER_IP} envíos de comprobante por hora. Inténtalo más tarde.`,
			}
		}
	}

	const ref = providerReference.trim()
	const existing = (await admin
		.from('payments')
		.select('id')
		.eq('provider_reference', ref)
		.neq('id', paymentId)
		.limit(1)
		.maybeSingle()) as unknown as { data: { id: string } | null }
	if (existing.data) {
		return {
			ok: false,
			message: 'Este comprobante ya fue registrado en otro pedido. Verifica el número de operación.',
		}
	}
	const p0 = (await admin
		.from('payments')
		.select('id, order_id, status, method')
		.eq('id', paymentId)
		.eq('order_id', orderId)
		.limit(1)
		.maybeSingle()) as unknown as {
		data: { id: string; order_id: string; status: string; method: string } | null
	}
	if (!p0.data) return { ok: false, message: 'Pago no encontrado.' }
	if (p0.data.status !== 'pending') return { ok: false, message: 'Este pago ya no está pendiente.' }
	const updateRes = await admin
		.from('payments')
		.update({
			provider_reference: ref,
			proof_url: proofPublicUrl,
			updated_at: new Date().toISOString(),
		})
		.eq('id', paymentId)
	if (updateRes.error) {
		if (updateRes.error.code === '23505' && /uniq_payments_provider_reference/.test(updateRes.error.message || '')) {
			return {
				ok: false,
				message: 'Este comprobante ya fue registrado en otro pedido. Verifica el número de operación.',
			}
		}
		return { ok: false, message: updateRes.error.message || 'No se pudo guardar el comprobante.' }
	}
	const orderRow = (await admin
		.from('orders')
		.select('id, status')
		.eq('id', orderId)
		.limit(1)
		.single()) as unknown as { data: { id: string; status: string } | null }

	return {
		ok: true,
		data: {
			payment_id: paymentId,
			order_id: orderId,
			order_status: orderRow.data?.status ?? 'pending',
		},
	}
}

export async function listUserAddressesServer(): Promise<
	ActionState<
		Array<{
			id: string
			full_name: string
			phone: string
			department: string
			province: string
			district: string
			line1: string
			line2: string | null
			zip_code: string | null
			reference: string | null
			is_default: boolean
		}>
	>
> {
	const scope = await getCurrentScope()
	const admin = createAdminClient()
	if (!admin) return { ok: false, message: 'No disponible.' }
	if (scope.mode !== 'user') return { ok: true, data: [] }
	const { data } = await admin
		.from('user_addresses')
		.select(
			`id, recipient_name, recipient_phone, address_line, reference, district, province, department, is_default, user_id, created_at`
		)
		.eq('user_id', scope.userId)
		.order('is_default', { ascending: false })
		.order('created_at', { ascending: false })
	const rows = (data ?? []) as unknown as Array<{
		id: string
		recipient_name: string
		recipient_phone: string
		address_line: string
		reference: string | null
		district: string
		province: string
		department: string
		is_default: boolean
	}>
	const mapped = rows.map((r) => ({
		id: r.id,
		full_name: r.recipient_name,
		phone: r.recipient_phone,
		department: r.department,
		province: r.province,
		district: r.district,
		line1: r.address_line,
		line2: null,
		zip_code: null,
		reference: r.reference,
		is_default: r.is_default,
	}))
	return { ok: true, data: mapped }
}
