'use client'

import Image from 'next/image'
import Link from 'next/link'

const floatingButtonClass =
	'flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_16px_28px_rgba(15,16,32,0.18)] transition hover:scale-[1.04] hover:shadow-[0_22px_34px_rgba(15,16,32,0.24)] sm:h-16 sm:w-16'

const WHATSAPP_NUMBER = '51999999999'

function FloatingIconButton({
	label,
	src,
	onClick,
}: {
	label: string
	src: string
	onClick: () => void
}) {
	return (
		<button type="button" aria-label={label} onClick={onClick} className={floatingButtonClass}>
			<Image src={src} alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
		</button>
	)
}

export default function FloatingActions() {
	const openWhatsApp = () => {
		window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank', 'noopener,noreferrer')
	}

	const openChatbot = () => {
		// TODO: conectar con el widget/chatbot real cuando exista la implementación.
		window.dispatchEvent(new CustomEvent('sobrao-chatbot-open'))
	}

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	return (
		<>
			<div className="fixed bottom-5 left-3 z-[70] flex flex-col gap-3 sm:bottom-7 sm:left-5 md:left-6 lg:left-8 xl:left-10">
				<FloatingIconButton label="Abrir chatbot" src="/icons/chatbot.svg" onClick={openChatbot} />
				<FloatingIconButton
					label="Chatear por WhatsApp"
					src="/icons/whatsapp.svg"
					onClick={openWhatsApp}
				/>
			</div>

			<div className="fixed bottom-5 right-3 z-[70] flex flex-col gap-3 sm:bottom-7 sm:right-5 md:right-6 lg:right-8 xl:right-10">
				<FloatingIconButton label="Volver arriba" src="/icons/arrow-up.svg" onClick={scrollToTop} />
				{/* TODO: confirmar función real del botón inferior derecho del mockup. */}
				<Link aria-label="Ver carrito" href="/carrito" className={floatingButtonClass}>
					<Image src="/icons/cart.svg" alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
				</Link>
			</div>
		</>
	)
}
