'use client'

import { Cigarette, HeartPulse, Sparkles, Star, Zap } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

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

	const handleFilterChange = (filter: StoreFilterKey) => {
		const params = new URLSearchParams(window.location.search)
		params.set('filter', filter)
		router.replace(`${pathname}?${params.toString()}`, { scroll: false })
	}

	return (
		<div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			<div className="mx-auto flex min-w-max items-start justify-center gap-3 sm:gap-4">
				{storeFilters.map((filter) => {
					const Icon = iconMap[filter.key]
					const isActive = filter.key === activeFilter

					return (
						<button
							key={filter.key}
							type="button"
							onClick={() => handleFilterChange(filter.key)}
							className={`group flex min-w-[120px] shrink-0 flex-col items-center gap-2 rounded-[1.8rem] p-2 text-center transition duration-300 sm:min-w-[132px] ${
								isActive
									? 'ring-2 ring-[#7dd8ff] ring-offset-2 ring-offset-transparent'
									: 'hover:-translate-y-0.5 hover:ring-2 hover:ring-[#7dd8ff]/40 hover:ring-offset-2 hover:ring-offset-transparent'
							}`}
							aria-pressed={isActive}
						>
							<span className="flex h-[92px] w-full items-center justify-center rounded-[1.8rem] border border-white/70 bg-white shadow-[0_14px_32px_rgba(31,42,155,0.12)] transition duration-300 group-hover:shadow-[0_18px_38px_rgba(31,42,155,0.16)]">
								<Icon className="h-8 w-8 text-[#1f2a9b] sm:h-9 sm:w-9" strokeWidth={2.2} />
							</span>
							<span className="inline-flex w-full items-center justify-center rounded-full bg-[#1f2a9b] px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.16em] text-white sm:text-[0.7rem]">
								{filter.label}
							</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}
