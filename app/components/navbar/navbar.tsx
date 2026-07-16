'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, ShoppingCart, User, X } from 'lucide-react'
import GlassButton from '../glassButton/glassButton'
import SearchBar, { SearchBarTrigger, useNavbarSearch } from './components/searchBar'
import { navbarStyles } from './styles/navbarStyles'

const simpleLinks = [
	{ label: 'Tienda', href: '#tienda' },
	{ label: 'Nosotros', href: '#about' },
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

export default function Navbar() {
	const [isUserOpen, setIsUserOpen] = useState(false)
	const [isScrolled, setIsScrolled] = useState(false)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	// TODO: wire this up to your real auth/session state (e.g. NextAuth).
	const [isLoggedIn] = useState(false)

	const userMenuRef = useRef<HTMLDivElement | null>(null)
	const search = useNavbarSearch()

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!userMenuRef.current?.contains(event.target as Node)) {
				setIsUserOpen(false)
			}
		}

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsUserOpen(false)
				setIsMobileMenuOpen(false)
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

	const openMobileSearch = () => {
		setIsMobileMenuOpen(false)
		search.toggleMobile()
	}

	const openMobileMenu = () => {
		search.closeMobile()
		setIsMobileMenuOpen((current) => !current)
	}

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
				{/* LEFT: logo only, pinned to the start of the row */}
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
							sizes="(max-width: 768px) 140px, 208px"
							className="object-contain object-left"
						/>
					</Link>
				</div>

				<SearchBar
					mode="desktop"
					isOpen={search.isDesktopOpen}
					value={search.value}
					isAnimating={search.isAnimating}
					inputRef={search.inputRef}
					wrapRef={search.wrapRef}
					onOpen={search.openDesktop}
					onValueChange={search.setValue}
				/>

				{/* RIGHT: Tienda, Nosotros, Carrito, Persona — in that order.
				    Tienda/Nosotros are text buttons that only fit from md up;
				    below that they live in the hamburger panel instead. */}
				<div className={navbarStyles.actions}>
					<nav className={navbarStyles.navLinks}>
						{simpleLinks.map((item) => (
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

					<SearchBarTrigger
						isOpen={search.isMobileOpen}
						onToggle={openMobileSearch}
						className={navbarStyles.iconButton}
					/>

					<GlassButton variant="default" href="#cart" className={navbarStyles.iconButton}>
						<ShoppingCart className="h-5 w-5" />
					</GlassButton>

					{/* User menu: hidden on the smallest screens (folded into the
					    hamburger panel instead) so icons never fight for space on
					    a narrow phone. */}
					<div ref={userMenuRef} className="relative hidden sm:block">
						<GlassButton
							variant="default"
							type="button"
							aria-haspopup="menu"
							aria-expanded={isUserOpen}
							onClick={() => setIsUserOpen((current) => !current)}
							className={navbarStyles.iconButton}
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

					<GlassButton
						variant="default"
						type="button"
						aria-label="Menú"
						aria-expanded={isMobileMenuOpen}
						onClick={openMobileMenu}
						className={`${navbarStyles.iconButton} md:hidden`}
					>
						{isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</GlassButton>
				</div>
			</div>

			<SearchBar
				mode="mobile"
				isOpen={search.isMobileOpen}
				value={search.value}
				isAnimating={search.isAnimating}
				onOpen={search.openDesktop}
				onValueChange={search.setValue}
			/>

			{/* Mobile menu panel: Tienda + Nosotros plus the account links,
			    stacked for small/medium screens. */}
			{isMobileMenuOpen && (
				<div className={navbarStyles.mobilePanel}>
					{simpleLinks.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							onClick={() => setIsMobileMenuOpen(false)}
							className={navbarStyles.mobileLink}
						>
							{item.label}
						</Link>
					))}

					<span className={navbarStyles.mobileSectionLabel}>Cuenta</span>
					{accountLinks.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							onClick={() => setIsMobileMenuOpen(false)}
							className={navbarStyles.mobileLink}
						>
							{item.label}
						</Link>
					))}
				</div>
			)}
		</header>
	)
}
