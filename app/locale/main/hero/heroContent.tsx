'use client'

import Link from 'next/link'
import { BadgeCheck, Flame, ShieldCheck, Truck } from 'lucide-react'
import { motion } from 'motion/react'

const heroHighlights = [
	{ label: 'Entrega rapida', icon: Truck },
	{ label: 'Originales', icon: ShieldCheck },
	{ label: 'Sabores top', icon: Flame },
	{ label: 'Compra segura', icon: BadgeCheck },
]

export const heroContentLayout = {
	// Contenedor principal del contenido del hero
	// Ancho maximo: 1280px
	// Altura minima: 640px mobile / 740px desktop
	shell:
		'relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-between px-6 pb-10 pt-20 sm:px-10 sm:pb-12 sm:pt-24 lg:min-h-[740px] lg:px-12 lg:pb-14 lg:pt-28',
	// Bloque superior izquierdo
	// Posicion: alineado a la izquierda y desplazado hacia abajo para quedar cerca del top visual
	// Ancho maximo: 620px
	contentBlock: 'mt-12 max-w-[620px] space-y-6 sm:mt-16 lg:mt-24',
	// Contenedor del titulo y parrafo
	textBlock: 'space-y-4 text-white',
	// Titulo principal
	// Ancho maximo: 560px
	title: 'max-w-[560px] text-6xl uppercase leading-[0.84] tracking-[0.02em] text-white sm:text-7xl lg:text-[7.4rem] inline-block rounded-[10px] border border-white/10 bg-[#2B1F97] pt-6 pb-2 px-6 shadow-[0_24px_48px_rgba(43,31,151,0.3)] backdrop-blur-[3px] sm:pt-6 sm:pb-0 sm:px-6',
	// Parrafo descriptivo
	// Ancho maximo: 520px
	paragraph: 'max-w-[520px] text-base leading-7 text-white/88 sm:text-xl',
	// Fila de botones
	buttonRow: 'flex flex-wrap gap-4 pt-8',
	// Botones CTA
	primaryButton:
		'inline-flex min-w-[198px] items-center justify-center rounded-[10px] bg-[#DEDCFF] px-7 py-4 text-[1.75rem] uppercase leading-none !text-[#2B1F97] shadow-[0_14px_34px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5 [font-family:var(--font-thunder)]',
	secondaryButton:
		'inline-flex min-w-[198px] items-center justify-center rounded-[10px] bg-[#2B1F97] px-7 py-4 text-[1.75rem] uppercase leading-none !text-[#DEDCFF] shadow-[0_18px_36px_rgba(43,31,151,0.4)] transition hover:-translate-y-0.5 hover:bg-[#3a2cb9] [font-family:var(--font-thunder)]',
	// Banda inferior de beneficios
	// Distribucion: 1 columna mobile / 2 columnas tablet / 4 columnas desktop ancho
	highlightsGrid: 'grid grid-cols-1 gap-4 pt-12 text-white sm:grid-cols-2 xl:grid-cols-4',
	highlightCard:
		'flex items-center justify-center gap-3 rounded-[14px] px-4 py-4 backdrop-blur-[2px]',
	highlightIcon:
		'inline-flex h-13 w-13 items-center justify-center rounded-[12px] border border-white/16 bg-white/10 text-white',
	highlightText: 'text-[1.35rem] uppercase leading-none text-[#DEDCFF] [font-family:var(--font-thunder)]',
} as const

export default function HeroContent() {
	return (
		<div className={heroContentLayout.shell}>
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: 'easeOut' }}
				className={heroContentLayout.contentBlock}
			>
				<div className={heroContentLayout.textBlock}>
					<h1 className={heroContentLayout.title}>
                        Sin vueltas.
                    </h1>
					<p className={heroContentLayout.paragraph}>
						Descubre vapes desechables, originales, sabores increibles y entrega rapida en Lima.
					</p>
				</div>

				<div className={heroContentLayout.buttonRow}>
					<Link href="#shop" className={heroContentLayout.primaryButton}>
						Encuentra tu vape
					</Link>
					<Link href="#promotions" className={heroContentLayout.secondaryButton}>
						Comprar ahora
					</Link>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
				className={heroContentLayout.highlightsGrid}
			>
				{heroHighlights.map((item) => {
					const Icon = item.icon

					return (
						<div key={item.label} className={heroContentLayout.highlightCard}>
							<span className={heroContentLayout.highlightIcon}>
								<Icon className="h-5 w-5" />
							</span>
							<span className={heroContentLayout.highlightText}>{item.label}</span>
						</div>
					)
				})}
			</motion.div>
		</div>
	)
}
