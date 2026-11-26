'use client'

import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

import type { StoreFilterKey } from '../data'
import { storeFilters } from '../filters'

interface StoreCategorySubnavProps {
	activeFilter: StoreFilterKey
}

const subnavIconMap: Partial<Record<StoreFilterKey, string>> = {
	promociones: '/icons/sub-nav-icons/icon-promociones.png',
	desechables: '/icons/sub-nav-icons/icon-desechables.png',
	equipos: '/icons/sub-nav-icons/icon-equipos-pods.png',
	dispositivos: '/icons/sub-nav-icons/icon-dispositivos.png',
	merchandising: '/icons/sub-nav-icons/icon-merchandising.png',
	'tips-sobrao': '/icons/sub-nav-icons/icon-tips-sobrao.png',
}

const subnavSalmonIconMap: Partial<Record<StoreFilterKey, string>> = {
	promociones: '/icons/sub-nav-icons/icon-promociones-salmon%20(1).png',
	desechables: '/icons/sub-nav-icons/icon-desechables-salmon.png',
	equipos: '/icons/sub-nav-icons/icon-pods-salmon.png',
	dispositivos: '/icons/sub-nav-icons/icon-dispositivos-salmon.png',
	merchandising: '/icons/sub-nav-icons/icon-merchandising-salmon.png',
	'tips-sobrao': '/icons/sub-nav-icons/icon-tips-salmon.png',
}

const subnavDescriptions: Record<StoreFilterKey, string> = {
	promociones: 'Ofertas especiales del momento',
	desechables: 'Listos para disfrutar',
	equipos: 'Pods compactos para tu día',
	dispositivos: 'Vapes recargables',
	merchandising: 'Accesorios y estilo Sobrao',
	'tips-sobrao': 'Guías para vapear mejor',
}

export default function StoreCategorySubnav({ activeFilter }: StoreCategorySubnavProps) {
	const pathname = usePathname()
	const router = useRouter()
	const mobileRailRef = useRef<HTMLDivElement>(null)
	const mobileRailPauseUntilRef = useRef(0)

	useEffect(() => {
		if (!window.matchMedia('(max-width: 767px)').matches) return

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
					rail.scrollLeft += elapsed * 0.03
					if (rail.scrollLeft >= segmentWidth * 2) rail.scrollLeft -= segmentWidth
				}

				frame = window.requestAnimationFrame(animate)
			}

			frame = window.requestAnimationFrame(animate)
		}

		frame = window.requestAnimationFrame(start)
		return () => window.cancelAnimationFrame(frame)
	}, [])

	const handleFilterChange = (filter: StoreFilterKey) => {
		const params = new URLSearchParams(window.location.search)
		params.set('filter', filter)
		router.replace(`${pathname}?${params.toString()}`, { scroll: false })
	}

	const renderButton = (filter: (typeof storeFilters)[number], key: string, mobile = false) => {
		const isActive = filter.key === activeFilter
		const isPods = filter.key === 'equipos'
		const iconSrc = subnavIconMap[filter.key]
		const salmonIconSrc = subnavSalmonIconMap[filter.key]
		const description = subnavDescriptions[filter.key]

		return (
			<button
				key={key}
				type="button"
				onClick={() => handleFilterChange(filter.key)}
				className={`subnav-category-button group inline-flex shrink-0 rounded-md bg-transparent font-bold uppercase text-[#DEDCFF] [font-family:var(--font-satoshi)] ${
					mobile
						? 'h-9 w-[calc((100vw-1rem)/2.3)] items-center justify-center gap-2 px-3 text-[0.7rem] tracking-[0.025em] transition-colors hover:bg-[#DEDCFF]/10'
						: 'relative h-10 w-[165px] items-start justify-center overflow-hidden px-3 pt-1.5 text-[0.72rem] tracking-[0.06em] transition-[width,height,background-color] duration-300 hover:h-[144px] hover:w-[215px] hover:bg-[#DEDCFF]/10 lg:w-[200px] lg:hover:w-[255px]'
				}`}
				aria-pressed={isActive}
			>
				<span className={`relative z-10 inline-flex items-center justify-center gap-1 ${mobile ? '' : `transition-transform duration-300 group-hover:translate-y-1.5 ${isPods ? 'group-hover:-translate-x-6' : ''}`}`}>
					{iconSrc ? (
					<span className={`relative shrink-0 transition-[width,height,transform] duration-300 ${isPods ? 'overflow-hidden' : ''} ${mobile ? 'h-6 w-6' : 'h-8 w-8 group-hover:h-20 group-hover:w-20 group-hover:-translate-x-4 group-hover:translate-y-2'}`}>
						<Image
							src={iconSrc}
							alt=""
							fill
							sizes="(max-width: 767px) 24px, 80px"
							className={`object-contain transition-opacity duration-150 ${isPods ? 'scale-[1.25] -translate-y-[10%] group-hover:scale-[1.4] group-hover:-translate-y-[12%]' : ''} ${salmonIconSrc ? 'group-hover:opacity-0' : ''}`}
						/>
						{salmonIconSrc ? (
							<Image
								src={salmonIconSrc}
								alt=""
								fill
								sizes="80px"
								className={`object-contain opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${isPods ? 'scale-[1.25] -translate-y-[10%] group-hover:scale-[1.4] group-hover:-translate-y-[12%]' : ''}`}
							/>
						) : null}
					</span>
					) : null}
					<span className={`relative ${mobile ? '' : 'flex flex-col items-start transition-transform duration-300 group-hover:-translate-x-3'}`}>
						<span className="subnav-category-label origin-left font-bold transition-colors duration-200 group-hover:text-[#FF4F79] [font-family:var(--font-satoshi)]">
							{filter.label}
						</span>
						{mobile ? null : (
							<span className="pointer-events-none absolute left-0 top-full mt-0.5 w-[9.5rem] text-left text-[0.64rem] font-medium normal-case leading-tight tracking-normal opacity-0 transition-[opacity,transform] duration-200 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100">
								{description}
							</span>
						)}
					</span>
				</span>
			</button>
		)
	}

	const mobileFilters = [...storeFilters, ...storeFilters, ...storeFilters]

	return (
		<nav
			aria-label="Categorías de la tienda"
			className="fixed inset-x-0 top-14 z-[55] border-b border-white/15 bg-[#0E0C33] shadow-[0_8px_18px_rgba(14,12,51,0.24)] sm:top-16"
		>
			<div className="mx-auto w-full max-w-[1920px] px-3 py-1 md:px-6 md:py-1.5 lg:px-8 xl:px-10">
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
					className="relative left-1/2 w-screen -translate-x-1/2 touch-pan-x overflow-x-auto overflow-y-hidden [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
				>
					<div className="flex w-max gap-2">
						{mobileFilters.map((filter, index) => renderButton(filter, `${filter.key}-mobile-${index}`, true))}
					</div>
				</div>

				<div className="hidden min-w-max items-start justify-center gap-3 md:flex">
					{storeFilters.map((filter) => renderButton(filter, filter.key))}
				</div>
			</div>
		</nav>
	)
}
