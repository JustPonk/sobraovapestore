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
    // Ajustado: px-4 (móvil) -> sm:px-6 (tablet) -> lg:px-8 (desktop) para consistencia total
    shell:
        'relative z-20 mx-auto flex min-h-[640px] max-w-[92%] flex-col justify-between px-4 pb-4 pt-16 sm:px-6 sm:pb-5 sm:pt-18 lg:min-h-[740px] lg:px-8 lg:pb-6 lg:pt-20',
    // Bloque superior izquierdo
    contentBlock: 'mt-6 max-w-[620px] space-y-6 sm:mt-6 lg:mt-20',
    
    // Contenedor del titulo y parrafo
    textBlock: 'space-y-4 text-white',
    
    // Titulo principal
    title: 'inline-block max-w-[560px] rounded-[10px] border border-white/10 bg-[#2B1F97] px-4 pb-1 pt-4 text-5xl uppercase leading-[0.84] tracking-[0.02em] text-white shadow-[0_24px_48px_rgba(43,31,151,0.3)] backdrop-blur-[3px] sm:px-5 sm:pt-5 sm:text-6xl lg:px-6 lg:text-[7.4rem]',
    
    // Parrafo descriptivo
    paragraph: 'max-w-[520px] text-sm leading-6 text-white/88 sm:text-lg lg:text-xl',
    
    // Fila de botones
    buttonRow: 'flex flex-wrap gap-3 pt-5 sm:gap-4 sm:pt-12',
    
    // Botones CTA
    primaryButton:
        'inline-flex min-w-[170px] items-center justify-center rounded-[10px] bg-[#DEDCFF] px-5 py-3 text-[1.35rem] uppercase leading-none !text-[#2B1F97] shadow-[0_14px_34px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5 sm:min-w-[198px] sm:px-7 sm:py-4 sm:text-[1.75rem] [font-family:var(--font-thunder)]',
    secondaryButton:
        'inline-flex min-w-[170px] items-center justify-center rounded-[10px] bg-[#2B1F97] px-5 py-3 text-[1.35rem] uppercase leading-none !text-[#DEDCFF] shadow-[0_18px_36px_rgba(43,31,151,0.4)] transition hover:-translate-y-0.5 hover:bg-[#3a2cb9] sm:min-w-[198px] sm:px-7 sm:py-4 sm:text-[1.75rem] [font-family:var(--font-thunder)]',
    
    // Banda inferior de beneficios
    highlightsGrid: 'grid grid-cols-1 gap-3 pt-4 text-white sm:grid-cols-2 sm:gap-4 lg:pt-6 xl:grid-cols-4',
    highlightCard:
        'flex items-center justify-center gap-3 rounded-[14px] px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-4',
    highlightIcon:
        'inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/16 bg-white/10 text-white sm:h-12 sm:w-12',
    highlightText: 'text-[1.05rem] uppercase leading-none text-[#DEDCFF] sm:text-[1.2rem] lg:text-[1.35rem] [font-family:var(--font-thunder)]',
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
