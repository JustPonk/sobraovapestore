export const navbarStyles = {
	headerBase:
		'w-full text-white [font-family:var(--font-satoshi)] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300',
	headerTop: 'border-b border-white/10 bg-[#2B1F97]/18 backdrop-blur-xl',
	headerScrolled: 'border-b border-[#3f31ba] bg-[#2B1F97] shadow-[0_10px_28px_rgba(11,7,52,0.24)]',
	container:
		'relative mx-auto flex w-full max-w-[1920px] items-center justify-between gap-2 px-3 text-white transition-[padding] duration-300 sm:px-5 md:px-6 lg:px-8 xl:px-10',
	containerTop: 'py-3',
	containerScrolled: 'py-2',
	logoWrapBase: 'relative origin-left shrink-0 transition-[width,height,transform] duration-300',
	logoWrapTop: 'h-9 w-32 sm:h-12 sm:w-44 md:h-[3.4rem] md:w-56 lg:h-[3.9rem] lg:w-[16.5rem]',
	logoWrapScrolled: 'h-8 w-28 sm:h-10 sm:w-36 md:h-11 md:w-44 lg:h-12 lg:w-52',
	navLinks: 'hidden items-center gap-2 md:flex lg:gap-3',
	navButton:
		'h-10 min-w-[100px] px-3 font-black uppercase leading-none tracking-[0.01em] [font-family:var(--font-satoshi)] lg:min-w-[124px] lg:px-4',
	iconButton: 'h-10 w-10 min-w-0 shrink-0 justify-center px-0',
	actions: 'flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3',
	dropdown:
		'absolute right-0 top-[calc(100%+10px)] z-50 w-[min(240px,calc(100vw-2rem))] rounded-[28px] border border-white/20 bg-white/12 p-2 backdrop-blur-2xl transition-all duration-300',
	dropdownLink:
		'rounded-[20px] px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white/92 transition duration-200 hover:bg-white/12 hover:text-white',
	mobilePanel: 'border-t border-white/10 bg-[#2B1F97] px-3 py-3 sm:px-5 md:hidden',
	mobileLink:
		'block rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white/92 transition duration-200 hover:bg-white/10 hover:text-white',
	mobileSectionLabel: 'px-4 pb-1 pt-3 text-xs font-black uppercase tracking-[0.14em] text-white/50',
} as const
