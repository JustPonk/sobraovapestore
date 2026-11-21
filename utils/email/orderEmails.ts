import { formatPEN } from '@/utils/format'

import { sendMail } from './mailer'

export interface OrderEmailLine {
	name: string
	sku: string
	quantity: number
	lineTotal: number
}

export interface OrderEmailContext {
	orderNumber: string
	total: number
	currency: string
	contactEmail: string
	recipientName: string | null
	phone: string | null
	addressLine: string | null
	reference: string | null
	items: OrderEmailLine[]
	teamEmails: string[]
}

const BRAND = 'Sobrao Vape Store'

function itemsTable(items: OrderEmailLine[]): string {
	if (!items.length) return ''
	return `
		<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
			<thead>
				<tr style="text-align:left;color:#64748b">
					<th style="padding:6px 0">Producto</th>
					<th style="padding:6px 0;text-align:center">Cant.</th>
					<th style="padding:6px 0;text-align:right">Subtotal</th>
				</tr>
			</thead>
			<tbody>
				${items
					.map(
						(it) => `
					<tr style="border-top:1px solid #e2e8f0">
						<td style="padding:6px 0">${it.name}<br/><span style="color:#94a3b8;font-size:12px">${it.sku}</span></td>
						<td style="padding:6px 0;text-align:center">${it.quantity}</td>
						<td style="padding:6px 0;text-align:right">${formatPEN(it.lineTotal)}</td>
					</tr>`
					)
					.join('')}
			</tbody>
		</table>`
}

function addressBlock(ctx: OrderEmailContext): string {
	if (!ctx.addressLine) return ''
	return `
		<p style="margin:4px 0"><strong>Entrega:</strong> ${ctx.addressLine}</p>
		${ctx.reference ? `<p style="margin:4px 0"><strong>Referencia:</strong> ${ctx.reference}</p>` : ''}
		${ctx.phone ? `<p style="margin:4px 0"><strong>Teléfono:</strong> ${ctx.phone}</p>` : ''}`
}

/**
 * Notifica al equipo y confirma al cliente que la reserva fue registrada.
 * Best-effort: nunca lanza para no romper el flujo de compra.
 */
export async function sendOrderEmails(ctx: OrderEmailContext): Promise<void> {
	const teamRecipients = Array.from(
		new Set(ctx.teamEmails.map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))
	)

	if (teamRecipients.length) {
		await sendMail({
			to: teamRecipients,
			subject: `Nuevo pedido ${ctx.orderNumber} · ${formatPEN(ctx.total)}`,
			html: `
				<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a">
					<h2 style="margin:0 0 8px">Nuevo pedido en la tienda web</h2>
					<p style="margin:4px 0"><strong>Pedido:</strong> ${ctx.orderNumber}</p>
					<p style="margin:4px 0"><strong>Total:</strong> ${formatPEN(ctx.total)}</p>
					<p style="margin:4px 0"><strong>Cliente:</strong> ${ctx.recipientName ?? '—'}</p>
					<p style="margin:4px 0"><strong>Correo:</strong> ${ctx.contactEmail}</p>
					${addressBlock(ctx)}
					${itemsTable(ctx.items)}
					<p style="margin:12px 0 0;color:#64748b;font-size:12px">
						Pago por Yape pendiente de verificación manual en el panel administrativo.
					</p>
				</div>`,
			text: `Nuevo pedido ${ctx.orderNumber} · ${formatPEN(ctx.total)}. Cliente: ${ctx.contactEmail}.`,
		})
	}

	await sendMail({
		to: ctx.contactEmail,
		subject: `Recibimos tu pedido ${ctx.orderNumber} · ${BRAND}`,
		html: `
			<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a">
				<h2 style="margin:0 0 8px">¡Gracias por tu compra, ${ctx.recipientName ?? 'cliente'}!</h2>
				<p style="margin:8px 0">Registramos tu reserva con el número <strong>${ctx.orderNumber}</strong> por un total de
				<strong>${formatPEN(ctx.total)}</strong>.</p>
				<p style="margin:8px 0">Te estaremos comunicando el estado de tu compra en breve por este mismo correo.</p>
				${itemsTable(ctx.items)}
				${addressBlock(ctx)}
				<p style="margin:16px 0 0;color:#64748b;font-size:12px">
					Si no reconoces este pedido, responde a este correo y te ayudaremos.
				</p>
			</div>`,
		text: `Registramos tu reserva ${ctx.orderNumber} por ${formatPEN(ctx.total)}. Te comunicaremos el estado de tu compra en breve.`,
	})
}
