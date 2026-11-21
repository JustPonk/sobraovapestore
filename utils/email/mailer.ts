const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Remitente oficial de la tienda.
 * Resend exige un remitente de un dominio verificado, por lo que `sobraovapestore@gmail.com`
 * se usa como Reply-To (las respuestas del cliente llegan a esa bandeja).
 */
export const MAIL_FROM = process.env.MAIL_FROM?.trim() || 'Sobrao Vape Store <onboarding@resend.dev>'
export const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO?.trim() || 'sobraovapestore@gmail.com'

export interface SendMailInput {
	to: string | string[]
	subject: string
	html: string
	text?: string
	replyTo?: string
}

/**
 * Envía un correo transaccional vía Resend. Si no hay API key configurada,
 * se omite silenciosamente para no romper el flujo de compra.
 */
export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
	const apiKey = process.env.RESEND_API_KEY?.trim()
	if (!apiKey) {
		console.warn('[mailer] RESEND_API_KEY no configurada: correo omitido.', input.subject)
		return { ok: false, skipped: true }
	}
	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: MAIL_FROM,
				to: Array.isArray(input.to) ? input.to : [input.to],
				subject: input.subject,
				html: input.html,
				text: input.text,
				reply_to: input.replyTo ?? MAIL_REPLY_TO,
			}),
		})
		if (!res.ok) {
			const detail = await res.text().catch(() => '')
			console.error('[mailer] Resend respondió con error:', res.status, detail)
			return { ok: false, error: `${res.status} ${detail}`.trim() }
		}
		return { ok: true }
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('[mailer] error al enviar correo:', message)
		return { ok: false, error: message }
	}
}
