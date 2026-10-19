import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
	const admin = createAdminClient()
	if (!admin) return NextResponse.json({ ok: false, message: 'No disponible.' }, { status: 500 })

	// Reservas vencidas sin consumir
	// IMPORTANTE ESQUEMA stock_reservations: id + inventory_id (FK inventory NOT NULL) + cart_id + order_id + quantity.
	// NO EXISTEN columnas: variant_id, warehouse_id, released_at. NO CAMBIAR SIN MIGRACIÓN.
	const { data: activeExpired } = await admin
		.from('stock_reservations')
		.select('id, inventory_id, quantity')
		.eq('status', 'active')
		.lt('expires_at', new Date().toISOString())

	const list = (activeExpired ?? []) as unknown as Array<{
		id: string
		inventory_id: string
		quantity: number
	}>
	let released = 0
	for (const r of list) {
		await admin.from('stock_reservations').update({ status: 'released' }).eq('id', r.id)
		const warehouseRow = (await admin
			.from('inventory')
			.select('id, reserved_quantity')
			.eq('id', r.inventory_id)
			.limit(1)
			.maybeSingle()) as unknown as { data: { id: string; reserved_quantity: number } | null }
		if (warehouseRow.data) {
			const newValue = Math.max(0, (Number(warehouseRow.data.reserved_quantity) || 0) - r.quantity)
			await admin.from('inventory').update({ reserved_quantity: newValue }).eq('id', warehouseRow.data.id)
		}
		released += 1
	}

	return NextResponse.json({ ok: true, released, processed_at: new Date().toISOString() })
}
