'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import GlassButton from '../../glassButton/glassButton'

type SearchBarMode = 'desktop' | 'mobile'

interface SearchBarProps {
	mode: SearchBarMode
	isOpen: boolean
	value: string
	isAnimating: boolean
	inputRef?: React.RefObject<HTMLInputElement | null>
	wrapRef?: React.RefObject<HTMLDivElement | null>
	onOpen: () => void
	onValueChange: (value: string) => void
}

interface SearchBarTriggerProps {
	isOpen: boolean
	onToggle: () => void
	className?: string
}

const LIQUID_ANIM_MS = 650

// 👉 ADJUST HERE: base (closed) and expanded widths for the desktop field.
// Bumped up from the previous 200/300 so the placeholder text has room to
// sit left-aligned instead of reading as visually centered in a cramped pill.
const DESKTOP_WIDTH_CLOSED = 260
const DESKTOP_WIDTH_OPEN = 380

const searchBarStyles = {
	desktopWrap: 'absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block',

	// Liquid-glass pill: translucent + blurred instead of solid white, so the
	// navbar's deep purple shows through the material like light through
	// e-liquid. `liquid-sheen` drives the slow ambient light sweep below.
	field:
		'liquid-field liquid-sheen relative flex h-11 items-center justify-between overflow-hidden rounded-full border border-white/30 bg-white/10 pl-5 pr-1.5 text-white shadow-[0_8px_30px_rgba(11,7,52,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl backdrop-saturate-150 [font-family:var(--font-satoshi)]',
	input:
		'relative z-10 w-full bg-transparent text-left text-sm font-bold uppercase tracking-[0.06em] text-white placeholder:text-white/55 [font-family:var(--font-satoshi)] focus:outline-none',
	// `liquid-icon-glow` gives the droplet its own slow, breathing halo —
	// the "constant but not violent" motion the search bar needed.
	iconWrap:
		'liquid-icon-glow relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7dd8ff] to-[#3b6eff] text-white',
	mobileRow: 'border-t border-white/10 bg-[#2B1F97] px-3 py-3 sm:px-5 md:hidden',
	mobileTrigger: 'md:hidden',
} as const

export function useNavbarSearch() {
	const [isDesktopOpen, setIsDesktopOpen] = useState(false)
	const [isMobileOpen, setIsMobileOpen] = useState(false)
	const [isAnimating, setIsAnimating] = useState(false)
	const [value, setValue] = useState('')

	const wrapRef = useRef<HTMLDivElement | null>(null)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const liquidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!wrapRef.current?.contains(event.target as Node) && value.trim() === '') {
				setIsDesktopOpen(false)
			}
		}

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsDesktopOpen(false)
				setIsMobileOpen(false)
				inputRef.current?.blur()
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
		}
	}, [value])

	useEffect(() => {
		setIsAnimating(true)
		if (liquidTimeoutRef.current) clearTimeout(liquidTimeoutRef.current)
		liquidTimeoutRef.current = setTimeout(() => setIsAnimating(false), LIQUID_ANIM_MS)

		return () => {
			if (liquidTimeoutRef.current) clearTimeout(liquidTimeoutRef.current)
		}
	}, [isDesktopOpen, isMobileOpen])

	const toggleMobile = () => {
		setIsMobileOpen((current) => !current)
	}

	const closeMobile = () => {
		setIsMobileOpen(false)
	}

	return {
		isDesktopOpen,
		isMobileOpen,
		isAnimating,
		value,
		wrapRef,
		inputRef,
		setValue,
		openDesktop: () => setIsDesktopOpen(true),
		setDesktopOpen: setIsDesktopOpen,
		toggleMobile,
		closeMobile,
	}
}

export function SearchBarTrigger({ isOpen, onToggle, className = '' }: SearchBarTriggerProps) {
	return (
		<GlassButton
			variant="default"
			type="button"
			aria-label="Buscar"
			aria-expanded={isOpen}
			onClick={onToggle}
			className={`${searchBarStyles.mobileTrigger} ${className}`.trim()}
		>
			<Search className="h-5 w-5" />
		</GlassButton>
	)
}

function LiquidStyles() {
	return (
		<style>{`
			.liquid-field {
				transition: width ${LIQUID_ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1),
					background-color 400ms ease, border-color 400ms ease;
				will-change: width;
			}
			.liquid-field:focus-within {
				background-color: rgba(255, 255, 255, 0.16);
				border-color: rgba(255, 255, 255, 0.5);
			}
			.liquid-field.is-liquid-animating {
				animation: liquidMorph ${LIQUID_ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1);
			}
			@keyframes liquidMorph {
				0% { border-radius: 999px; }
				22% { border-radius: 42% 58% 63% 37% / 47% 41% 59% 53%; }
				48% { border-radius: 61% 39% 34% 66% / 55% 61% 39% 45%; }
				74% { border-radius: 44% 56% 58% 42% / 41% 49% 51% 59%; }
				100% { border-radius: 999px; }
			}
			.liquid-ripple {
				animation: liquidRipple ${LIQUID_ANIM_MS}ms ease-out forwards;
			}
			@keyframes liquidRipple {
				0% { transform: translate(-50%, -50%) scale(0.25); opacity: 0.55; }
				65% { opacity: 0.18; }
				100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
			}

			/* Glass specular highlight along the top edge — the "liquid glass"
			   material read, same family as Apple's frosted glass surfaces. */
			.liquid-field::before {
				content: '';
				position: absolute;
				inset: 0;
				border-radius: inherit;
				background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 42%);
				mix-blend-mode: overlay;
				pointer-events: none;
			}

			/* Slow ambient sheen drifting through the glass, like light moving
			   through the liquid in a tank. Runs continuously but stays subtle:
			   ~6.5s cycle, low opacity, gated behind reduced-motion. */
			@media (prefers-reduced-motion: no-preference) {
				.liquid-sheen::after {
					content: '';
					position: absolute;
					inset: 0;
					border-radius: inherit;
					background: linear-gradient(
						115deg,
						transparent 35%,
						rgba(180, 225, 255, 0.35) 48%,
						rgba(255, 255, 255, 0.06) 55%,
						transparent 65%
					);
					transform: translateX(-120%);
					animation: liquidSheen 6.5s ease-in-out infinite;
					pointer-events: none;
				}

				.liquid-icon-glow {
					animation: liquidGlow 2.6s ease-in-out infinite;
				}
			}
			@keyframes liquidSheen {
				0%, 15% { transform: translateX(-120%); }
				45%, 100% { transform: translateX(120%); }
			}
			@keyframes liquidGlow {
				0%, 100% {
					box-shadow: 0 0 0 0 rgba(125, 216, 255, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.25);
				}
				50% {
					box-shadow: 0 0 0 6px rgba(125, 216, 255, 0), 0 0 0 1px rgba(255, 255, 255, 0.25);
				}
			}

			/* Accessibility: honor reduced-motion for every animated piece,
			   interaction-triggered or ambient. */
			@media (prefers-reduced-motion: reduce) {
				.liquid-field,
				.liquid-field.is-liquid-animating {
					animation: none !important;
					transition: none !important;
				}
				.liquid-ripple {
					display: none;
				}
			}
		`}</style>
	)
}

function LiquidRipple({ isAnimating }: { isAnimating: boolean }) {
	if (!isAnimating) return null

	return (
		<span
			aria-hidden
			className="liquid-ripple pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#bcd6ff]/70"
		/>
	)
}

export default function SearchBar({
	mode,
	isOpen,
	value,
	isAnimating,
	inputRef,
	wrapRef,
	onOpen,
	onValueChange,
}: SearchBarProps) {
	const fieldWidth = mode === 'desktop' ? (isOpen ? DESKTOP_WIDTH_OPEN : DESKTOP_WIDTH_CLOSED) : undefined

	if (mode === 'mobile' && !isOpen) {
		return null
	}

	const field = (
		<div
			className={`${searchBarStyles.field} ${isAnimating ? 'is-liquid-animating' : ''}`}
			style={fieldWidth ? { width: fieldWidth } : undefined}
		>
			<LiquidRipple isAnimating={isAnimating} />
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				onFocus={onOpen}
				placeholder="BUSCA TU HUMO"
				autoFocus={mode === 'mobile'}
				className={searchBarStyles.input}
			/>
			<span className={searchBarStyles.iconWrap}>
				<Search className="h-4 w-4" />
			</span>
		</div>
	)

	return (
		<>
			<LiquidStyles />
			{mode === 'desktop' ? (
				<div ref={wrapRef} className={searchBarStyles.desktopWrap}>
					{field}
				</div>
			) : (
				<div className={searchBarStyles.mobileRow}>{field}</div>
			)}
		</>
	)
}