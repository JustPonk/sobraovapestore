'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, Search, ShoppingCart, User } from 'lucide-react'
import GlassButton from '../glassButton/glassButton'

const navigation = [
	{ label: 'Tienda', href: '#tienda' },
	{ label: 'Nosotros', href: '#about' }

]

const dropdownLinks = [
	{ label: 'Promociones', href: '#promotions' },
	{ label: 'Productos', href: '#shop' },
	{ label: 'Carrito', href: '#cart' },
]

const guestLinks = [
	{ label: 'Login', href: '#login' },
	{ label: 'Registrarse', href: '#register' },
]

const userLinks = [
	{ label: 'Mis compras', href: '#orders' },
	{ label: 'Beneficios', href: '#benefits' },
	{ label: 'Log out', href: '#logout' },
]

const navbarStyles = {
	headerBase:
		'w-full text-white [font-family:var(--font-satoshi)] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300',
	headerTop: 'border-b border-white/10 bg-[#2B1F97]/18 backdrop-blur-xl',
	headerScrolled: 'border-b border-[#3f31ba] bg-[#2B1F97] shadow-[0_10px_28px_rgba(11,7,52,0.24)]',
	container:
		'relative mx-auto flex w-full max-w-[1440px] items-center justify-between px-1.5 text-white transition-[padding] duration-300 sm:px-2.5 lg:px-3',
	containerTop: 'py-3',
	containerScrolled: 'py-2',
	left: 'flex items-center gap-3 lg:gap-4',
	logoWrapBase: 'relative origin-left shrink-0 transition-[width,height,transform] duration-300',
	logoWrapTop: 'h-12 w-52 sm:h-14 sm:w-60 md:h-[3.9rem] md:w-[16.5rem]',
	logoWrapScrolled: 'h-10 w-44 sm:h-11 sm:w-48 md:h-12 md:w-52',
	menu: 'hidden items-center gap-2 lg:gap-3 md:flex',
	navButton: 'h-10 min-w-[118px] px-3.5 font-black uppercase leading-none tracking-[0.01em] [font-family:var(--font-satoshi)] lg:min-w-[124px] lg:px-4',
	actionButton: 'h-10 px-3 text-[0.95rem] uppercase leading-none tracking-[0.03em] [font-family:var(--font-satoshi)] lg:px-4 lg:text-[1.02rem]',
	cartButton: 'min-w-[32px] gap-2 text-white',
	userButton: 'h-10 w-10 min-w-0 justify-center px-0',
	dropdown:
		'absolute left-1/2 top-[calc(100%+10px)] z-50 w-[240px] -translate-x-1/2 rounded-[28px] border border-white/20 bg-white/12 p-2 backdrop-blur-2xl transition-all duration-300',
	dropdownLink:
		'rounded-[20px] px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white/92 transition duration-200 hover:bg-white/12 hover:text-white',
	actions: 'flex items-center gap-2 lg:gap-3',
	searchWrap: 'absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block',
	searchField:
		'flex h-11 items-center justify-between rounded-full border border-white/40 bg-white pl-5 pr-2 text-[#2B1F97] shadow-[0_10px_28px_rgba(11,7,52,0.18)] transition-[width] duration-300 ease-out',
	searchInput:
		'w-full bg-transparent text-sm font-bold uppercase tracking-[0.06em] text-[#2B1F97] placeholder:text-[#2B1F97]/60 focus:outline-none',
	searchIconWrap: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2B1F97] text-white',
}

export default function Navbar() {
	const [isShopOpen, setIsShopOpen] = useState(false)
	const [isUserOpen, setIsUserOpen] = useState(false)
	const [isScrolled, setIsScrolled] = useState(false)
	const [isSearchOpen, setIsSearchOpen] = useState(false)
	const [searchValue, setSearchValue] = useState('')
	// TODO: wire this up to your real auth/session state (e.g. NextAuth).
	const [isLoggedIn] = useState(false)

	const shopMenuRef = useRef<HTMLDivElement | null>(null)
	const userMenuRef = useRef<HTMLDivElement | null>(null)
	const searchWrapRef = useRef<HTMLDivElement | null>(null)
	const searchInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!shopMenuRef.current?.contains(event.target as Node)) {
				setIsShopOpen(false)
			}
			if (!userMenuRef.current?.contains(event.target as Node)) {
				setIsUserOpen(false)
			}
			if (!searchWrapRef.current?.contains(event.target as Node) && searchValue.trim() === '') {
				setIsSearchOpen(false)
			}
		}

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsShopOpen(false)
				setIsUserOpen(false)
				setIsSearchOpen(false)
				searchInputRef.current?.blur()
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [searchValue])

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

	const accountLinks = isLoggedIn ? userLinks : guestLinks

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
				<div className={navbarStyles.left}>
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

						
					</nav>
				</div>

				<div ref={searchWrapRef} className={navbarStyles.searchWrap}>
					<div
						className={navbarStyles.searchField}
						style={{ width: isSearchOpen ? 300 : 200 }}
					>
						<input
							ref={searchInputRef}
							type="text"
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							onFocus={() => setIsSearchOpen(true)}
							placeholder="BUSCA TU HUMO"
							className={navbarStyles.searchInput}
						/>
						<span className={navbarStyles.searchIconWrap}>
							<Search className="h-4 w-4" />
						</span>
					</div>
				</div>

				<div className={navbarStyles.actions}>
					
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

					<GlassButton
						variant="default"
						href="#cart"
						className={`${navbarStyles.actionButton} ${navbarStyles.cartButton}`}
					>
						<ShoppingCart className="h-5 w-5" />
					</GlassButton>

					<div ref={userMenuRef} className="relative">
						<GlassButton
							variant="default"
							type="button"
							aria-haspopup="menu"
							aria-expanded={isUserOpen}
							onClick={() => setIsUserOpen((current) => !current)}
							className={navbarStyles.userButton}
						>
							<User className="h-5 w-5" />
						</GlassButton>

						<div
							className={`${navbarStyles.dropdown} ${
								isUserOpen
									? 'visible translate-y-0 opacity-100 shadow-[0_18px_40px_rgba(11,7,52,0.42)]'
									: 'pointer-events-none invisible -translate-y-2 opacity-0'
							}`}
						>
							<span className="pointer-events-none absolute inset-[1px] rounded-[27px] border border-white/10" />
							<span className="pointer-events-none absolute inset-x-6 top-[2px] h-8 rounded-full bg-white/18 blur-sm" />
							<div className="relative z-10 flex flex-col gap-1">
								{accountLinks.map((item) => (
									<Link
										key={item.label}
										href={item.href}
										onClick={() => setIsUserOpen(false)}
										className={navbarStyles.dropdownLink}
									>
										{item.label}
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
	)
}