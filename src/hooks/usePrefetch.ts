/**
 * Prefetch Hook
 *
 * Provides utilities for prefetching data on hover/intent.
 * This improves perceived performance by loading data before navigation.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
	attributeValuesForFilteringQueryOptions,
	categoriesQueryOptions,
	dashboardOrdersQueryOptions,
	filteredBrandsQueryOptions,
	filteredCollectionsQueryOptions,
	productCategoryCountsQueryOptions,
	productQueryOptions,
	storeDataInfiniteQueryOptions,
} from "~/lib/queryOptions";
import { getProductBySlug } from "~/server_functions/dashboard/store/getProductBySlug";

export function usePrefetch() {
	const queryClient = useQueryClient();

	/**
	 * Prefetch a single product by slug (for store product pages)
	 * Use on product card hover
	 */
	const prefetchProduct = useCallback(
		(productSlug: string) => {
			queryClient.prefetchQuery(productQueryOptions(productSlug));
		},
		[queryClient],
	);

	/**
	 * Prefetch dashboard product details by ID (for edit drawer)
	 * Use on dashboard product card hover
	 */
	const prefetchDashboardProduct = useCallback(
		(productId: number) => {
			queryClient.prefetchQuery({
				queryKey: ["bfloorDashboardProduct", productId],
				queryFn: () => getProductBySlug({ data: { id: productId } }),
				staleTime: 1000 * 60 * 5, // 5 minutes
			});
		},
		[queryClient],
	);

	/**
	 * Prefetch store data (all products, categories)
	 * Use on homepage store link hover
	 */
	const prefetchStore = useCallback(() => {
		queryClient.prefetchInfiniteQuery(
			storeDataInfiniteQueryOptions("", {
				categorySlug: null,
				brandSlug: null,
				collectionSlug: null,
				storeLocationId: null,
				attributeFilters: {},
				sort: "relevant",
			}),
		);
	}, [queryClient]);

	/**
	 * Prefetch store data for a specific category
	 * Use on category link hover in navigation dropdown
	 * Only prefetches products, NOT filter options (those prefetch on filters button hover)
	 */
	const prefetchStoreWithCategory = useCallback(
		(categorySlug: string) => {
			// Prefetch products for this category
			// Pass empty string for search (will normalize to "" in query key)
			// Pass explicit undefined for optional filters (will normalize to null in query key)
			// IMPORTANT: Must use "best-selling" as default sort to match StoreProductGrid default
			// This matches the default state when navigating to a category page
			queryClient.prefetchInfiniteQuery(
				storeDataInfiniteQueryOptions("", {
					categorySlug,
					brandSlug: undefined,
					collectionSlug: undefined,
					storeLocationId: undefined,
					attributeFilters: {},
					minPrice: undefined,
					maxPrice: undefined,
					sort: "best-selling", // Must match defaultStoreSearchValues.sort
				}),
			);
		},
		[queryClient],
	);

	/**
	 * Prefetch filter options for the current category
	 * Use on filters button hover on store page
	 * Only fetches what's needed for the active filters
	 */
	const prefetchFilterOptions = useCallback(
		(
			categorySlug?: string,
			brandSlug?: string,
			collectionSlug?: string,
			attributeFilters?: Record<number, string[]>,
		) => {
			// Prefetch filter options based on current context
			queryClient.prefetchQuery(
				filteredBrandsQueryOptions(categorySlug, collectionSlug, undefined),
			);
			queryClient.prefetchQuery(
				filteredCollectionsQueryOptions(categorySlug, brandSlug, undefined),
			);
			queryClient.prefetchQuery(
				attributeValuesForFilteringQueryOptions(
					categorySlug,
					brandSlug,
					collectionSlug,
					attributeFilters,
				),
			);
		},
		[queryClient],
	);

	/**
	 * Prefetch store catalog page (categories + counts)
	 * Use on catalog button hover - /store is now a category picker, not all products
	 */
	const prefetchStoreCatalog = useCallback(() => {
		queryClient.prefetchQuery(categoriesQueryOptions());
		queryClient.prefetchQuery(productCategoryCountsQueryOptions());
	}, [queryClient]);

	/**
	 * Prefetch dashboard orders
	 * Use on dashboard navigation link hover
	 */
	const prefetchDashboardOrders = useCallback(() => {
		queryClient.prefetchQuery(dashboardOrdersQueryOptions());
	}, [queryClient]);

	return {
		prefetchProduct,
		prefetchDashboardProduct,
		prefetchStore,
		prefetchStoreWithCategory,
		prefetchStoreCatalog,
		prefetchFilterOptions,
		prefetchDashboardOrders,
	};
}
