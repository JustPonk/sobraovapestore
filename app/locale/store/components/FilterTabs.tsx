'use client'

import { BatteryCharging, Cigarette, Info, Package, Sparkles, Star } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import type { StoreFilterKey } from '../data'
import { storeFilters } from '../filters'

const iconMap = {
	promociones: Star,
	desechables: Cigarette,
	equipos: Sparkles,
	dispositivos: BatteryCharging,
	merchandising: Package,
	'tips-sobrao': Info,
} as const

interface FilterTabsProps {
	activeFilter: StoreFilterKey
}

export default function FilterTabs({ activeFilter }: FilterTabsProps) {
	const pathname = usePathname()
	const router = useRouter()
	const mobileRailRef = useRef<HTMLDivElement>(null)
	const mobileRailPauseUntilRef = useRef(0)

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

				if (segmentWidth > 0 && Date.now() >= mobileRailPauseUntilRef.current) {
					rail.scrollLeft += elapsed * 0.04
					if (rail.scrollLeft >= segmentWidth * 2) rail.scrollLeft -= segmentWidth
				}

				frame = window.requestAnimationFrame(animate)
			}

			frame = window.requestAnimationFrame(animate)
		}

		frame = window.requestAnimationFrame(start)
		return () => window.cancelAnimationFrame(frame)
	}, [])

	const renderFilter = (filter: (typeof storeFilters)[number], key: string, mobile = false) => {
		const Icon = iconMap[filter.key]
		const isActive = filter.key === activeFilter
		const isCompactMobile = false

		return (
			<button
				key={key}
				type="button"
				onClick={() => handleFilterChange(filter.key)}
				className={`group relative overflow-hidden text-center ${
					mobile
						? `w-[calc((100vw-1rem)/3)] shrink-0 ${isCompactMobile ? 'rounded-full' : 'rounded-[1.25rem]'}`
						: 'min-w-[150px] shrink-0 rounded-[2rem]'
				} ${
					isCompactMobile
						? 'bg-[#1f2a9b]'
						: isActive
						? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.18)_100%)]'
						: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.12)_100%)] hover:-translate-y-0.5'
				}`}
				aria-pressed={isActive}
			>
				{!isCompactMobile ? (
					<>
						<span className={`pointer-events-none absolute inset-[1px] bg-[linear-gradient(140deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.16)_34%,rgba(255,255,255,0.08)_100%)] ${mobile ? 'rounded-[1.2rem]' : 'rounded-[1.95rem]'}`} />
						<span className="pointer-events-none absolute inset-x-3 top-2 h-8 rounded-full bg-white/30 blur-2xl" />
					</>
				) : null}
				<span
					className={`relative flex w-full flex-col overflow-hidden ${
						mobile ? (isCompactMobile ? 'h-10 rounded-full bg-[#1f2a9b]' : 'h-[88px] rounded-[1.25rem] backdrop-blur-[18px]') : 'h-[122px] rounded-[2rem] backdrop-blur-[18px]'
					} ${
						!isCompactMobile && isActive
							? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.52),inset_0_-18px_30px_rgba(255,255,255,0.1),inset_0_0_28px_rgba(16,24,56,0.12),inset_0_14px_24px_rgba(255,255,255,0.08),inset_0_-8px_18px_rgba(16,24,56,0.08)]'
							: !isCompactMobile
								? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.44),inset_0_-16px_26px_rgba(255,255,255,0.09),inset_0_0_24px_rgba(16,24,56,0.1),inset_0_12px_20px_rgba(255,255,255,0.07),inset_0_-6px_14px_rgba(16,24,56,0.07)]'
								: ''
					}`}
				>
					{!isCompactMobile ? (
						<span className={`flex flex-1 items-center justify-center ${mobile ? 'px-1 pt-2' : 'px-5 pt-4'}`}>
							<Icon className={mobile ? 'h-7 w-7 text-[#2d24a6]' : 'h-[2.7rem] w-[2.7rem] text-[#2d24a6]'} strokeWidth={2.15} />
						</span>
					) : null}
					<span className={`flex items-center justify-center overflow-hidden rounded-t-[0.2rem] font-black uppercase whitespace-nowrap ${
						isCompactMobile
							? 'min-h-0 flex-1 rounded-full bg-[#1f2a9b] px-2 py-1 text-[0.55rem] tracking-[0.04em] text-white'
							: mobile
							? 'min-h-[28px] bg-[#2b22a8] px-1 py-1 text-[0.42rem] tracking-[0.03em] text-white'
							: 'min-h-[38px] bg-[#2b22a8] px-3 py-2 text-[0.7rem] tracking-[0.14em] text-white'
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
				onPointerDown={() => {
					mobileRailPauseUntilRef.current = Date.now() + 2500
				}}
				onTouchStart={() => {
					mobileRailPauseUntilRef.current = Date.now() + 2500
				}}
				onTouchEnd={() => {
					mobileRailPauseUntilRef.current = Date.now() + 2500
				}}
				className="relative left-1/2 w-screen -translate-x-1/2 touch-pan-x overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[height] duration-300 ease-out sm:hidden"
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
