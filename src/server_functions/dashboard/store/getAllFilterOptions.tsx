/**
 * Dashboard version of getAllFilterOptions
 *
 * This is a simple wrapper that calls the store version with includeInactive: true
 * to include inactive products in filter options for the dashboard.
 */

import { createServerFn } from "@tanstack/react-start";
import type { FilterOptions } from "~/server_functions/store/getAllFilterOptions";
import { getAllFilterOptions as getStoreFilterOptions } from "~/server_functions/store/getAllFilterOptions";

export const getAllFilterOptionsDashboard = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data: {
				categorySlug?: string;
				brandSlugs?: string[]; // Multi-select: array of brand slugs
				collectionSlugs?: string[]; // Multi-select: array of collection slugs
				storeLocationId?: number;
				attributeFilters?: Record<number, string[]>;
			} = {},
		) => data,
	)
	.handler(async ({ data = {} }): Promise<FilterOptions> => {
		// Call store version with includeInactive: true
		return getStoreFilterOptions({
			data: {
				...data,
				includeInactive: true, // Dashboard includes inactive products
			},
		});
	});

// Re-export types for convenience
export type {
	AttributeFilter,
	AttributeFilterValue,
	FilterOptions,
} from "~/server_functions/store/getAllFilterOptions";
