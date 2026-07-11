import Footer from '@/app/components/footer/footer'
import Content from '@/app/locale/main/content/content'
import Hero from '@/app/locale/main/hero/hero'

export default function Home() {
	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.14),transparent_34%),linear-gradient(180deg,#f9f8ff_0%,#ffffff_42%,#f4f3ff_100%)] text-slate-900">
			<Hero />
			<main className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-2 pb-12 pt-4 sm:px-3 lg:px-4">
				<Content />
			</main>
			<Footer />
		</div>
	)
}
