import Navbar from '@/app/components/navbar/navbar'

function ProductCardSkeleton() {
	return (
		<div className="overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#ece7ff]/90 to-[#d8d3ff]/90 shadow-[0_18px_34px_rgba(31,42,155,0.12)]">
			<div className="flex items-center justify-center border-b border-white/40 bg-white/55 px-4 pb-3 pt-6 sm:min-h-[280px] sm:pb-6 sm:pt-10">
				<div className="h-32 w-24 animate-pulse rounded-2xl bg-[#d8d3ff] sm:h-52 sm:w-40" />
			</div>
			<div className="border-t border-white/50 bg-[#f3efff]/75 px-3 pb-3 pt-3 sm:m-5 sm:rounded-[1.3rem] sm:border">
				<div className="h-5 w-4/5 animate-pulse rounded bg-[#d8d3ff] sm:h-6" />
				<div className="mt-3 flex items-end justify-between gap-3">
					<div className="h-10 w-10 animate-pulse rounded-full bg-[#1f2a9b]/30" />
					<div className="space-y-2">
						<div className="ml-auto h-3 w-12 animate-pulse rounded bg-[#d8d3ff]" />
						<div className="h-5 w-20 animate-pulse rounded bg-[#1f2a9b]/25" />
					</div>
				</div>
			</div>
		</div>
	)
}

export default function TiendaLoading() {
	return (
		<div
			className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900"
			aria-busy="true"
			aria-label="Cargando tienda"
		>
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-16 sm:pt-24">
				<section className="w-full bg-[url('/BGContent.png')] bg-cover bg-center bg-no-repeat">
					<div className="mx-auto w-full max-w-[1920px] space-y-7 px-3 pb-10 sm:space-y-9 sm:px-5 sm:pb-14 md:px-6 lg:px-8 xl:px-10">
						<div className="mx-auto flex w-full max-w-[80rem] gap-2 py-2 sm:justify-center sm:gap-4 sm:py-5">
							{Array.from({ length: 5 }, (_, index) => (
								<div
									key={index}
									className="h-10 flex-1 animate-pulse rounded-full bg-[#1f2a9b]/18 sm:h-[122px] sm:max-w-[150px] sm:rounded-[2rem]"
								/>
							))}
						</div>

						<div className="flex flex-col items-center gap-3 pt-2 text-center">
							<div className="h-3 w-44 animate-pulse rounded bg-[#1f2a9b]/15" />
							<div className="h-10 w-64 animate-pulse rounded bg-[#1f2a9b]/20 sm:h-12 sm:w-80" />
						</div>

						<div className="mx-auto grid w-full max-w-[80rem] grid-cols-2 gap-x-3 gap-y-10 px-2 sm:gap-x-5 sm:gap-y-12 sm:px-0 md:grid-cols-3 md:gap-x-6 md:gap-y-14">
							{Array.from({ length: 8 }, (_, index) => (
								<ProductCardSkeleton key={index} />
							))}
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}
