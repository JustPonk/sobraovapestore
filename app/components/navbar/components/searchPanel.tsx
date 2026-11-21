'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, Loader2, Search, X } from 'lucide-react'

export interface SearchItem {
	id: string
	name: string
	slug: string
	imageSrc: string
	price: number
}

const RECENT_STORAGE_KEY = 'sobrao:recent-products'
const RECENT_LIMIT = 3
// Sin término: 1 sugerencia por defecto. Con búsqueda: hasta 4 coincidencias.
const DEFAULT_SUGGESTION_LIMIT = 1
const SEARCH_SUGGESTION_LIMIT = 4

function isSearchItem(value: unknown): value is SearchItem {
	if (!value || typeof value !== 'object') return false
	const item = value as Partial<SearchItem>
	return (
		typeof item.id === 'string' &&
		typeof item.name === 'string' &&
		typeof item.slug === 'string' &&
		typeof item.imageSrc === 'string'
	)
}

export function readRecentProducts(): SearchItem[] {
	if (typeof window === 'undefined') return []
	try {
		const raw = window.localStorage.getItem(RECENT_STORAGE_KEY)
		if (!raw) return []
		const parsed: unknown = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed.filter(isSearchItem).slice(0, RECENT_LIMIT)
	} catch {
		return []
	}
}

function writeRecentProducts(items: SearchItem[]) {
	if (typeof window === 'undefined') return
	try {
		window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items.slice(0, RECENT_LIMIT)))
	} catch {
		// almacenamiento lleno o bloqueado — se ignora
	}
}

export function recordRecentProduct(item: SearchItem) {
	const remaining = readRecentProducts().filter((entry) => entry.id !== item.id)
	writeRecentProducts([{ ...item }, ...remaining].slice(0, RECENT_LIMIT))
}

const panelPosition: Record<'desktop' | 'mobile', string> = {
	desktop: 'absolute left-1/2 top-[calc(100%+0.6rem)] z-[80] w-[22rem] -translate-x-1/2 sm:w-[24rem]',
	mobile: 'absolute inset-x-0 top-[calc(100%+0.6rem)] z-[80] w-auto',
}

function SectionLabel({ index, label, icon }: { index: number; label: string; icon: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2 px-2 pb-1 pt-2">
			<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2B1F97] text-[0.6rem] font-black text-white">
				{index}
			</span>
			<span className="flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#2B1F97]">
				{icon}
				{label}
			</span>
		</div>
	)
}

function ResultRow({
	item,
	onSelect,
	onRemove,
}: {
	item: SearchItem
	onSelect: () => void
	onRemove?: () => void
}) {
	return (
		<div className="flex items-center gap-2 rounded-2xl transition hover:bg-[#2B1F97]/5">
			<button
				type="button"
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
			>
				<span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#dcd5ff]">
					<Image
						src={item.imageSrc}
						alt={item.name}
						fill
						sizes="44px"
						className="object-contain p-1"
					/>
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-[0.78rem] font-bold uppercase tracking-[0.04em] text-[#2B1F97]">
						{item.name}
					</span>
					<span className="block text-[0.7rem] font-semibold text-[#2B1F97]/55">
						S/ {item.price.toFixed(2)}
					</span>
				</span>
			</button>
			{onRemove ? (
				<button
					type="button"
					onClick={onRemove}
					aria-label={`Quitar ${item.name} de recientes`}
					className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#2B1F97]/40 transition hover:bg-rose-50 hover:text-rose-600"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			) : null}
		</div>
	)
}

interface SearchPanelProps {
	mode: 'desktop' | 'mobile'
	query: string
	submitRef: React.MutableRefObject<(() => void) | null>
	onClose?: () => void
}

export default function SearchPanel({ mode, query, submitRef, onClose }: SearchPanelProps) {
	const router = useRouter()
	const [results, setResults] = useState<SearchItem[]>([])
	const [loading, setLoading] = useState(false)
	const [recent, setRecent] = useState<SearchItem[]>([])

	const term = query.trim()
	const isSearching = term.length > 0

	useEffect(() => {
		setRecent(readRecentProducts())
	}, [])

	useEffect(() => {
		let cancelled = false
		const controller = new AbortController()
		const delay = term ? 220 : 0
		const limit = term ? SEARCH_SUGGESTION_LIMIT : DEFAULT_SUGGESTION_LIMIT

		const timer = window.setTimeout(async () => {
			setLoading(true)
			try {
				const response = await fetch(
					`/api/search?q=${encodeURIComponent(term)}&limit=${limit}`,
					{ signal: controller.signal }
				)
				const payload = (await response.json().catch(() => null)) as
					| { items?: unknown }
					| null
				if (cancelled) return
				const items = Array.isArray(payload?.items) ? payload.items.filter(isSearchItem) : []
				setResults(items)
			} catch {
				if (!cancelled) setResults([])
			} finally {
				if (!cancelled) setLoading(false)
			}
		}, delay)

		return () => {
			cancelled = true
			controller.abort()
			window.clearTimeout(timer)
		}
	}, [term])

	const goToItem = (item: SearchItem) => {
		recordRecentProduct(item)
		setRecent(readRecentProducts())
		onClose?.()
		router.push(`/producto/${item.slug}`)
	}

	const goToAll = () => {
		onClose?.()
		router.push(term ? `/tienda?q=${encodeURIComponent(term)}` : '/tienda')
	}

	const removeRecent = (id: string) => {
		const next = readRecentProducts().filter((entry) => entry.id !== id)
		writeRecentProducts(next)
		setRecent(next)
	}

	// Enter: abre el primer resultado; si no hay coincidencias va a la tienda
	// con la búsqueda aplicada.
	useEffect(() => {
		submitRef.current = () => {
			const first = results[0]
			if (first) goToItem(first)
			else if (term) goToAll()
		}
		return () => {
			submitRef.current = null
		}
	})

	const suggestionList = loading ? (
		<div className="flex items-center justify-center gap-2 px-2 py-6 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#2B1F97]/50">
			<Loader2 className="h-4 w-4 animate-spin" />
			Buscando
		</div>
	) : results.length ? (
		<div className="flex flex-col">
			{results.map((item) => (
				<ResultRow key={item.id} item={item} onSelect={() => goToItem(item)} />
			))}
		</div>
	) : (
		<p className="px-3 py-5 text-center text-[0.72rem] font-semibold text-[#2B1F97]/50">
			{isSearching ? 'Sin coincidencias para tu búsqueda.' : 'Todavía no hay productos disponibles.'}
		</p>
	)

	return (
		<div
			onMouseDown={(event) => event.stopPropagation()}
			className={`${panelPosition[mode]} max-h-[70vh] overflow-y-auto rounded-[1.4rem] border border-[#2B1F97]/10 bg-white p-2 text-left shadow-[0_24px_50px_rgba(11,7,52,0.24)]`}
		>
			{isSearching ? (
				<>
					<SectionLabel
						index={1}
						label="Sugerencias"
						icon={<Search className="h-3 w-3" strokeWidth={3} />}
					/>
					{suggestionList}

					<button
						type="button"
						onClick={goToAll}
						className="mt-1 flex w-full items-center justify-between gap-2 rounded-2xl bg-[#2B1F97] px-3 py-2.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#251a83]"
					>
						Ver todos los resultados
						<ArrowRight className="h-3.5 w-3.5" />
					</button>
				</>
			) : (
				<>
					{recent.length ? (
						<>
							<SectionLabel
								index={1}
								label="Recién buscados"
								icon={<Clock className="h-3 w-3" strokeWidth={3} />}
							/>
							<div className="flex flex-col">
								{recent.map((item) => (
									<ResultRow
										key={item.id}
										item={item}
										onSelect={() => goToItem(item)}
										onRemove={() => removeRecent(item.id)}
									/>
								))}
							</div>
							<div className="mx-2 my-1 h-px bg-[#2B1F97]/10" />
						</>
					) : null}

					<SectionLabel
						index={recent.length ? 2 : 1}
						label="Sugerencias"
						icon={<Search className="h-3 w-3" strokeWidth={3} />}
					/>
					{suggestionList}
				</>
			)}
		</div>
	)
}
