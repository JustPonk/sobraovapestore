import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'

const GUEST_COOKIE = 'sv_guest_session'

function getSessionId(req: NextRequest): string | null {
	const headerValue = req.cookies.get(GUEST_COOKIE)?.value ?? null
	return headerValue && headerValue.length >= 12 ? headerValue : null
}

async function ensureCartId(
	admin: ReturnType<typeof createAdminClient>,
	sessionId: string
): Promise<string | null> {
	if (!admin) return null
	const { data } = await admin
		.from('carts')
		.select('id')
		.eq('session_id', sessionId)
		.is('user_id', null)
		.is('checked_out_at', null)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	const existing = (data as unknown as { id: string } | null) ?? null
	if (existing) return existing.id
	try {
		const ins = (await admin
			.from('carts')
			.insert({ session_id: sessionId, user_id: null, currency: 'PEN' })
			.select('id')
			.single()) as unknown as { data: { id: string } | null }
		return ins?.data?.id ?? null
	} catch {
		return null
	}
}

type Body =
	| { action: 'list' }
	| { action: 'set_qty'; cart_item_id: string; quantity: number }
	| { action: 'remove'; cart_item_id: string }
	| { action: 'sync_lines'; lines: Array<{ variant_id: string; quantity: number }> }

export async function POST(req: NextRequest) {
	const sessionId = getSessionId(req)
	const admin = createAdminClient()
	if (!sessionId || !admin) {
		return NextResponse.json({ ok: false, message: 'Sesión invitado no disponible.' }, { status: 401 })
	}
	const cartId = await ensureCartId(admin, sessionId)
	if (!cartId) {
		return NextResponse.json({ ok: false, message: 'No se pudo inicializar el carrito.' }, { status: 500 })
	}
	let body: Body
	try {
		body = (await req.json()) as Body
	} catch {
		return NextResponse.json({ ok: false, message: 'Cuerpo inválido.' }, { status: 400 })
	}

	if (body.action === 'list') {
		const { data } = await admin
			.from('cart_items')
			.select(
				`
				id, cart_id, variant_id, quantity, unit_price,
				variant:variant_id (
					id, sku, price, price_includes_igv,
					product:products (id, name, slug, brand:brands(id,name)),
					img:product_variant_images (image_url, sort_order)
				)
			`
			)
			.eq('cart_id', cartId)
		const rows = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
			const variant = r.variant as unknown as Array<Record<string, unknown>> | Record<string, unknown> | undefined
			const v = Array.isArray(variant) ? variant[0] : variant
			const product = v?.product as unknown as Array<Record<string, unknown>> | undefined
			const p = product?.[0]
			const brandArr = p?.brand as unknown as Array<{ name: string }> | undefined
			const imgs = (v?.img as unknown as Array<{ image_url: string; sort_order: number }> | undefined) ?? []
			imgs.sort((a, b) => a.sort_order - b.sort_order)
			return {
				id: r.id,
				cart_id: r.cart_id,
				variant_id: r.variant_id,
				quantity: r.quantity,
				unit_price: v?.price ?? r.unit_price,
				product: p ? { id: p.id, name: p.name, slug: p.slug, brand: brandArr?.[0]?.name ?? null } : null,
				variant: v
					? { id: v.id, sku: v.sku, price: v.price, price_includes_igv: v.price_includes_igv, primary_image: imgs[0]?.image_url ?? null }
					: null,
			}
		})
		return NextResponse.json({ ok: true, data: { cart_id: cartId, items: rows } })
	}

	if (body.action === 'set_qty') {
		const qty = Math.max(1, Math.floor(Number(body.quantity) || 1))
		const current = (await admin
			.from('cart_items')
			.select('id, variant_id, quantity')
			.eq('id', body.cart_item_id)
			.eq('cart_id', cartId)
			.limit(1)
			.maybeSingle()) as unknown as { data: { id: string; variant_id: string } | null }
		if (!current.data) return NextResponse.json({ ok: false, message: 'Ítem no encontrado.' }, { status: 404 })
		await admin
			.from('cart_items')
			.update({ quantity: qty, updated_at: new Date().toISOString() })
			.eq('id', current.data.id)
		return NextResponse.json({ ok: true })
	}

	if (body.action === 'remove') {
		await admin.from('cart_items').delete().eq('id', body.cart_item_id).eq('cart_id', cartId)
		return NextResponse.json({ ok: true })
	}

	if (body.action === 'sync_lines') {
		const lines = Array.isArray(body.lines) ? body.lines : []
		const variantIds = Array.from(new Set(lines.map((l) => l.variant_id).filter(Boolean)))
		const { data: variants } = await admin
			.from('product_variants')
			.select('id, price')
			.in('id', variantIds)
		const variantMap = new Map<string, number>()
		for (const v of (variants ?? []) as unknown as Array<{ id: string; price: number }>) {
			variantMap.set(v.id, Number(v.price) || 0)
		}
		for (const line of lines) {
			const variantId = String(line.variant_id)
			const qty = Math.max(1, Math.floor(Number(line.quantity) || 1))
			const price = variantMap.get(variantId) ?? 0
			if (price <= 0) continue
			const existing = (await admin
				.from('cart_items')
				.select('id')
				.eq('cart_id', cartId)
				.eq('variant_id', variantId)
				.limit(1)
				.maybeSingle()) as unknown as { data: { id: string } | null }
			if (existing.data) {
				await admin
					.from('cart_items')
					.update({ quantity: qty, unit_price: price, updated_at: new Date().toISOString() })
					.eq('id', existing.data.id)
			} else {
				await admin.from('cart_items').insert({
					cart_id: cartId,
					variant_id: variantId,
					quantity: qty,
					unit_price: price,
				})
			}
		}
		return NextResponse.json({ ok: true })
	}

	return NextResponse.json({ ok: false, message: 'Acción desconocida.' }, { status: 400 })
}
