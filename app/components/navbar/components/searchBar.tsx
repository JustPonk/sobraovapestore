'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import GlassButton from '../../glassButton/glassButton'

type SearchBarMode = 'desktop' | 'mobile'

interface SearchBarProps {
	mode: SearchBarMode
	isOpen: boolean
	value: string
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

const EXPAND_ANIM_MS = 350

// 👉 ADJUST HERE: base (closed) and expanded widths for the desktop field.
const DESKTOP_WIDTH_CLOSED = 260
const DESKTOP_WIDTH_OPEN = 380

const searchBarStyles = {
	desktopWrap: 'absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block',

	field:
		'flex h-11 items-center justify-between rounded-full border border-white/40 bg-white pl-5 pr-1.5 text-[#2B1F97] shadow-[0_8px_24px_rgba(11,7,52,0.18)] transition-[width] duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] [font-family:var(--font-satoshi)]',
	input:
		'w-full bg-transparent text-left text-sm font-bold uppercase tracking-[0.06em] text-[#2B1F97] placeholder:text-[#2B1F97]/55 [font-family:var(--font-satoshi)] focus:outline-none',
	iconWrap:
		'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2B1F97] text-white',
	mobileRow: 'border-t border-white/10 bg-[#2B1F97] px-3 py-3 sm:px-5 md:hidden',
	mobileTrigger: 'md:hidden',
} as const

export function useNavbarSearch() {
	const [isDesktopOpen, setIsDesktopOpen] = useState(false)
	const [isMobileOpen, setIsMobileOpen] = useState(false)
	const [value, setValue] = useState('')

	const wrapRef = useRef<HTMLDivElement | null>(null)
	const inputRef = useRef<HTMLInputElement | null>(null)

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

	const toggleMobile = () => {
		setIsMobileOpen((current) => !current)
	}

	const closeMobile = () => {
		setIsMobileOpen(false)
	}

	return {
		isDesktopOpen,
		isMobileOpen,
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

export default function SearchBar({
	mode,
	isOpen,
	value,
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
		<div className={searchBarStyles.field} style={fieldWidth ? { width: fieldWidth } : undefined}>
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

	if (mode === 'desktop') {
		return (
			<div ref={wrapRef} className={searchBarStyles.desktopWrap}>
				{field}
			</div>
		)
	}

	return <div className={searchBarStyles.mobileRow}>{field}</div>
}