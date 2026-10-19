export function formatPEN(value: number | bigint | string | null | undefined): string {
	const numeric =
		typeof value === 'number'
			? value
			: typeof value === 'bigint'
				? Number(value)
				: Number(value ?? 0)

	if (!Number.isFinite(numeric)) {
		return 'S/. 0.00'
	}

	return new Intl.NumberFormat('es-PE', {
		style: 'currency',
		currency: 'PEN',
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})
		.format(numeric)
		.replace('PEN', 'S/.')
}

export function formatNumber(
	value: number | bigint | string | null | undefined,
	maximumFractionDigits = 0
): string {
	const numeric =
		typeof value === 'number'
			? value
			: typeof value === 'bigint'
				? Number(value)
				: Number(value ?? 0)
	if (!Number.isFinite(numeric)) {
		return '0'
	}
	return new Intl.NumberFormat('es-PE', { maximumFractionDigits }).format(numeric)
}

export function formatDateTimeLima(date: Date | string | number | null | undefined): string {
	if (date == null) {
		return ''
	}
	const input = date instanceof Date ? date : new Date(date)
	if (!Number.isFinite(input.getTime())) {
		return ''
	}
	return new Intl.DateTimeFormat('es-PE', {
		timeZone: 'America/Lima',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(input)
}
