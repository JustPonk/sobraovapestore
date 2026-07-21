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
}

export function getStoredCart() {
	if (typeof window === 'undefined') {
		return [] as StoreCartItem[]
	}

	try {
		const rawCart = window.localStorage.getItem(STORE_CART_KEY)
		if (!rawCart) {
			return [] as StoreCartItem[]
		}

		const parsedCart = JSON.parse(rawCart) as StoreCartItem[]
		return Array.isArray(parsedCart) ? parsedCart : []
	} catch {
		return [] as StoreCartItem[]
	}
}

export function upsertCartItem(item: StoreCartItem) {
	const currentCart = getStoredCart()
	const itemIndex = currentCart.findIndex((currentItem) => currentItem.variantId === item.variantId)

	if (itemIndex >= 0) {
		currentCart[itemIndex] = {
			...currentCart[itemIndex],
			quantity: currentCart[itemIndex].quantity + item.quantity,
		}
	} else {
		currentCart.push(item)
	}

	window.localStorage.setItem(STORE_CART_KEY, JSON.stringify(currentCart))
	window.dispatchEvent(new CustomEvent('sobrao-cart-updated'))

	return currentCart
}
