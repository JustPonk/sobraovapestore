import { Fragment } from 'react'

export type PurchaseStep = 'carrito' | 'recojo' | 'completada'

const steps: Array<{ id: PurchaseStep; label: string }> = [
	{ id: 'carrito', label: 'Carrito' },
	{ id: 'recojo', label: 'Recojo o Delivery' },
	{ id: 'completada', label: 'Orden completada' },
]

export default function PurchaseSteps({ current }: { current: PurchaseStep }) {
	const activeIndex = steps.findIndex((step) => step.id === current)

	return (
		<nav
			aria-label="Flujo de compra"
			className="flex w-full items-center justify-center gap-3 text-center text-sm font-semibold sm:gap-4 sm:text-base"
		>
			{steps.map((step, index) => (
				<Fragment key={step.id}>
					{index > 0 ? <span className="text-slate-300">›</span> : null}
					<span
						className={
							index === activeIndex
								? 'text-lg font-black uppercase tracking-[0.22em] text-[#111111] sm:text-xl'
								: index === activeIndex + 1
									? 'uppercase tracking-[0.18em] text-slate-400 sm:font-bold'
									: 'uppercase tracking-[0.18em] text-slate-300'
						}
					>
						{step.label}
					</span>
				</Fragment>
			))}
		</nav>
	)
}
