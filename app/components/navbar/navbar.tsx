'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, ShoppingCart } from 'lucide-react'
import GlassButton from '../glassButton/glassButton'

const navigation = [
	{ label: 'Contacto', href: '#contact' },
	{ label: 'Nosotros', href: '#about' },
]

const dropdownLinks = [
	{ label: 'Promociones', href: '#promotions' },
	{ label: 'Productos', href: '#shop' },
	{ label: 'Carrito', href: '#cart' },
]

const navbarStyles = {
	headerBase:
		'w-full text-white [font-family:var(--font-satoshi)] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300',
	headerTop: 'border-b border-white/10 bg-[#2B1F97]/18 backdrop-blur-xl',
	headerScrolled: 'border-b border-[#3f31ba] bg-[#2B1F97] shadow-[0_10px_28px_rgba(11,7,52,0.24)]',
	container:
		'mx-auto flex w-full max-w-[1440px] items-center justify-between px-3 text-white transition-[padding] duration-300 sm:px-4 lg:px-5',
	containerTop: 'py-3',
	containerScrolled: 'py-2',
	logoWrapBase: 'relative origin-left transition-[width,height,transform] duration-300',
	logoWrapTop: 'h-12 w-52 sm:h-14 sm:w-60 md:h-[3.9rem] md:w-[16.5rem]',
	logoWrapScrolled: 'h-10 w-44 sm:h-11 sm:w-48 md:h-12 md:w-52',
	menu: 'absolute left-1/2 hidden -translate-x-1/2 items-center gap-3  md:flex',
	navButton: 'h-10 min-w-[124px] px-4 font-black uppercase leading-none tracking-[0.01em] [font-family:var(--font-satoshi)]',
	actionButton: 'h-10 px-4 text-[1.02rem] uppercase leading-none tracking-[0.03em] [font-family:var(--font-satoshi)]',
	loginButton: 'min-w-[108px]',
	cartButton: 'min-w-[72px] gap-2 text-white',
	dropdown:
		'absolute left-1/2 top-[calc(100%+10px)] z-50 w-[240px] -translate-x-1/2 rounded-[28px] border border-white/20 bg-white/12 p-2 backdrop-blur-2xl transition-all duration-300',
	dropdownLink:
		'rounded-[20px] px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white/92 transition duration-200 hover:bg-white/12 hover:text-white',
	actions: 'ml-auto flex items-center gap-3',
}

export default function Navbar() {
	const [isShopOpen, setIsShopOpen] = useState(false)
	const [isScrolled, setIsScrolled] = useState(false)
	const shopMenuRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!shopMenuRef.current?.contains(event.target as Node)) {
				setIsShopOpen(false)
			}
		}

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsShopOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [])

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 8)
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [])

	return (
		<header
			className={`${navbarStyles.headerBase} ${
				isScrolled ? navbarStyles.headerScrolled : navbarStyles.headerTop
			}`}
		>
			<div
				className={`${navbarStyles.container} ${
					isScrolled ? navbarStyles.containerScrolled : navbarStyles.containerTop
				}`}
			>
				<div
					className={`${navbarStyles.logoWrapBase} ${
						isScrolled ? navbarStyles.logoWrapScrolled : navbarStyles.logoWrapTop
					}`}
				>
					<Link href="/" className="block h-full w-full">
						<Image
							src="/logosobrao.png"
							alt="Sobrao Vape Store"
							fill
							priority
							sizes="(max-width: 768px) 176px, 208px"
							className="object-contain object-left"
						/>
					</Link>
				</div>

				<nav className={navbarStyles.menu}>
					<div
						ref={shopMenuRef}
						className="relative"
						onMouseEnter={() => setIsShopOpen(true)}
						onMouseLeave={() => setIsShopOpen(false)}
					>
						<GlassButton
							variant="dropdown"
							type="button"
							aria-haspopup="menu"
							aria-expanded={isShopOpen}
							onClick={() => setIsShopOpen((current) => !current)}
							className={`${navbarStyles.navButton} pr-3`}
						>
							<span className="text-inherit font-bold leading-none [font-size:inherit] [letter-spacing:inherit]">
								Tienda
							</span>
							<ChevronDown
								className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isShopOpen ? 'rotate-180' : ''}`}
							/>
						</GlassButton>

						<div
							className={`${navbarStyles.dropdown} ${
								isShopOpen
									? 'visible translate-y-0 opacity-100 shadow-[0_18px_40px_rgba(11,7,52,0.42)]'
									: 'pointer-events-none invisible -translate-y-2 opacity-0'
							}`}
						>
							<span className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/10" />
							<span className="pointer-events-none absolute inset-x-6 top-[2px] h-8 rounded-full bg-white/18 blur-sm" />
							<div className="relative z-10 flex flex-col gap-1">
								{dropdownLinks.map((item) => (
									<Link
										key={item.label}
										href={item.href}
										onClick={() => setIsShopOpen(false)}
										className={navbarStyles.dropdownLink}
									>
										{item.label}
									</Link>
								))}
							</div>
						</div>
					</div>

					{navigation.map((item) => (
						<GlassButton
							key={item.label}
							variant="default"
							href={item.href}
							className={navbarStyles.navButton}
						>
							{item.label}
						</GlassButton>
					))}
				</nav>

				<div className={navbarStyles.actions}>
					<GlassButton
						variant="compact"
						href="#login"
						className={`${navbarStyles.actionButton} ${navbarStyles.loginButton}`}
					>
						Login
					</GlassButton>

					<GlassButton
						variant="default"
						href="#cart"
						className={`${navbarStyles.actionButton} ${navbarStyles.cartButton}`}
					>
						<ShoppingCart className="h-5 w-5" />
					</GlassButton>
				</div>
			</div>
		</header>
	)
}
