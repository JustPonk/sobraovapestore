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
        'relative z-20 mx-auto flex min-h-[640px] max-w-[92%] flex-col justify-end px-4 pb-5 pt-16 text-center lg:min-h-[740px] lg:justify-between lg:px-8 lg:pb-6 lg:pt-20 lg:text-left',
    // Bloque superior izquierdo
    contentBlock: 'mx-auto w-full max-w-[360px] space-y-4 lg:mx-0 lg:mt-20 lg:max-w-[620px] lg:space-y-6',
    
    // Contenedor del titulo y parrafo
    textBlock: 'space-y-4 text-white',
    
    // Titulo principal
    title: 'inline-block text-5xl uppercase leading-[0.84] tracking-[0.02em] text-white [font-family:var(--font-thunder)] lg:max-w-[560px] lg:rounded-[10px] lg:border lg:border-white/10 lg:bg-[#2B1F97] lg:px-6 lg:pb-1 lg:pt-4 lg:text-[7.4rem] lg:shadow-[0_24px_48px_rgba(43,31,151,0.3)] lg:backdrop-blur-[3px] lg:[font-family:inherit]',
    
    // Parrafo descriptivo
    paragraph: 'mx-auto max-w-[300px] text-xs leading-4 text-white/88 lg:mx-0 lg:max-w-[520px] lg:text-xl lg:leading-6',
    
    // Fila de botones
    buttonRow: 'flex flex-col gap-3 pt-2 lg:flex-row lg:flex-wrap lg:gap-4 lg:pt-12',
    
    // Botones CTA
    primaryButton:
        'inline-flex w-[66%] self-center items-center justify-center rounded-[6px] bg-[#DEDCFF] px-5 py-3 text-[1.35rem] uppercase leading-none !text-[#2B1F97] shadow-[0_14px_34px_rgba(255,255,255,0.14)] transition hover:-translate-y-0.5 lg:min-w-[198px] lg:w-auto lg:rounded-[10px] lg:px-7 lg:py-4 lg:text-[1.75rem] [font-family:var(--font-thunder)]',
    secondaryButton:
        'inline-flex w-[66%] self-center items-center justify-center rounded-[6px] bg-white px-5 py-3 text-[1.35rem] uppercase leading-none !text-[#2B1F97] shadow-[0_18px_36px_rgba(43,31,151,0.4)] transition hover:-translate-y-0.5 hover:bg-white/90 lg:min-w-[198px] lg:w-auto lg:rounded-[10px] lg:bg-[#2B1F97] lg:px-7 lg:py-4 lg:text-[1.75rem] lg:!text-[#DEDCFF] lg:hover:bg-[#3a2cb9] [font-family:var(--font-thunder)]',
    
    // Banda inferior de beneficios
    highlightsGrid: 'hidden grid-cols-1 gap-3 pt-4 text-white lg:grid lg:pt-6 xl:grid-cols-4',
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
					<Link href="/tienda" className={heroContentLayout.primaryButton}>
						Encuentra tu vape
					</Link>
					<Link href="/tienda?filter=promociones" className={heroContentLayout.secondaryButton}>
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
