import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Facebook, Linkedin, MapPin, Phone, Mail } from 'lucide-react'

const TikTokIcon = ({ className }: { className?: string }) => (
	<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
		<path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.31 1.38V7.3s-1.88.09-3.25-1.48Z" />
	</svg>
)

const footerColumns = [
	{
		title: 'Explora',
		links: [
			{ label: 'Inicio', href: '/' },
			{ label: 'Tienda', href: '/tienda' },
			{ label: 'Sabores', href: '/tienda?filter=sabores' },
			{ label: 'Promociones', href: '/tienda?filter=promociones' },
		],
		social: { platform: 'instagram', label: '@sobraovapestore', href: '#', icon: Instagram },
	},
	{
		title: 'Ayuda',
		links: [
			{ label: 'FAQ', href: '#faq' },
			{ label: 'Envíos', href: '#contact' },
			{ label: 'Pagos', href: '#contact' },
			{ label: 'Seguimiento', href: '#contact' },
		],
		social: { platform: 'tiktok', label: '@Sobrao Vape Store', href: '#', icon: TikTokIcon },
	},
	{
		title: 'Empresa',
		links: [
			{ label: 'Nosotros', href: '#nosotros' },
			{ label: 'Privacidad', href: '#' },
			{ label: 'Terminos', href: '#' },
			{ label: 'Cambios', href: '#' },
		],
		social: { platform: 'facebook', label: 'Sobrao Vape Store', href: '#', icon: Facebook },
	},
]

const contactoSocial = { platform: 'linkedin', label: 'Sobrao Vape Store', href: '#', icon: Linkedin }

export default function Footer() {
	return (
		<footer id="contact" className="bg-[#0a0a1a] text-white">
			<div className="mx-auto w-full max-w-[1920px] px-6 py-12 sm:px-10 lg:px-16 xl:px-24 xl:py-16">
				{/* Logo + tagline */}
				<div className="flex flex-col items-start gap-8 pb-10 sm:flex-row sm:items-center sm:gap-14 lg:gap-20">
					<Image
						src="/logosobrao.png"
						alt="Sobrao Vape Store"
						width={340}
						height={140}
						className="h-auto w-56 shrink-0 sm:w-64 lg:w-80"
					/>
					<p className="text-xl font-black uppercase leading-tight tracking-wide text-white sm:text-1xl lg:text-xl">
						Vapes desechables originales, compra fácil y entrega rápida. Todo lo que necesitas, sin
						complicaciones.
					</p>
				</div>

				<div className="h-px w-full bg-white/25" />

				{/* Link columns + contacto, con íconos alineados a la altura de cada columna */}
				<div className="grid grid-cols-2 gap-x-8 gap-y-10 py-12 lg:grid-cols-4 lg:gap-x-10">
					{footerColumns.map((column) => (
						<div key={column.title} className="flex flex-col gap-8">
							<div>
								<h3 className="mb-4 text-sm font-black uppercase tracking-[0.15em] text-[#b6a9ff] lg:text-base">
									{column.title}
								</h3>
								<ul className="space-y-3 text-sm text-white/70 lg:text-base">
									{column.links.map((item) => (
										<li key={item.label}>
											<Link href={item.href} className="transition hover:text-white">
												{item.label}
											</Link>
										</li>
									))}
								</ul>
							</div>

							<Link href={column.social.href} className="group flex items-center gap-3">
								<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6b5bd6] transition group-hover:bg-[#8676ea] lg:h-14 lg:w-14">
									<column.social.icon className="h-6 w-6 text-white lg:h-7 lg:w-7" />
								</span>
								<span className="text-sm italic text-white/85 lg:text-base">{column.social.label}</span>
							</Link>
						</div>
					))}

					<div className="flex flex-col gap-8">
						<div>
							<h3 className="mb-4 text-sm font-black uppercase tracking-[0.15em] text-[#b6a9ff] lg:text-base">
								Contacto
							</h3>
							<ul className="space-y-3 text-sm text-white/70 lg:text-base">
								<li className="flex items-start gap-2">
									<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b6a9ff]" />
									<span>San Miguel, Lima, Perú</span>
								</li>
								<li className="flex items-center gap-2">
									<Phone className="h-4 w-4 shrink-0 text-[#b6a9ff]" />
									<span>+51 999999999</span>
								</li>
								<li className="flex items-center gap-2">
									<Mail className="h-4 w-4 shrink-0 text-[#b6a9ff]" />
									<span className="break-all">sobraovapestore@gmail.com</span>
								</li>
								<li className="flex items-center gap-2">
									<br />
									<span className="break-all"></span>
								</li>
							</ul>
						</div>

						<Link href={contactoSocial.href} className="group flex items-center gap-3">
							<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6b5bd6] transition group-hover:bg-[#8676ea] lg:h-14 lg:w-14">
								<contactoSocial.icon className="h-6 w-6 text-white lg:h-7 lg:w-7" />
							</span>
							<span className="text-sm italic text-white/85 lg:text-base">{contactoSocial.label}</span>
						</Link>
					</div>
				</div>

				<div className="h-px w-full bg-white/25" />

				{/* Bottom bar */}
				<div className="space-y-1 py-8 text-center">
					<p className="text-sm font-black uppercase tracking-[0.1em] text-[#b6a9ff] lg:text-base">
						Venta exclusiva para +18 años
					</p>
					<p className="text-sm text-white/60 lg:text-base">© 2026 Sobrao Vape Store S.A.C.</p>
				</div>
			</div>
		</footer>
	)
}