import { Star, UserRound } from 'lucide-react'

const frameClass = 'mx-auto w-full max-w-[1920px] px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10'

const testimonials = [
	{
		name: 'Martin V.',
		product: 'Desechable Mango Ice',
		rating: 5,
		quote: 'Envío rapidísimo y el sabor de mango que pedí llegó perfecto. Ya es mi tienda de cabecera. lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla auctor, nunc a convallis auctor, nunc nunc auctor, nunc a convallis auctor, nunc nunc a.',
	},
	{
		name: 'Karla Diaz',
		product: 'Starter Kit Sobrao',
		rating: 5,
		quote: 'El starter kit vino con todo lo necesario y la atención fue clara desde el primer mensaje. lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla auctor, nunc a convallis auctor, nunc nunc auctor, nunc a convallis auctor, nunc nunc a.',
	},
	{
		name: 'Jose Rami',
		product: 'Pod Blueberry',
		rating: 4,
		quote: 'Los descuentos flash valen la pena, alcancé un pod nuevo a mitad de precio. lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla auctor, nunc a convallis auctor, nunc nunc auctor, nunc a convallis auctor, nunc nunc a.',
	},
]

export default function ClientSection() {
	return (
		<section id="clients" className={`${frameClass} space-y-8 py-10 sm:space-y-10 sm:py-14`}>
			<div className="flex flex-col items-center gap-2 text-center">
				<p className="text-[0.8rem] font-black uppercase tracking-[0.4em] text-[#1f2a9b]">
					Lo que dicen
				</p>
				<h2 className="text-5xl font-black uppercase leading-[0.9] tracking-[0.02em] text-[#1f2a9b] sm:text-6xl lg:text-8xl">
					Nuestros clientes
				</h2>
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{testimonials.map((item) => (
					<article
						key={item.name}
						className="mx-auto w-full max-w-[370px] overflow-hidden rounded-[1.9rem] bg-white shadow-[0_20px_40px_-12px_rgba(31,42,155,0.28),0_8px_18px_rgba(125,216,255,0.25)]"
					>
						{/* Header band: stars centered on top, avatar + name/product
						    below — matches the reference card exactly. */}
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

						{/* Review body: fixed height + scroll for long reviews, with a
						    thin rounded scrollbar thumb styled to match the brand blue
						    instead of the browser default. Firefox gets the same look
						    via scrollbar-width/scrollbar-color; older browsers just fall
						    back to their native scrollbar, which is a harmless no-op. */}
						<div
							className="max-h-[132px] overflow-y-auto px-5 py-4 pr-4 [scrollbar-color:#2b1f8f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#2b1f8f] [&::-webkit-scrollbar-track]:bg-transparent"
						>
							<p className="text-sm leading-6 text-slate-700">
								<span className="font-semibold text-slate-900">-Reseña : </span>
								{item.quote}
							</p>
						</div>
					</article>
				))}
			</div>
		</section>
	)
}