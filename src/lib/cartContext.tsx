/**
 * Simplified Cart Context
 *
 * Manages shopping cart state with cookie persistence.
 * - Stores minimal data: productId, variationId, quantity
 * - Product details enriched from TanStack Query cache
 * - Simple validation: check variation requirement only
 * - Invalid items filtered silently in useEnrichedCart
 */

import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { getCookie, setCookie } from "~/lib/cookies";

// Types
/**
 * Enriched CartItem - stores display data in cookie for instant display
 * Refreshes in background if data is older than 7 days
 */
export interface CartItem {
	// Core identifiers
	productId: number;
	variationId?: number;
	quantity: number;
	addedAt: number;

	// Display data (cached in cookie)
	productName: string;
	productSlug: string;
	price: number;
	images?: string | string[] | null;
	discount?: number | null;
	attributes?: Record<string, string>;

	// Staleness tracking
	cachedAt: number;
}

export interface Cart {
	items: CartItem[];
	lastUpdated: number;
}

/**
 * Product data needed when adding to cart
 * This enriches the cart item for instant display without fetching
 */
export interface AddToCartData {
	productId: number;
	quantity: number;
	variationId?: number;
	// Display data for instant cart display
	productName: string;
	productSlug: string;
	price: number;
	images?: string | string[] | null;
	discount?: number | null;
	attributes?: Record<string, string>;
}

interface CartContextType {
	cart: Cart;
	cartOpen: boolean;
	setCartOpen: (open: boolean) => void;
	addToCart: (data: AddToCartData) => void;
	removeFromCart: (productId: number, variationId?: number) => void;
	updateQuantity: (
		productId: number,
		quantity: number,
		variationId?: number,
	) => void;
	clearCart: () => void;
	itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Cookie configuration
const CART_COOKIE_NAME = "bfloor-cart";
const COOKIE_OPTIONS = {
	maxAge: 60 * 60 * 24 * 30, // 30 days
	path: "/",
} as const;

// Helper to get cart from cookie
function getCartFromCookie(): Cart | null {
	if (typeof window === "undefined") return null;

	const stored = getCookie(CART_COOKIE_NAME);
	if (!stored) return null;

	try {
		return JSON.parse(stored);
	} catch {
		return null;
	}
}

// Helper to save cart to cookie
function saveCartToCookie(cart: Cart): void {
	if (typeof window === "undefined") return;
	setCookie(CART_COOKIE_NAME, JSON.stringify(cart), COOKIE_OPTIONS);
}

interface CartProviderProps {
	children: React.ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
	// Initialize cart - try to load from cookie immediately on client
	const [cart, setCart] = useState<Cart>(() => {
		if (typeof window !== "undefined") {
			const saved = getCartFromCookie();
			if (saved) return saved;
		}
		return {
			items: [],
			lastUpdated: Date.now(),
		};
	});

	const [cartOpen, setCartOpen] = useState(false);
	const isInitialMount = useRef(true);

	// Save to cookie whenever cart changes (skip initial mount)
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		saveCartToCookie(cart);
	}, [cart]);

	// Calculate item count from raw cart items
	// Note: This counts all items, even if products are inactive/deleted
	// For accurate count of valid products, use useEnrichedCart in components
	const itemCount = useMemo(
		() => cart.items.reduce((count, item) => count + item.quantity, 0),
		[cart.items],
	);

	// Add item to cart (or update quantity if exists)
	// Stores enriched data for instant display without fetching
	// These functions are stable - they only depend on setCart/setCartOpen which are stable from useState
	const addToCart = useCallback((data: AddToCartData) => {
		setCart((prevCart) => {
			const existingIndex = prevCart.items.findIndex(
				(item) =>
					item.productId === data.productId &&
					item.variationId === data.variationId,
			);

			let newItems: CartItem[];
			const now = Date.now();

			if (existingIndex >= 0) {
				// Update existing item quantity (preserve cached data)
				newItems = [...prevCart.items];
				newItems[existingIndex] = {
					...newItems[existingIndex],
					quantity: newItems[existingIndex].quantity + data.quantity,
					// Update display data in case price/name changed
					productName: data.productName,
					productSlug: data.productSlug,
					price: data.price,
					images: data.images,
					discount: data.discount,
					attributes: data.attributes,
					cachedAt: now,
				};
			} else {
				// Add new item with enriched data
				newItems = [
					...prevCart.items,
					{
						productId: data.productId,
						variationId: data.variationId,
						quantity: data.quantity,
						addedAt: now,
						productName: data.productName,
						productSlug: data.productSlug,
						price: data.price,
						images: data.images,
						discount: data.discount,
						attributes: data.attributes,
						cachedAt: now,
					},
				];
			}

			return {
				items: newItems,
				lastUpdated: now,
			};
		});

		// Open cart drawer
		setCartOpen(true);
		toast.success("Товар добавлен в корзину");
	}, []);

	// Remove item from cart
	const removeFromCart = useCallback((productId: number, variationId?: number) => {
		setCart((prevCart) => ({
			items: prevCart.items.filter(
				(item) =>
					!(item.productId === productId && item.variationId === variationId),
			),
			lastUpdated: Date.now(),
		}));
	}, []);

	// Update item quantity
	const updateQuantity = useCallback((
		productId: number,
		quantity: number,
		variationId?: number,
	) => {
		if (quantity <= 0) {
			removeFromCart(productId, variationId);
			return;
		}

		setCart((prevCart) => ({
			items: prevCart.items.map((item) =>
				item.productId === productId && item.variationId === variationId
					? { ...item, quantity: Math.max(1, quantity) }
					: item,
			),
			lastUpdated: Date.now(),
		}));
	}, [removeFromCart]);

	// Clear cart
	const clearCart = useCallback(() => {
		setCart({
			items: [],
			lastUpdated: Date.now(),
		});
	}, []);

	// Memoize the context value to prevent unnecessary re-renders
	// The functions are now stable (wrapped in useCallback with empty deps)
	// so we can safely include them in dependencies
	const value = useMemo(
		() => ({
			cart,
			cartOpen,
			setCartOpen,
			addToCart,
			removeFromCart,
			updateQuantity,
			clearCart,
			itemCount,
		}),
		[cart, cartOpen, addToCart, removeFromCart, updateQuantity, clearCart, itemCount],
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const context = useContext(CartContext);
	if (context === undefined) {
		throw new Error("useCart must be used within a CartProvider");
	}
	return context;
}
