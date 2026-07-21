import type { Metadata } from 'next'
import localFont from 'next/font/local'
import FloatingActions from './components/floatingActions/floatingActions'
import './globals.css'

const satoshi = localFont({
	src: [
		{ path: './fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
		{ path: './fonts/Satoshi-Medium.woff2', weight: '500', style: 'normal' },
		{ path: './fonts/Satoshi-Bold.woff2', weight: '700', style: 'normal' },
		{ path: './fonts/Satoshi-Black.woff2', weight: '900', style: 'normal' },
	],
	variable: '--font-satoshi',
	display: 'swap',
})

const thunder = localFont({
	src: './fonts/Thunder-BoldLC.otf',
	weight: '900',
	style: 'normal',
	variable: '--font-thunder',
	display: 'swap',
})

export const metadata: Metadata = {
	title: 'Sobrao Vape Store',
	description: 'Tienda de vapeo con promociones, productos destacados y experiencia premium.',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="es" className={`${satoshi.variable} ${thunder.variable}`}>
			<body className={satoshi.className}>
				{children}
				<FloatingActions />
			</body>
		</html>
	)
}
