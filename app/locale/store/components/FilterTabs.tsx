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
                <div className="mx-auto w-full max-w-[80rem] py-4 sm:py-5 lg:py-7">
                        <div className="overflow-x-auto overflow-y-visible px-1 py-4 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <div className="mx-auto flex min-w-max items-start justify-center gap-3 sm:gap-4 lg:gap-12 xl:gap-14">
                                {storeFilters.map((filter) => {
                                        const Icon = iconMap[filter.key]
                                        const isActive = filter.key === activeFilter

                                        return (
                                                <button
                                                        key={filter.key}
                                                        type="button"
                                                        onClick={() => handleFilterChange(filter.key)}
                                                        className={`group relative min-w-[132px] shrink-0 overflow-hidden rounded-[2rem] text-center transition duration-300 sm:min-w-[150px] ${
                                                                isActive
                                                                        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.18)_100%)]'
                                                                        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.12)_100%)] hover:-translate-y-0.5'
                                                        }`}
                                                        aria-pressed={isActive}
                                                >
                                                        <span className="pointer-events-none absolute inset-[1px] rounded-[1.95rem] bg-[linear-gradient(140deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.16)_34%,rgba(255,255,255,0.08)_100%)]" />
                                                        <span className="pointer-events-none absolute inset-x-3 top-2 h-8 rounded-full bg-white/30 blur-2xl" />

                                                        <span
                                                                className={`relative flex h-[122px] w-full flex-col overflow-hidden rounded-[2rem] backdrop-blur-[18px] ${
                                                                        isActive
                                                                                ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.52),inset_0_-18px_30px_rgba(255,255,255,0.1),inset_0_0_28px_rgba(16,24,56,0.12),inset_0_14px_24px_rgba(255,255,255,0.08),inset_0_-8px_18px_rgba(16,24,56,0.08)]'
                                                                                : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.44),inset_0_-16px_26px_rgba(255,255,255,0.09),inset_0_0_24px_rgba(16,24,56,0.1),inset_0_12px_20px_rgba(255,255,255,0.07),inset_0_-6px_14px_rgba(16,24,56,0.07)]'
                                                                }`}
                                                        >
                                                                <span className="flex flex-1 items-center justify-center px-5 pt-4">
                                                                        <Icon className="h-10 w-10 text-[#2d24a6] sm:h-[2.7rem] sm:w-[2.7rem]" strokeWidth={2.15} />
                                                                </span>

                                                                <span className="flex min-h-[35px] items-center justify-center rounded-t-[0.2rem] bg-[#2b22a8] px-3 py-2 text-[0.64rem] font-black uppercase tracking-[0.14em] text-white sm:min-h-[38px] sm:text-[0.7rem]">
                                                                        {filter.label}
                                                                </span>
                                                        </span>
                                                </button>
                                        )
                                })}
                        </div>
                        </div>
                </div>
        )
}
