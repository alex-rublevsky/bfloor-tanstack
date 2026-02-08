/**
 * Query Options Factory
 *
 * Centralized query configuration for TanStack Query.
 * This ensures consistent caching, staleTime, and query keys across the app.
 *
 * Benefits:
 * - Single source of truth for query configuration
 * - Type-safe query options
 * - Easy to reuse in loaders, prefetching, and components
 * - Consistent cache keys prevent duplicate fetches
 */

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import type { StoreLocation } from "~/data/storeLocations";
import { getAllStoreLocations } from "~/data/storeLocations";
import { getAllAttributeValuesByAttribute } from "~/server_functions/dashboard/attributes/getAllAttributeValuesByAttribute";
import { getAllProductAttributes } from "~/server_functions/dashboard/attributes/getAllProductAttributes";
import { getAttributeValues } from "~/server_functions/dashboard/attributes/getAttributeValues";
import { getProductBrandCounts } from "~/server_functions/dashboard/brands/getProductBrandCounts";
import { getAllProductCategories } from "~/server_functions/dashboard/categories/getAllProductCategories";
import { getProductCategoryCounts } from "~/server_functions/dashboard/categories/getProductCategoryCounts";
import { getAllCollections } from "~/server_functions/dashboard/collections/getAllCollections";
import { getProductCollectionCounts } from "~/server_functions/dashboard/collections/getProductCollectionCounts";
import { getAllBrands } from "~/server_functions/dashboard/getAllBrands";
import { getAllOrders } from "~/server_functions/dashboard/orders/getAllOrders";
import { getAllFilterOptionsDashboard } from "~/server_functions/dashboard/store/getAllFilterOptions";
import { getAllProducts } from "~/server_functions/dashboard/store/getAllProducts";
import { getProductBySlug as getDashboardProductBySlug } from "~/server_functions/dashboard/store/getProductBySlug";
import { getAllFilterOptions } from "~/server_functions/store/getAllFilterOptions";
import { getStoreData } from "~/server_functions/store/getAllProducts";
import { getBrandBySlug } from "~/server_functions/store/getBrandBySlug";
import { getCategoryBySlug } from "~/server_functions/store/getCategoryBySlug";
import { getProductBySlug } from "~/server_functions/store/getProductBySlug";
import { getProductDetailsBySlug } from "~/server_functions/store/getProductDetailsBySlug";
import { getRecommendedProducts } from "~/server_functions/store/getRecommendedProducts";
import type { ProductWithDetails } from "~/types";
import { getUserData } from "~/utils/auth-server-func";

// Type for paginated response from getStoreData and getAllProducts
type PaginatedResponse = {
	products: unknown[];
	pagination?: {
		page: number;
		limit: number;
		totalCount?: number;
		totalPages?: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
};

/**
 * Store data infinite query options
 * Used for: /store route with virtualized infinite scroll
 *
 * Cache Strategy: Optimized for infinite scrolling with aggressive caching
 * - Each page cached per filter combination for 3 days
 * - Infinite query with 50 products per page
 * - Perfect for virtualizer implementation
 * - Server-side filtering (same as dashboard)
 */
export const storeDataInfiniteQueryOptions = (
	search?: string,
	filters?: {
		categorySlug?: string | null;
		brandSlugs?: string[] | null; // Multi-select: array of brand slugs
		collectionSlugs?: string[] | null; // Multi-select: array of collection slugs
		storeLocationId?: number | null;
		attributeFilters?: Record<number, string[]>; // attributeId -> array of value IDs
		minPrice?: number | null;
		maxPrice?: number | null;
		sort?:
			| "name"
			| "price-asc"
			| "price-desc"
			| "newest"
			| "oldest"
			| "best-selling";
	},
) =>
	infiniteQueryOptions({
		queryKey: [
			"bfloorStoreDataInfinite",
			{
				search: search ?? "",
				categorySlug: filters?.categorySlug ?? null,
				brandSlugs: JSON.stringify(filters?.brandSlugs ?? []),
				collectionSlugs: JSON.stringify(filters?.collectionSlugs ?? []),
				storeLocationId: filters?.storeLocationId ?? null,
				attributeFilters: JSON.stringify(filters?.attributeFilters ?? {}),
				minPrice: filters?.minPrice ?? null,
				maxPrice: filters?.maxPrice ?? null,
				sort: filters?.sort ?? "best-selling",
			},
		],
		queryFn: ({ pageParam = 1 }) =>
			getStoreData({
				data: {
					page: pageParam as number,
					limit: 30,
					search,
					categorySlug: filters?.categorySlug ?? undefined,
					brandSlugs: filters?.brandSlugs ?? undefined,
					collectionSlugs: filters?.collectionSlugs ?? undefined,
					storeLocationId: filters?.storeLocationId ?? undefined,
					attributeFilters: filters?.attributeFilters ?? undefined,
					minPrice: filters?.minPrice ?? undefined,
					maxPrice: filters?.maxPrice ?? undefined,
					sort: filters?.sort ?? undefined,
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - products cached aggressively
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			// Simple: return next page number if there's a next page
			return lastPage?.pagination?.hasNextPage
				? lastPage.pagination.page + 1
				: undefined;
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			// Simple: return previous page number if there's a previous page
			return firstPage?.pagination?.hasPreviousPage
				? firstPage.pagination.page - 1
				: undefined;
		},
	});

/**
 * =============================================================================
 * UNIFIED FILTER OPTIONS (REPLACES OLD SEPARATE FILTER QUERIES)
 * =============================================================================
 * Single query that returns ALL filter options (brands, collections, store locations, attributes)
 * This replaces the separate queries above with a unified, consistent approach.
 */

/**
 * All filter options query (Store version - active products only)
 * Used for: Store pages to show all available filter options in a single request
 *
 * Cache Strategy: Moderate caching for filter-dependent data
 * - Filter options cached for 3 days per filter combination
 * - Kept in memory for 7 days
 * - Query key includes all filters so cache invalidates when filters change
 *
 * Benefits over separate queries:
 * - Single API call instead of 4 (2-3x faster)
 * - Guaranteed consistency (all filters use same product set)
 * - All filters adapt to ALL other filters (including attributes)
 * - Better cache hit rate (single cache entry per filter combination)
 */
export const allFilterOptionsQueryOptions = (
	categorySlug?: string,
	brandSlugs?: string[], // Multi-select: array of brand slugs
	collectionSlugs?: string[], // Multi-select: array of collection slugs
	storeLocationId?: number,
	attributeFilters?: Record<number, string[]>,
) =>
	queryOptions({
		queryKey: [
			"allFilterOptions",
			{
				categorySlug: categorySlug ?? null,
				brandSlugs: JSON.stringify(brandSlugs ?? []),
				collectionSlugs: JSON.stringify(collectionSlugs ?? []),
				storeLocationId: storeLocationId ?? null,
				attributeFilters: JSON.stringify(attributeFilters ?? {}),
			},
		],
		queryFn: async () =>
			getAllFilterOptions({
				data: {
					categorySlug,
					brandSlugs,
					collectionSlugs,
					storeLocationId,
					attributeFilters,
					includeInactive: false,
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - filter-dependent data
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * All filter options query (Dashboard version - includes inactive products)
 * Used for: Dashboard pages to show all available filter options in a single request
 *
 * Cache Strategy: Moderate caching for filter-dependent data
 * - Filter options cached for 3 days per filter combination
 * - Kept in memory for 7 days
 * - Query key includes all filters so cache invalidates when filters change
 */
export const allFilterOptionsDashboardQueryOptions = (
	categorySlug?: string,
	brandSlugs?: string[], // Multi-select: array of brand slugs
	collectionSlugs?: string[], // Multi-select: array of collection slugs
	storeLocationId?: number,
	attributeFilters?: Record<number, string[]>,
) =>
	queryOptions({
		queryKey: [
			"allFilterOptionsDashboard",
			{
				categorySlug: categorySlug ?? null,
				brandSlugs: JSON.stringify(brandSlugs ?? []),
				collectionSlugs: JSON.stringify(collectionSlugs ?? []),
				storeLocationId: storeLocationId ?? null,
				attributeFilters: JSON.stringify(attributeFilters ?? {}),
			},
		],
		queryFn: async () =>
			getAllFilterOptionsDashboard({
				data: {
					categorySlug,
					brandSlugs,
					collectionSlugs,
					storeLocationId,
					attributeFilters,
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - filter-dependent data
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Product by slug query options
 * Used for: /product/$productId route and prefetching individual products
 *
 * OPTIMIZED CACHING STRATEGY:
 * This function implements a smart caching strategy that minimizes database queries:
 *
 * 1. If product is already cached (from list views like getAllProducts/getStoreData):
 *    - Uses getProductDetailsBySlug to fetch only product details (no variations)
 *    - Merges with cached product, preserving cached variations
 *    - Why? Variations are often already in cache from list views, so we avoid re-fetching
 *
 * 2. If product is NOT cached (direct navigation to product page):
 *    - Uses getProductBySlug to fetch complete product data including variations
 *    - Why? We need everything, so fetch it all in one go
 *
 * Benefits:
 * - Reduces database queries when navigating from list → detail pages
 * - Different cache keys allow both "full product" and "product details" to coexist
 * - Variations are only fetched once (from list view), then reused
 *
 * Cache Settings:
 * - Individual products cached for 3 days
 * - Cached in memory for 7 days
 * - Perfect for product detail pages
 */
/**
 * Merge cached product with fresh details
 *
 * OPTIMIZED MERGE STRATEGY:
 * - Uses cached product as base (includes variations already parsed from list view)
 * - Overwrites with details (includes parsed images/attributes from getProductDetailsBySlug)
 * - Preserves variations from cache (avoids re-parsing, already optimized)
 *
 * Performance: O(n) object spread where n ≈ 20-30 properties (~0.01ms)
 * This is already optimal - object spread is the fastest way to merge objects in JS
 */
const mergeCachedProductWithDetails = (
	cachedProduct: ProductWithDetails,
	details: ProductWithDetails,
): ProductWithDetails => ({
	...cachedProduct,
	...details,
	// Preserve variations from cache if they exist (already parsed from list view)
	// Only use details.variations if cache has none (shouldn't happen, but defensive)
	// This avoids re-parsing variations that are already in cache
	variations:
		cachedProduct.variations && cachedProduct.variations.length > 0
			? cachedProduct.variations
			: details.variations,
});

export const productQueryOptions = (
	productId: string,
	cachedProduct?: ProductWithDetails | null,
) =>
	queryOptions<ProductWithDetails>({
		queryKey: ["bfloorProduct", productId],
		queryFn: async (): Promise<ProductWithDetails> => {
			try {
				if (cachedProduct) {
					// Product is in cache - fetch only details (no variations) and merge
					// This is more efficient since variations are already cached from list view
					const details = (await getProductDetailsBySlug({
						data: productId,
					})) as ProductWithDetails;
					return mergeCachedProductWithDetails(cachedProduct, details);
				}
				// Product not in cache - fetch everything including variations
				return (await getProductBySlug({
					data: productId,
				})) as ProductWithDetails;
			} catch (error) {
				if (error instanceof Error && error.message === "Product not found") {
					throw notFound();
				}
				throw error;
			}
		},
		retry: false, // Don't retry on error - fail fast for 404s
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - products cached aggressively
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Dashboard product by ID query options
 * Used for: /dashboard/products/$productId/edit route
 *
 * Cache Strategy: Moderate caching for edit pages
 * - Product cached for 5 minutes (fresh for editing)
 * - Kept in memory for 1 day
 * - Manual invalidation after product updates
 */
export const dashboardProductQueryOptions = (productId: number) =>
	queryOptions({
		queryKey: ["bfloorDashboardProduct", productId],
		queryFn: async () => getDashboardProductBySlug({ data: { id: productId } }),
		staleTime: 1000 * 60 * 60, // 1 hour - fresh for editing (increased from 5 minutes)
		gcTime: 1000 * 60 * 60 * 24 * 3, // 3 days - keep in memory (increased from 1 day)
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Dashboard orders query options
 * Used for: /dashboard/orders route
 *
 * Cache Strategy: Moderate caching for dynamic data
 * - Orders cached for 1 day (more dynamic than products but still cacheable)
 * - Kept in memory for 3 days
 * - Refetches on window focus to show latest orders
 * - Manual invalidation after order status updates
 */
export const dashboardOrdersQueryOptions = (limit = 50, offset = 0) =>
	queryOptions({
		queryKey: ["bfloorDashboardOrders", { limit, offset }],
		queryFn: async () => getAllOrders({ data: { limit, offset } }),
		staleTime: 1000 * 60 * 60 * 24, // 1 day - orders are dynamic but cacheable
		gcTime: 1000 * 60 * 60 * 24 * 3, // 3 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: true, // Refetch when returning to dashboard
		refetchOnMount: false,
		refetchOnReconnect: true,
	});

/**
 * Dashboard products infinite query options
 * Used for: /dashboard route with virtualized product grid
 *
 * Cache Strategy: Optimized for infinite scrolling with aggressive caching
 * - Each page cached for 3 days
 * - Infinite query with 20 products per page
 * - Perfect for virtualizer implementation
 * - Background refetching for fresh data
 */
export const productsInfiniteQueryOptions = (
	search?: string,
	filters?: {
		categorySlug?: string | null;
		brandSlugs?: string[] | null; // Multi-select: array of brand slugs
		collectionSlugs?: string[] | null; // Multi-select: array of collection slugs
		storeLocationId?: number | null;
		attributeFilters?: Record<number, string[]>; // attributeId -> array of value IDs
		minPrice?: number | null;
		maxPrice?: number | null;
		sort?:
			| "name"
			| "price-asc"
			| "price-desc"
			| "newest"
			| "oldest"
			| "best-selling"
			| "views-asc"
			| "category-asc"
			| "category-desc"
			| "brand-asc"
			| "brand-desc";
	},
) =>
	infiniteQueryOptions({
		queryKey: [
			"bfloorDashboardProductsInfinite",
			{
				search: search ?? "",
				categorySlug: filters?.categorySlug ?? null,
				brandSlugs: JSON.stringify(filters?.brandSlugs ?? []),
				collectionSlugs: JSON.stringify(filters?.collectionSlugs ?? []),
				storeLocationId: filters?.storeLocationId ?? null,
				attributeFilters: JSON.stringify(filters?.attributeFilters ?? {}),
				minPrice: filters?.minPrice ?? null,
				maxPrice: filters?.maxPrice ?? null,
				sort: filters?.sort ?? "name",
			},
		],
		queryFn: ({ pageParam = 1 }) =>
			getAllProducts({
				data: {
					page: pageParam as number,
					limit: 30,
					search,
					categorySlug: filters?.categorySlug ?? undefined,
					brandSlugs: filters?.brandSlugs ?? undefined,
					collectionSlugs: filters?.collectionSlugs ?? undefined,
					storeLocationId: filters?.storeLocationId ?? undefined,
					attributeFilters: filters?.attributeFilters ?? undefined,
					minPrice: filters?.minPrice ?? undefined,
					maxPrice: filters?.maxPrice ?? undefined,
					sort: filters?.sort ?? undefined,
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - products cached aggressively
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		// Note: Query will be manually invalidated via refetch() after product updates
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			// Simple and clean: if there's a next page, return next page number
			return lastPage?.pagination?.hasNextPage
				? lastPage.pagination.page + 1
				: undefined;
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			// Simple and clean: if there's a previous page, return previous page number
			return firstPage?.pagination?.hasPreviousPage
				? firstPage.pagination.page - 1
				: undefined;
		},
	});

export const dashboardProductsInfiniteQueryOptions = (pageSize: number = 20) =>
	infiniteQueryOptions({
		queryKey: ["bfloorDashboardProductsInfinite", pageSize],
		queryFn: async ({ pageParam = 1 }) => {
			return await getAllProducts({
				data: {
					page: pageParam as number,
					limit: pageSize,
				},
			});
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			try {
				// Completely defensive - check absolutely everything
				if (!lastPage || typeof lastPage !== "object") return undefined;
				if (!lastPage.pagination || typeof lastPage.pagination !== "object")
					return undefined;
				if (lastPage.pagination.hasNextPage !== true) return undefined;
				if (typeof lastPage.pagination.page !== "number") return undefined;
				return lastPage.pagination.page + 1;
			} catch {
				return undefined;
			}
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			try {
				// Completely defensive - check absolutely everything
				if (!firstPage || typeof firstPage !== "object") return undefined;
				if (!firstPage.pagination || typeof firstPage.pagination !== "object")
					return undefined;
				if (firstPage.pagination.hasPreviousPage !== true) return undefined;
				if (typeof firstPage.pagination.page !== "number") return undefined;
				return firstPage.pagination.page - 1;
			} catch {
				return undefined;
			}
		},
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - products cached aggressively
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
		refetchOnMount: false,
		maxPages: 10, // Limit to prevent memory issues
	});

/**
 * =============================================================================
 * REFERENCE DATA QUERIES (Brands, Collections, Categories, Store Locations)
 * =============================================================================
 * These are static/semi-static data that rarely change.
 * Aggressive caching strategy: 7-day stale time, 14-day garbage collection
 */

/**
 * Brands query options
 * Used for: All routes that need brand data
 *
 * Cache Strategy: Maximum caching for static data
 * - Brands cached for 7 days (very static)
 * - Kept in memory for 14 days
 * - No automatic refetching
 */
export const brandsQueryOptions = () =>
	queryOptions({
		queryKey: ["bfloorBrands"],
		queryFn: async () => getAllBrands(),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - brands rarely change
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Collections query options
 * Used for: All routes that need collection data
 *
 * Cache Strategy: Maximum caching for static data
 * - Collections cached for 7 days (very static)
 * - Kept in memory for 14 days
 * - No automatic refetching
 */
export const collectionsQueryOptions = () =>
	queryOptions({
		queryKey: ["bfloorCollections"],
		queryFn: async () => getAllCollections(),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - collections rarely change
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Categories query options
 * Used for: All routes that need category data
 *
 * Cache Strategy: Maximum caching for static data
 * - Categories cached for 7 days (very static)
 * - Kept in memory for 14 days
 * - No automatic refetching
 */
export const categoriesQueryOptions = () =>
	queryOptions({
		queryKey: ["bfloorCategories"],
		queryFn: async () => getAllProductCategories(),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - categories rarely change
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Category by slug query options
 * Used for: /store/$categorySlug route for category validation and meta tags
 *
 * Cache Strategy: Maximum caching for static data
 * - Category cached for 7 days (very static)
 * - Kept in memory for 14 days
 * - No automatic refetching
 */
export const categoryQueryOptions = (categorySlug: string) =>
	queryOptions({
		queryKey: ["category", categorySlug],
		queryFn: async () => {
			try {
				return await getCategoryBySlug({ data: categorySlug });
			} catch (error) {
				// Convert "Category not found" error to notFound() for proper 404 handling
				if (error instanceof Error && error.message === "Category not found") {
					throw notFound();
				}
				throw error;
			}
		},
		retry: false, // Don't retry on error - fail fast for 404s
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - categories rarely change
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Brand by slug query options
 * Used for: /store/$categorySlug route when slug resolves to a brand (category takes precedence)
 *
 * Cache Strategy: Maximum caching for static data
 * - Brand cached for 7 days (very static)
 * - Kept in memory for 14 days
 * - No automatic refetching
 */
export const brandQueryOptions = (brandSlug: string) =>
	queryOptions({
		queryKey: ["brand", brandSlug],
		queryFn: async () => {
			try {
				return await getBrandBySlug({ data: brandSlug });
			} catch (error) {
				if (error instanceof Error && error.message === "Brand not found") {
					throw notFound();
				}
				throw error;
			}
		},
		retry: false, // Don't retry on error - fail fast for 404s
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - brands rarely change
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Product Attributes query options (without counts - fast)
 * Used for: All routes that need attribute data
 *
 * Cache Strategy: Maximum caching for static data
 * - Attributes cached for 7 days (very static)
 * - Kept in memory for 14 days
 * - No automatic refetching
 */
export const productAttributesQueryOptions = () =>
	queryOptions({
		queryKey: ["productAttributes"],
		queryFn: async () => getAllProductAttributes(),
		staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days - attributes rarely change (increased from 7)
		gcTime: 1000 * 60 * 60 * 24 * 60, // 60 days - keep in memory (increased from 14)
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Product Brand Counts query options (uses SQL COUNT - efficient)
 * Used for: /dashboard/brands route for streaming counts
 *
 * Cache Strategy: Aggressive caching for counts
 * - Counts cached for 2 weeks (counts change when products change, but still relatively static)
 * - Kept in memory for 24 days (max safe 32-bit timeout value)
 * - No automatic refetching
 */
export const productBrandCountsQueryOptions = () =>
	queryOptions({
		queryKey: ["productBrandCounts"],
		queryFn: async () => getProductBrandCounts(),
		staleTime: 1000 * 60 * 60 * 24 * 14, // 2 weeks - counts are relatively static
		gcTime: 1000 * 60 * 60 * 24 * 24, // 24 days - keep in memory (max safe 32-bit value)
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Product Category Counts query options (uses SQL COUNT - efficient)
 * Used for: Home page catalog dropdown for streaming counts
 *
 * Cache Strategy: Aggressive caching for counts
 * - Counts cached for 2 weeks (counts change when products change, but still relatively static)
 * - Kept in memory for 24 days (max safe 32-bit timeout value)
 * - No automatic refetching
 */
export const productCategoryCountsQueryOptions = () =>
	queryOptions({
		queryKey: ["productCategoryCounts"],
		queryFn: async () => getProductCategoryCounts(),
		staleTime: 1000 * 60 * 60 * 24 * 14, // 2 weeks - counts are relatively static
		gcTime: 1000 * 60 * 60 * 24 * 24, // 24 days - keep in memory (max safe 32-bit value)
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Product Collection Counts query options (uses SQL COUNT - efficient)
 * Used for: /dashboard/collections route for streaming counts
 *
 * Cache Strategy: Aggressive caching for counts
 * - Counts cached for 2 weeks (counts change when products change, but still relatively static)
 * - Kept in memory for 24 days (max safe 32-bit timeout value)
 * - No automatic refetching
 */
export const productCollectionCountsQueryOptions = () =>
	queryOptions({
		queryKey: ["productCollectionCounts"],
		queryFn: async () => getProductCollectionCounts(),
		staleTime: 1000 * 60 * 60 * 24 * 14, // 2 weeks - counts are relatively static
		gcTime: 1000 * 60 * 60 * 24 * 24, // 24 days - keep in memory (max safe 32-bit value)
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * All attribute values grouped by attribute ID query options
 * Used for: Attributes dashboard page to show standardized values
 *
 * Cache Strategy: Aggressive caching for semi-static data
 * - Attribute values cached for 7 days (more dynamic than attributes but still cacheable)
 * - Kept in memory for 14 days
 */
export const allAttributeValuesByAttributeQueryOptions = () =>
	queryOptions({
		queryKey: ["attributeValuesByAttribute"],
		queryFn: async () => getAllAttributeValuesByAttribute(),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - values change but still cacheable
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Attribute values for a specific attribute query options
 * Used for: Editing attribute values in the attribute form
 *
 * Cache Strategy: Short caching for form data (but increased gcTime)
 * - Values cached for 5 minutes (fresh for editing)
 * - Kept in memory for 1 day (for quick access)
 */
export const attributeValuesQueryOptions = (attributeId: number) =>
	queryOptions({
		queryKey: ["attributeValues", attributeId],
		queryFn: async () => getAttributeValues({ data: { attributeId } }),
		staleTime: 1000 * 60 * 5, // 5 minutes - fresh for editing
		gcTime: 1000 * 60 * 60 * 24, // 1 day - keep in memory for quick access
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Products by tag query options
 * Used for: ProductSlider component on home page
 *
 * Cache Strategy: Extremely aggressive caching
 * - Products by tag cached for 7 days (extremely cached)
 * - Kept in memory for 14 days
 * - No automatic refetching
 * - Perfect for prefetching all tags on mount
 */
export const productsByTagQueryOptions = (tag: string) =>
	queryOptions({
		queryKey: ["bfloorProductsByTag", tag],
		queryFn: async () =>
			getAllProducts({
				data: {
					tag,
					sort: "name",
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - extremely cached
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Discounted products query options
 * Used for: ProductSlider component (simple mode) on home page
 *
 * Cache Strategy: Extremely aggressive caching
 * - Discounted products cached for 7 days (extremely cached)
 * - Kept in memory for 14 days
 * - No automatic refetching
 * - Perfect for home page carousel
 */
export const discountedProductsQueryOptions = () =>
	queryOptions({
		queryKey: ["bfloorDiscountedProducts"],
		queryFn: async () =>
			getAllProducts({
				data: {
					hasDiscount: true,
					sort: "name",
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - extremely cached
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

/**
 * Products by tag infinite query options
 * Used for: ProductSlider component with pagination and infinite scrolling
 *
 * Cache Strategy: Optimized for infinite scrolling with aggressive caching
 * - Each page cached for 3 days
 * - Infinite query with 20 products per page
 * - Perfect for carousel implementation with progressive loading
 */
export const productsByTagInfiniteQueryOptions = (tag: string) =>
	infiniteQueryOptions({
		queryKey: ["bfloorProductsByTagInfinite", tag],
		queryFn: ({ pageParam = 1 }) =>
			getAllProducts({
				data: {
					tag,
					page: pageParam as number,
					limit: 10, // Smaller page size for carousel
					sort: "name",
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - products cached aggressively
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			return lastPage?.pagination?.hasNextPage
				? lastPage.pagination.page + 1
				: undefined;
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			return firstPage?.pagination?.hasPreviousPage
				? firstPage.pagination.page - 1
				: undefined;
		},
	});

/**
 * =============================================================================
 * TOTAL COUNT QUERIES (for navigation/search placeholders)
 * =============================================================================
 * These are efficient COUNT queries used in navigation/search placeholders
 * that are visible on all pages. Using SQL COUNT instead of fetching all records.
 * Aggressive caching: 3-7 days stale time, 7-14 days garbage collection
 */

/**
 * Discounted products infinite query options
 * Used for: ProductSlider component (simple mode) with pagination and infinite scrolling
 *
 * Cache Strategy: Optimized for infinite scrolling with aggressive caching
 * - Each page cached for 3 days
 * - Infinite query with 20 products per page
 * - Perfect for carousel implementation with progressive loading
 */
export const discountedProductsInfiniteQueryOptions = () =>
	infiniteQueryOptions({
		queryKey: ["bfloorDiscountedProductsInfinite"],
		queryFn: ({ pageParam = 1 }) =>
			getAllProducts({
				data: {
					hasDiscount: true,
					page: pageParam as number,
					limit: 12,
					sort: "name",
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 3, // 3 days - products cached aggressively
		gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			return lastPage?.pagination?.hasNextPage
				? lastPage.pagination.page + 1
				: undefined;
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			return firstPage?.pagination?.hasPreviousPage
				? firstPage.pagination.page - 1
				: undefined;
		},
	});

/**
 * Recommended products infinite query options
 * Used for: ProductSlider component (recommended mode) - shows featured products
 *
 * Cache Strategy: EXTREME caching for static-like data
 * - Each page cached for 30 days (recommended products change rarely)
 * - Infinite query with 20 products per page
 * - Perfect for carousel implementation with progressive loading
 * - Uses dedicated getRecommendedProducts server function (optimized for featured products)
 */
export const recommendedProductsInfiniteQueryOptions = () =>
	infiniteQueryOptions({
		queryKey: ["bfloorRecommendedProductsInfinite"],
		queryFn: ({ pageParam = 1 }) =>
			getRecommendedProducts({
				data: {
					page: pageParam as number,
					limit: 12,
				},
			}),
		staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days - extreme caching for static-like data
		gcTime: 1000 * 60 * 60 * 24 * 24, // 24 days - keep in memory (max safe 32-bit value)
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false, // Don't refetch on reconnect (static data)
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			return lastPage?.pagination?.hasNextPage
				? lastPage.pagination.page + 1
				: undefined;
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			return firstPage?.pagination?.hasPreviousPage
				? firstPage.pagination.page - 1
				: undefined;
		},
	});

/**
 * Recently visited products infinite query options
 * Used for: ProductSlider component (recommended mode) - shows recently visited products
 *
 * Cache Strategy: Short caching since this is user-specific data
 * - Each page cached for 5 minutes (user-specific, changes frequently)
 * - Infinite query with 20 products per page
 * - Perfect for carousel implementation with progressive loading
 */
export const recentlyVisitedProductsInfiniteQueryOptions = (
	productIds: number[],
) =>
	infiniteQueryOptions({
		queryKey: ["bfloorRecentlyVisitedProductsInfinite", productIds],
		queryFn: ({ pageParam = 1 }) =>
			getAllProducts({
				data: {
					productIds,
					page: pageParam as number,
					limit: 12,
					sort: "newest", // Show most recently visited first
				},
			}),
		staleTime: 1000 * 60 * 5, // 5 minutes - user-specific data changes frequently
		gcTime: 1000 * 60 * 60, // 1 hour - keep in memory
		retry: 3,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		enabled: productIds.length > 0, // Only run if we have product IDs
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse) => {
			return lastPage?.pagination?.hasNextPage
				? lastPage.pagination.page + 1
				: undefined;
		},
		getPreviousPageParam: (firstPage: PaginatedResponse) => {
			return firstPage?.pagination?.hasPreviousPage
				? firstPage.pagination.page - 1
				: undefined;
		},
	});

/**
 * User data query options
 * Used for: NavBar and any component that needs authenticated user data
 *
 * Cache Strategy: Moderate caching for user data
 * - User data cached for 5 minutes (fresh enough for UI, avoids excessive calls)
 * - Kept in memory for 1 hour
 * - Refetches on window focus to keep data fresh
 * - Only fetches when user is authenticated (handled by server function)
 */
export const userDataQueryOptions = () =>
	queryOptions({
		queryKey: ["userData"],
		queryFn: async () => {
			const data = await getUserData();
			// Return null if not authenticated to distinguish from loading state
			if (!data.isAuthenticated) {
				return null;
			}
			return {
				userID: data.userID || "",
				userName: data.userName || "",
				userEmail: data.userEmail || "",
				userAvatar: data.userAvatar || "",
				isAdmin: data.isAdmin || false,
			};
		},
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - user data is relatively stable
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		retry: false, // Don't retry auth failures
		refetchOnWindowFocus: false, // Refetch when returning to app
		refetchOnMount: false, // Don't refetch on every mount if data is fresh
	});

/**
 * Store locations query options
 * Used for: Contact page and other pages that need store location data
 *
 * Cache Strategy: Long-term caching for static data
 * - Store locations cached for 7 days (rarely change)
 * - Kept in memory for 14 days
 * - Perfect for contact pages and location selectors
 */
export const storeLocationsQueryOptions = () =>
	queryOptions<StoreLocation[]>({
		queryKey: ["storeLocations"],
		queryFn: async () => {
			return getAllStoreLocations();
		},
		staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - store locations rarely change
		gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep in memory
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
