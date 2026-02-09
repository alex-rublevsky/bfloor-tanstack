/**
 * useEnrichedCart Hook (Ultra-Simplified for Catalog Site)
 *
 * Cart items already have all display data from cookie.
 * Since this is a catalog site (no payment), we just return items as-is.
 * No fetching, no staleness checks, no complexity - just instant display!
 */

import type { CartItem } from "~/lib/cartContext";

/**
 * Enriched cart item = CartItem (which already has all display data!)
 */
export interface EnrichedCartItem extends CartItem {
	productName: string;
	productSlug: string;
	price: number;
	images?: string | string[] | null;
	attributes?: Record<string, string>;
	discount?: number | null;
	squareMetersPerPack?: number | null;
}

/**
 * Returns cart items with display data.
 * Items are stored with all necessary data in cookie, so we just return them!
 */
export function useEnrichedCart(cartItems: CartItem[]): EnrichedCartItem[] {
	// Cart items already have all display data from cookie
	// Just return them - no fetching, no complexity!
	return cartItems.filter(
		(item): item is EnrichedCartItem => !!item.productName,
	);
}
