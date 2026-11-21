'use client'

import { useEffect, useRef } from 'react'
import { Star, UserRound } from 'lucide-react'

const testimonials = [
	{
		name: 'Martin V.',
		product: 'Desechable Mango Ice',
		rating: 5,
                quote: 'Envío rapidísimo, sabor perfecto y presentación impecable. Ya es mi tienda de cabecera.',
	},
	{
		name: 'Karla Diaz',
		product: 'Starter Kit Sobrao',
		rating: 5,
                quote: 'El starter kit vino completo, bien presentado y la atención fue clara desde el primer mensaje.',
	},
	{
		name: 'Jose Rami',
		product: 'Pod Blueberry',
		rating: 4,
                quote: 'Los descuentos flash sí valen la pena. Alcancé un pod nuevo a muy buen precio y llegó rápido.',
	},
]

function TestimonialCard({ item }: { item: (typeof testimonials)[number] }) {
	return (
		<article className="mx-auto w-full max-w-[370px] overflow-hidden rounded-[1.9rem] bg-white shadow-[inset_0_0_24px_rgba(31,42,155,0.18)]">
			<div className="space-y-1.5 bg-[#2b1f8f] px-5 pb-3 pt-3">
				<div className="flex items-center justify-center gap-1">
					{Array.from({ length: 5 }).map((_, index) => (
						<Star
							key={`${item.name}-${index}`}
							className="h-4 w-4 text-white"
							fill={index < item.rating ? 'currentColor' : 'transparent'}
							strokeWidth={2}
						/>
					))}
				</div>
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2b1f8f]">
						<UserRound className="h-6 w-6" strokeWidth={2.4} />
					</div>
					<div className="min-w-0 leading-tight">
						<h3 className="truncate text-lg font-black uppercase leading-none tracking-[0.01em] text-white">
							{item.name}
						</h3>
						<p className="mt-0.5 truncate text-sm leading-none text-white/75">{item.product}</p>
					</div>
				</div>
			</div>
			<div className="px-5 py-4">
				<p className="text-sm leading-6 text-slate-700">
					<span className="font-semibold text-slate-900">-Reseña : </span>
					{item.quote}
				</p>
			</div>
		</article>
	)
}

function MobileTestimonialsCarousel() {
	const railRef = useRef<HTMLDivElement>(null)
	const pauseUntilRef = useRef(0)
	const itemsForLoop = [...testimonials, ...testimonials, ...testimonials]

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
			className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			onPointerDown={pauseAfterInteraction}
			onTouchStart={pauseAfterInteraction}
			onTouchEnd={pauseAfterInteraction}
		>
			{itemsForLoop.map((item, index) => (
				<div
					key={`${item.name}-mobile-${index}`}
					data-testimonial-mobile-card
					className="w-[82vw] max-w-[370px] shrink-0 snap-center"
				>
					<TestimonialCard item={item} />
				</div>
			))}
		</div>
	)
}

export default function ClientSection() {
	return (
		<section id="clients" className="mx-auto w-full max-w-none space-y-8 px-0 py-10 sm:max-w-[1920px] sm:px-5 sm:py-14 sm:space-y-10 md:px-6 lg:px-8 xl:px-10">
			<div className="flex flex-col items-center gap-2 text-center">
				<p className="text-[0.8rem] font-black uppercase tracking-[0.4em] text-[#1f2a9b]">
					Lo que dicen
				</p>
				<h2 className="text-5xl font-black uppercase leading-[0.9] tracking-[0.02em] text-[#1f2a9b] sm:text-6xl lg:text-8xl">
					Nuestros clientes
				</h2>
			</div>

			<div className="mx-auto w-full max-w-[80rem] lg:hidden">
				<MobileTestimonialsCarousel />
			</div>

                        <div className="mx-auto hidden w-full max-w-[80rem] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid lg:grid-cols-3">
				{testimonials.map((item) => (
					<TestimonialCard key={item.name} item={item} />
				))}
			</div>
		</section>
	)
}
