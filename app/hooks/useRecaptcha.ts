'use client'

import { useEffect, useState } from 'react'

declare global {
	interface Window {
		grecaptcha?: {
			ready: (cb: () => void) => void
			execute: (siteKey: string, options: { action: string }) => Promise<string>
			render?: (container: HTMLElement | string, options: Record<string, unknown>) => number
			getResponse?: (widgetId?: number) => string
			reset?: (widgetId?: number) => void
		}
	}
}

export function useRecaptcha(siteKey: string | null): boolean {
	const [ready, setReady] = useState<boolean>(
		typeof window !== 'undefined' && !!window.grecaptcha
	)

	useEffect(() => {
		if (!siteKey) {
			setReady(true)
			return
		}
		if (typeof window === 'undefined') return
		if (window.grecaptcha) {
			setReady(true)
			return
		}
		const existing = document.querySelector<HTMLScriptElement>(
			'script[data-sv-recaptcha="1"]'
		)
		if (existing) {
			const check = () => {
				if (window.grecaptcha) setReady(true)
				else setTimeout(check, 250)
			}
			check()
			return
		}
		const s = document.createElement('script')
		s.async = true
		s.defer = true
		s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
		s.dataset.svRecaptcha = '1'
		s.onload = () => setReady(true)
		document.head.appendChild(s)
	}, [siteKey])

	return ready
}
