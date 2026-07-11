'use client'

import Image from 'next/image'
import { motion } from 'motion/react'

export default function HeroBG() {
	return (
		<>
			<Image
				src="/bghero2.png"
				alt="Sobrao hero background"
				fill
				priority
				sizes="100vw"
				className="object-cover"
			/>
			<motion.div
				animate={{ y: [0, -10, 0] }}
				transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
				className="pointer-events-none absolute inset-0 z-10 select-none"
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
