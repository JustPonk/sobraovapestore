'use client'

import Image from 'next/image'
import { motion } from 'motion/react'

export default function HeroBG() {
	return (
		<>
			<Image
				src="/bgheromobile.png"
				alt=""
				fill
				priority
				sizes="100vw"
				className="object-cover lg:hidden"
			/>
			<Image
				src="/bghero2.png"
				alt="Sobrao hero background"
				fill
				priority
				sizes="100vw"
				className="hidden object-cover lg:block"
			/>
			<motion.div
				animate={{ y: [0, -10, 0] }}
				transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
				className="pointer-events-none absolute left-1/2 top-[37%] z-10 h-[310px] w-[222px] -translate-x-1/2 -translate-y-1/2 select-none lg:hidden"
				aria-hidden="true"
			>
				<Image
					src="/itemHeroMobile.png"
					alt=""
					fill
					priority
					sizes="300px"
					className="object-contain"
				/>
			</motion.div>
			<motion.div
				animate={{ y: [0, -10, 0] }}
				transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
				className="pointer-events-none absolute inset-0 z-10 hidden select-none lg:block"
				aria-hidden="true"
			>
				<Image
					src="/itemhero.png"
					alt="Floating vape product"
					fill
					priority
					sizes="100vw"
					className="object-cover"
				/>
			</motion.div>
		</> 
	)
}
