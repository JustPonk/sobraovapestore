'use client'

import { Cigarette, HeartPulse, Sparkles, Star, Zap } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type { StoreFilterKey } from '../data'
import { storeFilters } from '../filters'

const iconMap = {
	promociones: Star,
	nuevo: Zap,
	'vapor-ti': HeartPulse,
	desechables: Cigarette,
	equipos: Sparkles,
} as const

interface FilterTabsProps {
	activeFilter: StoreFilterKey
}

export default function FilterTabs({ activeFilter }: FilterTabsProps) {
	const pathname = usePathname()
	const router = useRouter()
	const mobileRailRef = useRef<HTMLDivElement>(null)
	const lastScrollYRef = useRef(0)
	const [isMobileRailHidden, setIsMobileRailHidden] = useState(false)

	const handleFilterChange = (filter: StoreFilterKey) => {
		const params = new URLSearchParams(window.location.search)
		params.set('filter', filter)
		router.replace(`${pathname}?${params.toString()}`, { scroll: false })
	}

	useEffect(() => {
		const rail = mobileRailRef.current
		if (!rail) return

		let frame = 0
		let previousTime = performance.now()

		const start = () => {
			rail.scrollLeft = rail.scrollWidth / 3
			previousTime = performance.now()

			const animate = (time: number) => {
				const segmentWidth = rail.scrollWidth / 3
				const elapsed = time - previousTime
				previousTime = time

				if (segmentWidth > 0) {
					rail.scrollLeft += elapsed * 0.018
					if (rail.scrollLeft >= segmentWidth * 2) rail.scrollLeft -= segmentWidth
				}

				frame = window.requestAnimationFrame(animate)
			}

			frame = window.requestAnimationFrame(animate)
		}

		frame = window.requestAnimationFrame(start)
		return () => window.cancelAnimationFrame(frame)
	}, [])

	useEffect(() => {
		let frame = 0
		lastScrollYRef.current = window.scrollY

		const handleScroll = () => {
			if (frame) return

			frame = window.requestAnimationFrame(() => {
				const currentScrollY = window.scrollY
				const wasScrollingDown = currentScrollY > lastScrollYRef.current + 8
				const wasScrollingUp = currentScrollY < lastScrollYRef.current - 8

				if (wasScrollingDown && currentScrollY > 72) setIsMobileRailHidden(true)
				if (wasScrollingUp || currentScrollY < 12) setIsMobileRailHidden(false)

				lastScrollYRef.current = currentScrollY
				frame = 0
			})
		}

		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', handleScroll)
			if (frame) window.cancelAnimationFrame(frame)
		}
	}, [])

	const renderFilter = (filter: (typeof storeFilters)[number], key: string, mobile = false) => {
		const Icon = iconMap[filter.key]
		const isActive = filter.key === activeFilter

		return (
			<button
				key={key}
				type="button"
				onClick={() => handleFilterChange(filter.key)}
				className={`group relative overflow-hidden text-center transition duration-300 ${
					mobile
						? 'w-[calc((100vw-1rem)/3)] shrink-0 rounded-[1.25rem]'
						: 'min-w-[150px] shrink-0 rounded-[2rem]'
				} ${
					isActive
						? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.18)_100%)]'
						: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.12)_100%)] hover:-translate-y-0.5'
				}`}
				aria-pressed={isActive}
			>
				<span className={`pointer-events-none absolute inset-[1px] bg-[linear-gradient(140deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.16)_34%,rgba(255,255,255,0.08)_100%)] ${mobile ? 'rounded-[1.2rem]' : 'rounded-[1.95rem]'}`} />
				<span className="pointer-events-none absolute inset-x-3 top-2 h-8 rounded-full bg-white/30 blur-2xl" />
				<span
					className={`relative flex w-full flex-col overflow-hidden backdrop-blur-[18px] ${
						mobile ? 'h-[88px] rounded-[1.25rem]' : 'h-[122px] rounded-[2rem]'
					} ${
						isActive
							? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.52),inset_0_-18px_30px_rgba(255,255,255,0.1),inset_0_0_28px_rgba(16,24,56,0.12),inset_0_14px_24px_rgba(255,255,255,0.08),inset_0_-8px_18px_rgba(16,24,56,0.08)]'
							: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.44),inset_0_-16px_26px_rgba(255,255,255,0.09),inset_0_0_24px_rgba(16,24,56,0.1),inset_0_12px_20px_rgba(255,255,255,0.07),inset_0_-6px_14px_rgba(16,24,56,0.07)]'
					}`}
				>
					<span className={`flex flex-1 items-center justify-center ${mobile ? 'px-1 pt-2' : 'px-5 pt-4'}`}>
						<Icon className={mobile ? 'h-7 w-7 text-[#2d24a6]' : 'h-[2.7rem] w-[2.7rem] text-[#2d24a6]'} strokeWidth={2.15} />
					</span>
					<span className={`flex items-center justify-center overflow-hidden rounded-t-[0.2rem] bg-[#2b22a8] font-black uppercase text-white whitespace-nowrap ${
						mobile
							? 'min-h-[28px] px-1 py-1 text-[0.42rem] tracking-[0.03em]'
							: 'min-h-[38px] px-3 py-2 text-[0.7rem] tracking-[0.14em]'
					}`}>
						{filter.label}
					</span>
				</span>
			</button>
		)
	}

	const mobileFilters = [...storeFilters, ...storeFilters, ...storeFilters]

	return (
		<div className="mx-auto w-full max-w-[80rem] py-2 sm:py-5 lg:py-7">
			<div
				ref={mobileRailRef}
				className={`relative left-1/2 w-screen -translate-x-1/2 overflow-hidden transition-[max-height,opacity,transform,padding] duration-300 ease-out sm:hidden ${
					isMobileRailHidden ? 'max-h-0 -translate-y-2 py-0 opacity-0 pointer-events-none' : 'max-h-[110px] py-2 opacity-100'
				}`}
			>
				<div className="flex w-max gap-2">
					{mobileFilters.map((filter, index) => renderFilter(filter, `${filter.key}-mobile-${index}`, true))}
				</div>
			</div>

			<div className="hidden overflow-x-auto overflow-y-visible py-4 sm:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<div className="mx-auto flex min-w-max items-start justify-center gap-4 lg:gap-12 xl:gap-14">
					{storeFilters.map((filter) => renderFilter(filter, filter.key))}
				</div>
			</div>
		</div>
	)
}
