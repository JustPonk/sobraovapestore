'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { getStoredCart } from '@/app/locale/store/cartStorage'

const floatingButtonClass =
	'flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_16px_28px_rgba(15,16,32,0.18)] transition hover:scale-[1.04] hover:shadow-[0_22px_34px_rgba(15,16,32,0.24)] sm:h-16 sm:w-16'

const WHATSAPP_NUMBER = '51999999999'
const CART_LIQUID_FULL_AMOUNT = 200

function FloatingIconButton({
	label,
	src,
	onClick,
	iconClassName,
}: {
	label: string
	src: string
	onClick: () => void
	iconClassName?: string
}) {
	return (
		<button type="button" aria-label={label} onClick={onClick} className={floatingButtonClass}>
			<Image
				src={src}
				alt=""
				width={30}
				height={30}
				className={iconClassName ?? 'h-[30px] w-[30px] object-contain'}
			/>
		</button>
	)
}

function CartLevelButton() {
	const [itemCount, setItemCount] = useState(0)
	const [cartAmount, setCartAmount] = useState(0)
	const [isTemporarilyExpanded, setIsTemporarilyExpanded] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [isLiquidReady, setIsLiquidReady] = useState(false)
	const previousItemCountRef = useRef<number | null>(null)
	const collapseTimerRef = useRef<number | null>(null)

	useEffect(() => {
		const syncCartLevel = () => {
			const cart = getStoredCart()
			const nextItemCount = cart.reduce((total, item) => total + item.quantity, 0)
			const nextCartAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0)
			const previousItemCount = previousItemCountRef.current

			setItemCount(nextItemCount)
			setCartAmount(nextCartAmount)
			previousItemCountRef.current = nextItemCount

			if (previousItemCount === null || nextItemCount <= previousItemCount) return

			if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current)
			setIsLiquidReady(false)
			setIsTemporarilyExpanded(true)
			collapseTimerRef.current = window.setTimeout(() => {
				setIsTemporarilyExpanded(false)
				collapseTimerRef.current = null
			}, 5000)
		}

		syncCartLevel()
		window.addEventListener('sobrao-cart-updated', syncCartLevel)
		window.addEventListener('storage', syncCartLevel)

		return () => {
			window.removeEventListener('sobrao-cart-updated', syncCartLevel)
			window.removeEventListener('storage', syncCartLevel)
			if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current)
		}
	}, [])

	const isExpanded = isTemporarilyExpanded || isHovered

	useEffect(() => {
		if (!isExpanded) return

		const liquidDelay = window.setTimeout(() => setIsLiquidReady(true), 550)
		return () => window.clearTimeout(liquidDelay)
	}, [isExpanded])

	const cartLiquidLevel =
		cartAmount > CART_LIQUID_FULL_AMOUNT
			? 100
			: Math.min(90, (cartAmount / CART_LIQUID_FULL_AMOUNT) * 90)
	const liquidLevel = isExpanded ? (isLiquidReady ? cartLiquidLevel : 0) : 50
	const cartLabel = itemCount === 0 ? 'Ver carrito' : `Ver carrito con ${itemCount} producto${itemCount === 1 ? '' : 's'}`

	return (
		<Link
			aria-label={cartLabel}
			href="/carrito"
			onMouseEnter={() => {
				if (!isExpanded) setIsLiquidReady(false)
				setIsHovered(true)
			}}
			onMouseLeave={() => setIsHovered(false)}
			className={`${floatingButtonClass} relative self-end overflow-hidden bg-[#1f2a9b] hover:bg-[#1f2a9b] transition-[height,border-radius,transform,box-shadow] duration-500 ease-out ${
				isExpanded ? '!h-36 !rounded-[2rem]' : '!h-16 !rounded-full'
			}`}
		>
			<span
				aria-hidden="true"
				className={`absolute inset-x-0 bottom-0 overflow-hidden bg-gradient-to-t from-[#35c7f3] via-[#4b82ff] to-[#9ceeff] transition-[height] ease-out ${
					isExpanded && isLiquidReady ? 'duration-[2400ms]' : 'duration-0'
				}`}
				style={{ height: `${liquidLevel}%` }}
			>
				<span className="absolute inset-x-0 top-0 h-1 bg-white/55 blur-[1px]" />
			</span>
			<svg
				aria-hidden="true"
				viewBox="0 0 96 96"
				className={`absolute z-10 h-[30px] w-[30px] transition-[top,transform] duration-500 ease-out ${
					isExpanded ? 'top-4' : 'top-1/2 -translate-y-1/2'
				}`}
				fill="none"
			>
				<path d="M27 31H34L39 56H64L70 39H42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
				<circle cx="43" cy="67" r="5" fill="white" />
				<circle cx="61" cy="67" r="5" fill="white" />
			</svg>
		</Link>
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
				<div className="hidden lg:block">
					<FloatingIconButton label="Abrir chatbot" src="/icons/chatbot.svg" onClick={openChatbot} />
				</div>
				<FloatingIconButton
					label="Chatear por WhatsApp"
					src="/icons/whatsapp.svg"
					onClick={openWhatsApp}
					iconClassName="h-full w-full"
				/>
			</div>

			<div className="fixed bottom-5 right-3 z-[70] hidden flex-col gap-3 sm:bottom-7 sm:right-5 md:right-6 lg:flex lg:left-auto lg:right-8 xl:right-10">
				<FloatingIconButton label="Volver arriba" src="/icons/arrow-up.svg" onClick={scrollToTop} />
				{/* TODO: confirmar función real del botón inferior derecho del mockup. */}
				<CartLevelButton />
			</div>
		</>
	)
}
