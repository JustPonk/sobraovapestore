import Link from 'next/link'
import { Suspense } from 'react'
import Navbar from '@/app/components/navbar/navbar'
import LoginForm from './LoginForm'

export const metadata = {
	title: 'Iniciar sesión · Sobrao Vape Store',
	description: 'Ingresa con tu cuenta para ver tus pedidos, guardar direcciones y agilizar tu próxima compra.',
}

export default function LoginPage() {
	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="relative flex min-h-[calc(100vh-112px)] items-center justify-center px-4 pb-12 pt-28 sm:px-6 lg:px-8">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#1f2a9b]/10 blur-3xl" />
					<div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
				</div>

				<section className="relative z-10 w-full max-w-2xl">
					<div className="rounded-[1.8rem] border border-white/70 bg-white/85 p-6 shadow-[0_22px_60px_rgba(31,42,155,0.12)] sm:p-8">
						<h1 className="text-lg font-black uppercase tracking-[0.08em] text-[#101010] sm:text-xl">
							Iniciar sesión en Sobrao Store
						</h1>
						<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
							Ingresa con tu correo y contraseña para agilizar tu checkout, ver el estado
							de tus pedidos y gestionar tus direcciones.
						</p>

						<Suspense fallback={null}>
							<LoginForm />
						</Suspense>

						<div className="mt-6 flex flex-col gap-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
							<Link
								href="/registro"
								className="rounded-full bg-indigo-50 px-4 py-2.5 text-[#1f2a9b] transition hover:bg-indigo-100"
							>
								No tengo cuenta · Registrarme
							</Link>
							<Link
								href="/tienda"
								className="rounded-full border border-indigo-100 px-4 py-2.5 text-slate-700 transition hover:bg-indigo-50"
							>
								← Volver a la tienda
							</Link>
						</div>
					</div>

					<p className="mt-5 text-center text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500">
						Al iniciar sesión aceptas los{' '}
						<Link href="/terminos-y-condiciones" className="underline underline-offset-4 text-[#1f2a9b]" target="_blank" rel="noreferrer">
							Términos y Condiciones
						</Link>{' '}
						y la{' '}
						<Link href="/politica-de-privacidad" className="underline underline-offset-4 text-[#1f2a9b]" target="_blank" rel="noreferrer">
							Política de Privacidad
						</Link>
						.
					</p>
				</section>
			</main>
		</div>
	)
}
