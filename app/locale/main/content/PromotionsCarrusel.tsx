'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PromoCarouselItem {
	id: string
	name: string
	// Product photo — PNG you already have, this component only positions it.
	imageSrc: string
	originalPrice: number
	currentPrice: number
	// Discount sticker ("-33%" etc.) — PNG you already have, this component
	// only reserves the container/position for it.
	discountBadgeSrc: string
	// Text drawn on top of the badge PNG (the star shape itself doesn't carry
	// a number). Defaults to "-33%" if you don't pass one per item.
	discountLabel?: string
}

interface PromotionsCarouselProps {
	items: PromoCarouselItem[]
	// 👉 Opcional: pasa rutas a tus propios PNG de flecha izquierda/derecha.
	// Si no las pasas, se usan los íconos de lucide-react (ChevronLeft/Right)
	// como fallback.
	prevArrowSrc?: string
	nextArrowSrc?: string
}

// 👉 How many times the source items repeat end-to-end so the carousel
// feels endless. This is a "practical infinite" loop, not a truly boundless
// one — with 60+ slides a shopper would need to click next/prev dozens of
// times in a row to ever reach an edge, which for a promo carousel never
// realistically happens.
const MIN_TOTAL_SLIDES = 60

// 👉 ADJUST HERE: distancia (px) entre el centro de cada slide. La subí de
// 320 a 360 para que las cards, ahora más grandes, queden ligeramente más
// separadas entre sí sin encimarse.
const SLIDE_SPACING = 360

// Only left/center/right are ever mounted — no invisible buffer slide past
// the immediate neighbors.
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
		// `relative` lives here, on the OUTER card box, not on an inner padded
		// wrapper — that's what lets the badge below anchor to the card's true
		// visual corner instead of landing wherever the p-5/p-6 padding happens
		// to put it.
		<div className="relative flex w-full flex-col rounded-[1.75rem] bg-[#0A0926] p-6 text-white shadow-[0_25px_45px_rgba(10,7,40,0.35)] sm:p-7 lg:p-8">
			<div className="absolute -right-6 -top-9 h-20 w-20 sm:-right-7 sm:-top-10 sm:h-24 sm:w-24 lg:-right-8 lg:-top-11 lg:h-28 lg:w-28">
				<Image src="/icons/ICONO-OFERTA.png" alt="Descuento" fill className="object-contain" />
				<span className="absolute inset-0 flex items-center justify-center pb-1 text-[0.7rem] font-black text-[#1f2a9b] sm:text-sm lg:text-base">
					{item.discountLabel ?? '-33%'}
				</span>
			</div>

			<div className="flex items-center justify-center pb-4 pt-6 lg:pb-5 lg:pt-7">
				{/* Product photo slot — your PNG, untouched. */}
				<div className="relative h-36 w-28 sm:h-44 sm:w-32 lg:h-52 lg:w-40">
					<Image src="/vapesinbg.png" alt={item.name} fill className="object-contain" />
				</div>
			</div>

			<div className="space-y-2 pt-2 lg:space-y-3">
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

			{/* Only the active (center) card renders this block at all — no
			    opacity-0 placeholder, so inactive cards don't reserve the space
			    for a button that isn't there. */}
			{isActive && (
				<button
					type="button"
					className="mt-4 w-full rounded-full bg-white py-2.5 text-xs font-black uppercase tracking-[0.08em] text-[#1f2a9b] transition hover:bg-white/90 sm:text-sm lg:mt-5 lg:py-3 lg:text-base"
				>
					Añadir al carrito
				</button>
			)}
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
		<section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
			{/* 👉 ADJUST HERE: pb-10/sm:pb-14 controla qué tan cerca está el título
			    "Promociones" de las cards de abajo. La bajé de pb-10/sm:pb-14 a
			    pb-6/sm:pb-8 para acercarlo. Súbelo si quieres más aire, bájalo (o
			    pon pb-4) si lo quieres aún más pegado. */}
			<div className="flex flex-col items-center gap-1 pb-6 text-center sm:pb-8">
				<p className="text-lg font-bold text-slate-500">Lo más vendido en</p>
				<div className="flex items-center gap-3">
					<h2 className="text-6xl font-black uppercase tracking-[0.02em] text-[#1f2a9b] [font-family:var(--font-thunder),sans-serif] sm:text-7xl">
						✦  Promociones  ✦
					</h2>
				</div>
			</div>

			{/* 👉 ADJUST HERE: el contenedor ahora crece por breakpoint (alto y
			    ancho máximo) para dar espacio a las cards más grandes. */}
			<div className="relative mx-auto h-[460px] max-w-[960px] pt-1 sm:h-[520px] lg:h-[600px] lg:max-w-[1100px] xl:max-w-[1200px]">
				<button
					type="button"
					onClick={() => goTo('prev')}
					aria-label="Promoción anterior"
					// 👉 ADJUST HERE: las flechas ahora se posicionan con left/right
					// negativos (fuera del propio contenedor de cards) en vez de
					// left-0/right-0, así quedan más lejos de las cards a medida que
					// crece la pantalla. Ajusta estos valores para acercar/alejar.
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
						// 👉 ADJUST HERE: how pronounced the coverflow effect is.
						const scale = isActive ? 1.18 : 0.92
						const zIndex = isActive ? 10 : 5

						return (
							<motion.div
								// Keying by absolute position (not item id) keeps this exact
								// DOM node identity stable as it slides from center to side
								// and back — that persistence is what makes the slide
								// animation read as "this card moved" instead of "this card
								// was swapped for another one".
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

			<div className="flex justify-center pt-8 sm:pt-10">
				<button
					type="button"
					className="rounded-full border border-slate-200 bg-white px-10 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#1f2a9b] shadow-[0_10px_24px_rgba(31,42,155,0.1)] transition hover:-translate-y-0.5"
				>
					Ver más
				</button>
			</div>
		</section>
	)
}