export const STORE_CART_KEY = 'sobrao-cart'

export interface StoreCartItem {
	productId: string
	productName: string
	productSlug: string
	variantId: string
	sku: string
	price: number
	quantity: number
	imageSrc: string
	comboId?: string | null
	comboName?: string | null
	comboInstanceId?: string | null
}

function saveCart(cart: StoreCartItem[]): StoreCartItem[] {
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(STORE_CART_KEY, JSON.stringify(cart))
		window.dispatchEvent(new CustomEvent('sobrao-cart-updated'))
	}
	return cart
}

export function getStoredCart(): StoreCartItem[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const rawCart = window.localStorage.getItem(STORE_CART_KEY)
		if (!rawCart) {
			return []
		}

		const parsedCart = JSON.parse(rawCart) as StoreCartItem[]
		return Array.isArray(parsedCart) ? parsedCart : []
	} catch {
		return []
	}
}

export function upsertCartItem(item: StoreCartItem): StoreCartItem[] {
	const currentCart = getStoredCart()
	// Solo fusionar con líneas sueltas: los combos viven aislados en sus propias líneas.
	const itemIndex = currentCart.findIndex(
		(currentItem) => currentItem.variantId === item.variantId && !currentItem.comboId
	)

	if (itemIndex >= 0) {
		currentCart[itemIndex] = {
			...currentCart[itemIndex],
			quantity: currentCart[itemIndex].quantity + item.quantity,
		}
	} else {
		currentCart.push(item)
	}

	return saveCart(currentCart)
}

export function updateStoredItemQty(variantId: string, nextQty: number, comboId?: string | null): StoreCartItem[] {
	const currentCart = getStoredCart()
	const qty = Math.max(1, Math.floor(Number(nextQty) || 1))
	const next = currentCart.map((it) => {
		const matchesVariant = it.variantId === variantId
		const matchesCombo = comboId ? it.comboId === comboId : !it.comboId
		if (matchesVariant && matchesCombo) {
			return { ...it, quantity: qty }
		}
		return it
	})
	return saveCart(next)
}

export function removeStoredItem(variantId: string, comboId?: string | null): StoreCartItem[] {
	const currentCart = getStoredCart()
	const next = currentCart.filter((it) => {
		const matchesVariant = it.variantId === variantId
		const matchesCombo = comboId ? it.comboId === comboId : !it.comboId
		return !(matchesVariant && matchesCombo)
	})
	return saveCart(next)
}

export function clearStoredCart(): StoreCartItem[] {
	return saveCart([])
}

// ─── Combos ───────────────────────────────────────────────────────

function generateComboInstanceId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

/**
 * Añade un combo al carrito como una instancia aislada.
 * Cada llamada genera sus propias líneas (los componentes del combo) con un
 * `comboInstanceId` único, por lo que agregar el mismo combo de nuevo suma otra
 * entrada a la lista en lugar de fusionar cantidades. La cantidad siempre es 1.
 */
export function addComboToCart(
	comboId: string,
	comboName: string,
	comboPrice: number,
	componentTotal: number,
	components: Array<{
		productId?: string
		variantId: string
		productName: string
		productSlug?: string
		sku: string
		displayPrice: number
		quantity: number
		imageSrc: string
	}>
): StoreCartItem[] {
	const ratio = componentTotal > 0 ? comboPrice / componentTotal : 1
	const comboInstanceId = generateComboInstanceId()
	const items: StoreCartItem[] = components.map((c) => ({
		productId: c.productId ?? c.variantId,
		productName: c.productName,
		productSlug: c.productSlug ?? '',
		variantId: c.variantId,
		sku: c.sku,
		price: Math.round(c.displayPrice * ratio * 100) / 100,
		quantity: c.quantity,
		imageSrc: c.imageSrc,
		comboId,
		comboName,
		comboInstanceId,
	}))

	const currentCart = getStoredCart()
	currentCart.push(...items)
	return saveCart(currentCart)
}

/**
 * Elimina todas las líneas de una instancia de combo concreta del carrito.
 */
export function removeComboInstanceFromCart(comboInstanceId: string): StoreCartItem[] {
	const currentCart = getStoredCart()
	const next = currentCart.filter((it) => it.comboInstanceId !== comboInstanceId)
	return saveCart(next)
}

