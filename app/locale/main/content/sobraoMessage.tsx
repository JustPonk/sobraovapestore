'use client'

import Image from 'next/image'

// Same max-width as the rest of Content (BrandsCarrusel / PromotionsCarrusel
// use this exact value) — but deliberately WITHOUT the `px-*` side padding
// those use. Those sections are cards sitting inside the content area; this
// one is a full-bleed banner, so it should touch the edges of that same
// content width instead of sitting in a white gutter.
const frameClass = 'mx-auto w-full max-w-[1920px]'

export default function SobraoMessage() {
	return (
		<section className={`${frameClass} py-10 sm:py-14`}>
			{/* 👉 ADJUST HERE: aspect ratio per breakpoint. Taller on mobile so the
			    title has room under the smoke; wider/shorter on desktop to match
			    the banner shape in the mockup. No rounded corners / shadow here on
			    purpose — a full-bleed banner reads as part of the page, not as a
			    card floating inside it. */}
			<div className="relative w-full overflow-hidden aspect-[4/5] sm:aspect-[16/10] md:aspect-[16/7] lg:aspect-[21/8]">
				<Image
					src="/humoSobrao.png"
					alt="Sobrao Vape Store"
					fill
					priority
					sizes="100vw"
					className="object-cover"
				/>

				{/* Title overlaid on the image, anchored to the bottom. */}
				<div className="absolute inset-x-0 bottom-0 pb-6 pt-16 sm:pb-8 sm:pt-24 md:pb-10 lg:pb-12">
					<h1 className="mx-auto max-w-[92%] text-center text-4xl font-black uppercase leading-[0.95] tracking-[0.01em] text-[#1f2a9b] [font-family:var(--font-thunder),'Arial_Narrow',var(--font-satoshi),sans-serif] sm:max-w-[80%] sm:text-8xl md:max-w-[640px] md:text-8xl lg:max-w-[720px] lg:text-8xl xl:text-8xl">
						¡El humo que necesitas a tu lado!
					</h1>
				</div>
			</div>
		</section>
	)
}