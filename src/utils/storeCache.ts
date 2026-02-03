import type { QueryClient } from "@tanstack/react-query";
import type { ProductWithVariations } from "~/types";

type StoreCacheEntry = {
	cacheKey: string;
	products: ProductWithVariations[];
};

const storeCacheByClient = new WeakMap<QueryClient, StoreCacheEntry>();

/**
 * Get all products from infinite query caches
 * Aggregates products from all infinite queries (store, carousels, etc.)
 */
export const getStoreProductsFromInfiniteCache = (
	queryClient: QueryClient,
): ProductWithVariations[] => {
	const allProductQueries = queryClient.getQueryCache().findAll({
		predicate: (query) => {
			const key = query.queryKey[0];
			return (
				typeof key === "string" &&
				(key === "bfloorStoreDataInfinite" ||
					key === "bfloorProductsByTagInfinite" ||
					key === "bfloorDiscountedProductsInfinite" ||
					key === "bfloorRecentlyVisitedProductsInfinite" ||
					key === "bfloorDashboardProductsInfinite")
			);
		},
	});

	const cacheKey = allProductQueries
		.map((query) => `${query.queryHash}:${query.state.dataUpdatedAt ?? 0}`)
		.sort()
		.join("|");

	const cached = storeCacheByClient.get(queryClient);
	if (cached && cached.cacheKey === cacheKey) {
		return cached.products;
	}

	const productMap = new Map<number, ProductWithVariations>();

	for (const query of allProductQueries) {
		const data = query.state.data as
			| { pages?: Array<{ products?: ProductWithVariations[] }> }
			| undefined;
		if (!data?.pages?.length) continue;

		for (const page of data.pages) {
			for (const product of page.products ?? []) {
				if (product?.id) {
					productMap.set(product.id, product);
				}
			}
		}
	}

	const products = Array.from(productMap.values());
	storeCacheByClient.set(queryClient, { cacheKey, products });
	return products;
};
