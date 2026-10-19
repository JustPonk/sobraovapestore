import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/utils/supabase/admin'

const BUCKET = 'payment-proofs'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
	const admin = createAdminClient()
	if (!admin) return NextResponse.json({ ok: false, message: 'No disponible.' }, { status: 500 })

	const form = await req.formData().catch(() => null)
	const file = form?.get('file') as File | null
	const paymentId = (form?.get('payment_id') as string | null) ?? null
	const orderId = (form?.get('order_id') as string | null) ?? null
	if (!file) return NextResponse.json({ ok: false, message: 'Falta el archivo del comprobante.' }, { status: 400 })
	if (!paymentId || !orderId) return NextResponse.json({ ok: false, message: 'Faltan identificadores de pago / orden.' }, { status: 400 })

	const payment = (await admin
		.from('payments')
		.select('id, order_id, status, method')
		.eq('id', paymentId)
		.eq('order_id', orderId)
		.limit(1)
		.maybeSingle()) as unknown as { data: { id: string; order_id: string; status: string; method: string } | null }
	if (!payment.data || payment.data.status !== 'pending') {
		return NextResponse.json({ ok: false, message: 'Pago no encontrado o ya no está pendiente.' }, { status: 404 })
	}

	const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^A-Za-z0-9_.-]/g, '_')}`
	const objectPath = `payments/${orderId}/${safeName}`
	const capturedFile = file

	async function uploadOnce() {
		return admin.storage.from(BUCKET).upload(objectPath, capturedFile.stream(), {
			contentType: capturedFile.type || 'image/jpeg',
			cacheControl: '31536000',
			upsert: false,
		})
	}

	let upload = await uploadOnce()
	if (upload.error) {
		if (/Bucket not found|does not exist/i.test(upload.error.message || '')) {
			await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 8 * 1024 * 1024 })
			upload = await uploadOnce()
		}
		if (upload.error) {
			return NextResponse.json(
				{ ok: false, message: upload.error.message || 'No se pudo guardar el comprobante.' },
				{ status: 502 }
			)
		}
	}

	const signedRes = await admin.storage
		.from(BUCKET)
		.createSignedUrl(objectPath, 60 * 60 * 24 * 365 * 10)
		.catch(() => ({ data: null, error: new Error('Signed URL no disponible.') }))
	const signedUrl: string | null =
		(signedRes as unknown as { data: { signedUrl: string } | null })?.data?.signedUrl ?? null
	if (!signedUrl) {
		return NextResponse.json({ ok: false, message: 'No se pudo generar el enlace del comprobante.' }, { status: 500 })
	}

	return NextResponse.json({
		ok: true,
		data: {
			payment_id: paymentId,
			order_id: orderId,
			proof_url: signedUrl,
			proof_object_path: objectPath,
		},
	})
}
