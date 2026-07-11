import Link from 'next/link'

const footerLinks = {
	tienda: [
		{ label: 'Promociones', href: '#promotions' },
		{ label: 'Productos', href: '#shop' },
		{ label: 'Novedades', href: '#shop' },
	],
	soporte: [
		{ label: 'Contacto', href: '#contact' },
		{ label: 'Envíos', href: '#contact' },
		{ label: 'Preguntas frecuentes', href: '#contact' },
	],
}

export default function Footer() {
	return (
		<footer id="contact" className="border-t border-white/60 bg-[#0f1020] text-white">
			<div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_0.8fr_0.8fr] lg:px-8">
				<div className="max-w-md space-y-4">
					<p className="text-[0.68rem] font-black uppercase tracking-[0.35em] text-[#9fa4ff]">Sobrao.</p>
					<h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white sm:text-3xl">
						Vape shop con foco en promociones, catálogo y conversión.
					</h2>
					<p className="text-sm leading-6 text-white/70">
						Experiencia pensada para vender rápido, mostrar ofertas y llevar a la compra sin fricción.
					</p>
				</div>

				<div>
					<h3 className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#9fa4ff]">Tienda</h3>
					<ul className="space-y-3 text-sm text-white/75">
						{footerLinks.tienda.map((item) => (
							<li key={item.label}>
								<Link href={item.href} className="transition hover:text-white">
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</div>

				<div>
					<h3 className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#9fa4ff]">Soporte</h3>
					<ul className="space-y-3 text-sm text-white/75">
						{footerLinks.soporte.map((item) => (
							<li key={item.label}>
								<Link href={item.href} className="transition hover:text-white">
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="border-t border-white/10 px-4 py-4 text-center text-xs uppercase tracking-[0.24em] text-white/45 sm:px-6 lg:px-8">
				© 2026 Sobrao. Todos los derechos reservados.
			</div>
		</footer>
	)
}
