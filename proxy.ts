import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { updateSession } from '@/utils/supabase/proxy'

const GUEST_COOKIE = 'sv_guest_session'

function generateSessionId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return (crypto as Crypto).randomUUID()
	}
	const rand = Math.random().toString(16).slice(2, 14)
	return `legacy_${Date.now().toString(36)}_${rand}`
}

export async function proxy(request: NextRequest) {
	const baseResponse = (await updateSession(request)) ?? NextResponse.next()
	const response = (baseResponse instanceof Response ? baseResponse : NextResponse.next()) as ReturnType<typeof NextResponse.next>

	const existing = request.cookies.get(GUEST_COOKIE)?.value
	if (!existing || existing.length < 12) {
		const sessionId = generateSessionId()
		const setCookie = (res: Response, value: string) => {
			const secure = process.env.NODE_ENV === 'production'
			const cookie = [
				`${GUEST_COOKIE}=${encodeURIComponent(value)}`,
				`Path=/`,
				`Max-Age=${60 * 60 * 24 * 30}`,
				'SameSite=Lax',
				'HttpOnly',
				...(secure ? ['Secure'] : []),
			].join('; ')
			const existingCookies = (res.headers.getSetCookie?.() ?? []) as string[]
			res.headers.delete('Set-Cookie')
			for (const c of [...existingCookies, cookie]) {
				res.headers.append('Set-Cookie', c)
			}
		}
		setCookie(response, sessionId)
	}

	return response
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
	],
}
