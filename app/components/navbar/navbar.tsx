'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ShoppingCart, User, X } from 'lucide-react'
import GlassButton from '../glassButton/glassButton'
import SearchBar, { SearchBarTrigger, useNavbarSearch } from './components/searchBar'
import { navbarStyles } from './styles/navbarStyles'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const simpleLinks = [
	{ label: 'Tienda', href: '/tienda' },
	{ label: 'Nosotros', href: '#about' },
]

const guestLinks = [
	{ label: 'Iniciar sesión', href: '/iniciar-sesion' },
	{ label: 'Registrarse', href: '/registro' },
]

const userLinks = [
	{ label: 'Mis compras', href: '/mis-compras', disabled: true },
	{ label: 'Beneficios', href: '/beneficios', disabled: true },
]

type AccountLink = { label: string; href: string; disabled?: boolean; action?: 'signOut' }

export default function Navbar() {
	const [isUserOpen, setIsUserOpen] = useState(false)
	const [isScrolled, setIsScrolled] = useState<boolean>(false)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
	const [, startTransition] = useTransition()
	const router = useRouter()

	const userMenuRef = useRef<HTMLDivElement | null>(null)
	const search = useNavbarSearch()
	const pathname = usePathname()

	useEffect(() => {
		let cancelled = false
		const sb = createBrowserClient()
		sb.auth.getUser().then(({ data }) => {
			if (cancelled) return
			setCurrentUser(data.user ?? null)
		})
		const {
			data: { subscription },
		} = sb.auth.onAuthStateChange((_event, session) => {
			setCurrentUser(session?.user ?? null)
			startTransition(() => router.refresh())
		})
		return () => {
			cancelled = true
			subscription?.unsubscribe()
		}
	}, [router])

	const isLoggedIn = Boolean(currentUser)
	const accountDisplayName = (() => {
		const md = currentUser?.user_metadata
		const fullName = md?.full_name || md?.fullName || md?.name
		if (typeof fullName === 'string' && fullName.trim()) return fullName.trim().split(/\s+/)[0]
		const email = currentUser?.email
		if (email) return email.split('@')[0]
		return 'Mi cuenta'
	})()

	async function handleSignOut() {
		const sb = createBrowserClient()
		try {
			await sb.auth.signOut()
		} catch {
			// no-op: onAuthStateChange limpia el estado
		}
		setIsUserOpen(false)
		setIsMobileMenuOpen(false)
		router.refresh()
	}

	const accountLinks: AccountLink[] = isLoggedIn
		? [
				{
					label: `Hola, ${accountDisplayName}`,
					href: '#account-header',
					disabled: true,
				},
				...userLinks,
				{ label: 'Cerrar sesión', href: '#logout', action: 'signOut' },
		  ]
		: guestLinks

	// Only the main page (/) has the hero section directly behind the navbar.
	// On every other route we lock the navbar into the compact solid-blue
	// "scrolled" look — no transparency, no padding/logo-shrink animation.
	const isHome = pathname === '/'
	const useSolidHeader = !isHome || isScrolled

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
		if (!isHome) {
			setIsScrolled(true)
			return
		}
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 8)
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [isHome])

	const openMobileSearch = () => {
		setIsMobileMenuOpen(false)
		search.toggleMobile()
	}

	const openMobileMenu = () => {
		search.closeMobile()
		setIsMobileMenuOpen((current) => !current)
	}

	return (
		<header
			className={`${navbarStyles.headerBase} ${
				useSolidHeader ? navbarStyles.headerScrolled : navbarStyles.headerTop
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

					<GlassButton variant="default" href="/carrito" className={navbarStyles.iconButton}>
						<ShoppingCart className="h-5 w-5 text-white" />
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
							<User className="h-5 w-5 text-white" />
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
								{accountLinks.map((item) =>
									item.action === 'signOut' ? (
										<button
											key={item.label}
											type="button"
											onClick={() => void handleSignOut()}
											className={`${navbarStyles.dropdownLink} text-left text-rose-100/90 hover:bg-rose-500/20`}
										>
											{item.label}
										</button>
									) : item.disabled ? (
										<span
											key={item.label}
											className={`${navbarStyles.dropdownLink} cursor-default text-white/70 hover:bg-transparent`}
										>
											{item.label}
										</span>
									) : (
										<Link
											key={item.label}
											href={item.href}
											onClick={() => setIsUserOpen(false)}
											className={navbarStyles.dropdownLink}
										>
											{item.label}
										</Link>
									)
								)}
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
						{isMobileMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
					</GlassButton>
				</div>
			</div>

			<SearchBar
				mode="mobile"
				isOpen={search.isMobileOpen}
				value={search.value}
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
					{accountLinks.map((item) =>
						item.action === 'signOut' ? (
							<button
								key={item.label}
								type="button"
								onClick={() => {
									setIsMobileMenuOpen(false)
									void handleSignOut()
								}}
								className={`${navbarStyles.mobileLink} w-full text-left text-rose-800/90 hover:bg-rose-50`}
							>
								{item.label}
							</button>
						) : item.disabled ? (
							<span
								key={item.label}
								className={`${navbarStyles.mobileLink} cursor-default text-slate-400`}
							>
								{item.label}
							</span>
						) : (
							<Link
								key={item.label}
								href={item.href}
								onClick={() => setIsMobileMenuOpen(false)}
								className={navbarStyles.mobileLink}
							>
								{item.label}
							</Link>
						)
					)}
				</div>
			)}
		</header>
	)
}