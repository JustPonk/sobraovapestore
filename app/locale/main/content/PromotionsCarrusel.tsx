'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PromoCarouselItem {
	id: string
	name: string
	imageSrc: string
	originalPrice: number
	currentPrice: number
	discountBadgeSrc: string
	discountLabel?: string
        href: string
}

interface PromotionsCarouselProps {
	items: PromoCarouselItem[]
	prevArrowSrc?: string
	nextArrowSrc?: string
}

const MIN_TOTAL_SLIDES = 60
const SLIDE_SPACING = 360
const VISIBLE_RADIUS = 1

const formatPrice = (value: number) => `S/. ${value.toFixed(2)}`

function buildLoopedItems(items: PromoCarouselItem[]) {
	if (items.length === 0) return []
	const repeatCount = Math.max(3, Math.ceil(MIN_TOTAL_SLIDES / items.length))
	const looped: PromoCarouselItem[] = []
	for (let cycle = 0; cycle < repeatCount; cycle++) {
		looped.push(...items)
	}
	return looped
}

function PromoCard({ item, isActive }: { item: PromoCarouselItem; isActive: boolean }) {
	return (
                <div className="relative flex min-h-[350px] w-full flex-col rounded-[1.75rem] bg-[#0A0926] px-5 pb-5 pt-4 text-white sm:px-6 sm:pb-6 sm:pt-5 lg:min-h-[460px] lg:px-7 lg:pb-7 lg:pt-5">
			<div className="absolute -right-6 -top-9 h-20 w-20 sm:-right-7 sm:-top-10 sm:h-24 sm:w-24 lg:-right-8 lg:-top-11 lg:h-28 lg:w-28">
                                <Image src={item.discountBadgeSrc} alt="Descuento" fill className="object-contain" />
				<span className="absolute inset-0 flex items-center justify-center pb-1 text-[0.7rem] font-black text-[#1f2a9b] sm:text-sm lg:text-base">
					{item.discountLabel ?? '-33%'}
				</span>
			</div>

                        <div className="flex items-center justify-center pb-2 pt-3 lg:pb-3 lg:pt-4">
                                <div
                                        className={`relative transition duration-300 ${
                                                isActive
                                                        ? 'h-48 w-36 sm:h-56 sm:w-42 lg:h-68 lg:w-52'
                                                        : 'h-38 w-28 sm:h-44 sm:w-32 lg:h-54 lg:w-40'
                                        }`}
                                >
                                        <Image
                                                src={item.imageSrc}
                                                alt={item.name}
                                                fill
                                                className={`object-contain transition duration-300 ${
                                                        isActive ? 'scale-[1.14]' : 'scale-[0.94]'
                                                }`}
                                        />
				</div>
			</div>

                        <div className="space-y-1.5 pt-1 lg:space-y-2">
				<h3 className="text-sm font-black uppercase leading-tight tracking-[0.03em] text-white sm:text-base lg:text-lg">
					{item.name}
				</h3>
				<div className="flex items-baseline gap-2">
					<span className="text-xs text-white/45 line-through sm:text-sm lg:text-base">
						{formatPrice(item.originalPrice)}
					</span>
					<span className="text-base font-black text-white sm:text-lg lg:text-xl">
						{formatPrice(item.currentPrice)}
					</span>
				</div>
			</div>

			{isActive && (
                                <Link
                                        href={item.href}
                                        className="mt-3 w-full rounded-full bg-white py-2 text-center text-xs font-black uppercase tracking-[0.08em] !text-[#0A0926] transition hover:bg-white/90 sm:text-sm lg:mt-4 lg:py-2.5 lg:text-base"
				>
                                        Ver promoción
                                </Link>
			)}
		</div>
	)
}

function MobilePromotionsCarousel({ items }: { items: PromoCarouselItem[] }) {
	const railRef = useRef<HTMLDivElement>(null)
	const pauseUntilRef = useRef(0)
	const itemsForLoop = [...items, ...items, ...items]

	useEffect(() => {
		const rail = railRef.current
		if (rail) rail.scrollLeft = rail.scrollWidth / 3

		let animationFrame = 0
		let previousTime = performance.now()

		const animate = (time: number) => {
			const rail = railRef.current
			const elapsed = time - previousTime
			previousTime = time

			if (rail && Date.now() >= pauseUntilRef.current) {
				const segmentWidth = rail.scrollWidth / 3
				rail.scrollLeft += elapsed * 0.035
				if (rail.scrollLeft >= segmentWidth * 2) {
					rail.scrollLeft -= segmentWidth
				}
			}

			animationFrame = window.requestAnimationFrame(animate)
		}

		animationFrame = window.requestAnimationFrame(animate)
		return () => window.cancelAnimationFrame(animationFrame)
	}, [])

	const pauseAfterInteraction = () => {
		pauseUntilRef.current = Date.now() + 2000
	}

	return (
		<div
			ref={railRef}
			className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-1 pb-8 pt-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			onPointerDown={pauseAfterInteraction}
			onTouchStart={pauseAfterInteraction}
			onTouchEnd={() => {
				pauseUntilRef.current = Date.now() + 2000
			}}
		>
			{itemsForLoop.map((item, index) => (
				<div
					key={`${item.id}-mobile-${index}`}
					data-promo-mobile-card
					className="w-[78vw] max-w-[290px] shrink-0 snap-center"
				>
					<PromoCard item={item} isActive />
				</div>
			))}
		</div>
	)
}

export default function PromotionsCarousel({ items, prevArrowSrc, nextArrowSrc }: PromotionsCarouselProps) {
	const loopedItems = buildLoopedItems(items)
	const [index, setIndex] = useState(() => Math.floor(loopedItems.length / 2))

	if (loopedItems.length === 0) return null

	const goTo = (direction: 'prev' | 'next') => {
		setIndex((current) => {
			const next = direction === 'next' ? current + 1 : current - 1
			return Math.min(Math.max(next, VISIBLE_RADIUS), loopedItems.length - 1 - VISIBLE_RADIUS)
		})
	}

	const windowSlots: { position: number; offset: number; item: PromoCarouselItem }[] = []
	for (let offset = -VISIBLE_RADIUS; offset <= VISIBLE_RADIUS; offset++) {
		const position = index + offset
		if (position < 0 || position >= loopedItems.length) continue
		windowSlots.push({ position, offset, item: loopedItems[position] })
	}

        return (
                <section className="mx-auto w-full max-w-none px-0 py-14 sm:max-w-[80rem] sm:px-5 md:px-6 lg:px-8 xl:px-10">
			<div className="flex flex-col items-center gap-1 pb-6 text-center sm:pb-8 lg:pb-14">
				<p className="text-lg font-bold text-slate-500">Lo más vendido en</p>
				<div className="flex items-center gap-3">
					<h2 className="text-5xl font-black uppercase tracking-[0.02em] text-[#1f2a9b] [font-family:var(--font-thunder),sans-serif] sm:text-6xl lg:text-7xl">
						✦  Promociones  ✦
					</h2>
				</div>
			</div>

                        <div className="mx-auto min-h-[450px] w-full max-w-[70rem] pt-1 lg:hidden">
                        	<MobilePromotionsCarousel items={items} />
                        </div>

                        <div className="relative mx-auto hidden h-[460px] w-full max-w-[70rem] pt-1 sm:h-[520px] lg:block lg:h-[600px]">
				<button
					type="button"
					onClick={() => goTo('prev')}
					aria-label="Promoción anterior"
					className="absolute left-[-0.5rem] top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-3 text-[#1f2a9b] shadow-[0_10px_24px_rgba(31,42,155,0.15)] transition hover:-translate-x-0.5 sm:left-[-2rem] sm:p-3.5 lg:left-[-4.5rem] lg:p-4"
				>
					{prevArrowSrc ? (
						<span className="relative block h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7">
							<Image src={prevArrowSrc} alt="Anterior" fill className="object-contain" />
						</span>
					) : (
						<ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
					)}
				</button>

				<div className="relative h-full w-full">
					{windowSlots.map(({ position, offset, item }) => {
						const isActive = offset === 0
                                                const scale = isActive ? 1.22 : 0.82
						const zIndex = isActive ? 10 : 5

						return (
							<motion.div
								key={position}
								className="absolute left-1/2 top-1/2 w-[250px] sm:w-[250px] lg:w-[250px] xl:w-[315px]"
								style={{ zIndex }}
								animate={{
									x: `calc(-50% + ${offset * SLIDE_SPACING}px)`,
									y: '-50%',
									scale,
								}}
								transition={{ type: 'spring', stiffness: 220, damping: 34, mass: 0.9 }}
							>
								<PromoCard item={item} isActive={isActive} />
							</motion.div>
						)
					})}
				</div>

				<button
					type="button"
					onClick={() => goTo('next')}
					aria-label="Siguiente promoción"
					className="absolute right-[-0.5rem] top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-3 text-[#1f2a9b] shadow-[0_10px_24px_rgba(31,42,155,0.15)] transition hover:translate-x-0.5 sm:right-[-2rem] sm:p-3.5 lg:right-[-4.5rem] lg:p-4"
				>
					{nextArrowSrc ? (
						<span className="relative block h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7">
							<Image src={nextArrowSrc} alt="Siguiente" fill className="object-contain" />
						</span>
					) : (
						<ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
					)}
				</button>
			</div>

			<div className="flex justify-center pt-3 sm:pt-5">
                                <Link
                                        href="/tienda?filter=promociones"
					className="rounded-full border border-slate-200 bg-white px-10 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#1f2a9b] shadow-[0_10px_24px_rgba(31,42,155,0.1)] transition hover:-translate-y-0.5"
				>
					Ver más
                                </Link>
			</div>
		</section>
	)
}
