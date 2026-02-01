import { useQuery } from "@tanstack/react-query";
import { productCategoryCountsQueryOptions } from "~/lib/queryOptions";

/**
 * Hook that returns the total product count by summing all category counts
 *
 * This is efficient because:
 * - Category counts are already fetched for the navigation bar (visible on all pages)
 * - We just sum the existing cached data - no additional query needed
 * - The data is already in TanStack Query cache
 */
function useProductsCountFromCategories(): number {
	const { data: categoryCounts } = useQuery(
		productCategoryCountsQueryOptions(),
	);

	if (!categoryCounts) return 0;

	// Sum all category counts to get total product count
	return Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
}

/**
 * Hook that returns the appropriate search placeholder with product count
 *
 * Shows total product count derived from category counts (already in cache)
 * Works for both dashboard and client/store routes
 */
export function useSearchPlaceholderWithCount() {
	// Get total product count by summing all category counts
	const productsCount = useProductsCountFromCategories();

	// Show count if available, otherwise show simple placeholder
	if (productsCount > 0) {
		return `Искать среди ${productsCount} товаров`;
	}

	// Fallback while counts are loading or if no products
	return "Я ищу...";
}
