'use client'

import Image from 'next/image'

const frameClass = 'mx-auto w-full max-w-[1920px] px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10'

const highlightImages = [
	{ src: '/brandsPartners/elfbarLOGO.jpg', alt: 'Destacado 1' },
	{ src: '/brandsPartners/geekbarLOGO.jpg', alt: 'Destacado 2' },
	{ src: '/brandsPartners/lifepodLOGO.webp', alt: 'Destacado 3' },
]

// 👉 ADJUST HERE: this is the single knob for tile size. Because the row is
// now a centered `flex` instead of a 3-column grid, tiles no longer stretch
// to fill a third of the (very wide) container — they stay capped at
// whatever width you set per breakpoint.
const highlightTileClass =
	'group relative aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[#ece7ff] to-[#d8d3ff] shadow-[0_10px_24px_rgba(31,42,155,0.1)] ' +
	'sm:w-[170px] sm:max-w-none sm:rounded-[1.4rem] ' +
	'md:w-[190px] ' +
	'lg:w-[210px] ' +
	'xl:w-[250px]'

export default function BrandsCarrusel() {
	return (
		<section className={`${frameClass} pt-10 sm:pt-14`}>
			<div className="flex flex-wrap items-center justify-center gap-4 sm:gap-25">
				{highlightImages.map((image) => (
					<div key={image.alt} className={highlightTileClass}>
						<Image
							src={image.src}
							alt={image.alt}
							fill
							sizes="(max-width: 640px) 280px, 230px"
							className="object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-110"
						/>
						<div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/50 transition duration-500 ease-out group-hover:ring-2 group-hover:ring-[#7dd8ff]/80 group-hover:shadow-[0_0_35px_rgba(125,216,255,0.4)]" />
						<div className="pointer-events-none absolute inset-0 bg-white/0 transition duration-500 ease-out group-hover:bg-white/10" />
					</div>
				))}
			</div>
		</section>
	)
}