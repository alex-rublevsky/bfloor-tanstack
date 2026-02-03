import { createServerFn } from "@tanstack/react-start";
import { eq, type SQL, sql } from "drizzle-orm";
import { getAttributeFilterSortIndex } from "~/constants/filters";
import { DB } from "~/db";
import {
	attributeValues,
	productAttributes,
	productAttributeValues,
	productStoreLocations,
	products,
} from "~/schema";

export interface AttributeFilterValue {
	id: number;
	value: string;
	slug: string | null;
	count: number; // Number of products with this value in current context
}

export interface AttributeFilter {
	attributeId: number;
	attributeName: string;
	attributeSlug: string;
	values: AttributeFilterValue[];
}

/**
 * Get available attribute values for filtering based on current filters
 * Only returns attributes that have standardized values (valueType = 'standardized' or 'both')
 * Only shows values that exist in products matching the current filter context
 *
 * Uses junction table for efficient SQL-based filtering and counting
 *
 * @param includeInactive - If true, includes inactive products (for dashboard). Defaults to false (client-side).
 */
export const getAttributeValuesForFiltering = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data: {
				categorySlug?: string;
				brandSlug?: string;
				collectionSlug?: string;
				storeLocationId?: number;
				attributeFilters?: Record<number, string[]>; // attributeId -> array of value IDs (as strings)
				includeInactive?: boolean; // If true, don't filter by isActive (for dashboard)
			} = {},
		) => data,
	)
	.handler(async ({ data = {} }): Promise<AttributeFilter[]> => {
		const db = DB();

		// Build WHERE conditions for products
		// Only filter by isActive if includeInactive is not true (client-side behavior)
		const productConditions: SQL[] = [];
		if (!data.includeInactive) {
			productConditions.push(eq(products.isActive, true));
		}

		if (data.categorySlug) {
			productConditions.push(eq(products.categorySlug, data.categorySlug));
		}
		if (data.brandSlug) {
			productConditions.push(eq(products.brandSlug, data.brandSlug));
		}
		if (data.collectionSlug) {
			productConditions.push(eq(products.collectionSlug, data.collectionSlug));
		}

		// Build base query with all necessary joins
		let query = db
			.select({
				attributeId: productAttributes.id,
				attributeName: productAttributes.name,
				attributeSlug: productAttributes.slug,
				valueId: attributeValues.id,
				value: attributeValues.value,
				valueSlug: attributeValues.slug,
				valueSortOrder: attributeValues.sortOrder,
				productCount: sql<number>`COUNT(DISTINCT ${productAttributeValues.productId})`,
			})
			.from(productAttributeValues)
			.innerJoin(products, eq(products.id, productAttributeValues.productId))
			.innerJoin(
				productAttributes,
				eq(productAttributes.id, productAttributeValues.attributeId),
			)
			.innerJoin(
				attributeValues,
				eq(attributeValues.id, productAttributeValues.valueId),
			)
			.where(
				sql.join(
					[
						...(productConditions.length > 0 ? productConditions : [sql`1=1`]),
						eq(attributeValues.isActive, true),
						sql`${productAttributes.valueType} IN ('standardized', 'both')`,
					],
					sql` AND `,
				),
			)
			.groupBy(
				productAttributes.id,
				productAttributes.name,
				productAttributes.slug,
				attributeValues.id,
				attributeValues.value,
				attributeValues.slug,
				attributeValues.sortOrder,
			)
			.$dynamic();

		// Handle store location filter (requires additional join)
		if (data.storeLocationId !== undefined) {
			query = query.innerJoin(
				productStoreLocations,
				sql`${productStoreLocations.productId} = ${products.id} AND ${productStoreLocations.storeLocationId} = ${data.storeLocationId}`,
			);
		}

		// Handle attribute filters (filter by other attributes)
		if (
			data.attributeFilters &&
			Object.keys(data.attributeFilters).length > 0
		) {
			for (const [attrIdStr, valueIdStrs] of Object.entries(
				data.attributeFilters,
			)) {
				const attrId = parseInt(attrIdStr, 10);
				const valueIds = valueIdStrs.map((id) => parseInt(id, 10));

				// For each attribute filter, ensure product has that attribute with one of the specified values
				query = query.where(
					sql`EXISTS (
						SELECT 1 FROM ${productAttributeValues} pav_filter
						WHERE pav_filter.product_id = ${products.id}
						  AND pav_filter.attribute_id = ${attrId}
						  AND pav_filter.value_id IN (${sql.join(valueIds, sql`, `)})
					)`,
				);
			}
		}

		// Execute query
		const results = await query;

		// Group results by attribute and use SQL counts (already aggregated)
		const attributeMap = new Map<
			number,
			{
				attributeId: number;
				attributeName: string;
				attributeSlug: string;
				values: Map<
					number,
					{
						id: number;
						value: string;
						slug: string | null;
						sortOrder: number;
						count: number;
					}
				>;
			}
		>();

		for (const row of results) {
			// Get or create attribute entry
			if (!attributeMap.has(row.attributeId)) {
				attributeMap.set(row.attributeId, {
					attributeId: row.attributeId,
					attributeName: row.attributeName,
					attributeSlug: row.attributeSlug,
					values: new Map(),
				});
			}

			const attrEntry = attributeMap.get(row.attributeId);
			if (!attrEntry) continue;

			// Get or create value entry
			if (!attrEntry.values.has(row.valueId)) {
				attrEntry.values.set(row.valueId, {
					id: row.valueId,
					value: row.value,
					slug: row.valueSlug,
					sortOrder: row.valueSortOrder,
					count: row.productCount ?? 0,
				});
			}
		}

		// Transform to final format
		const result: AttributeFilter[] = [];

		for (const attrEntry of attributeMap.values()) {
			const values: AttributeFilterValue[] = [];

			for (const valueEntry of attrEntry.values.values()) {
				values.push({
					id: valueEntry.id,
					value: valueEntry.value,
					slug: valueEntry.slug,
					count: valueEntry.count,
				});
			}

			// Sort values by sortOrder, then by value
			values.sort((a, b) => {
				const aSortOrder = attrEntry.values.get(a.id)?.sortOrder ?? 0;
				const bSortOrder = attrEntry.values.get(b.id)?.sortOrder ?? 0;
				if (aSortOrder !== bSortOrder) {
					return aSortOrder - bSortOrder;
				}
				return a.value.localeCompare(b.value);
			});

			result.push({
				attributeId: attrEntry.attributeId,
				attributeName: attrEntry.attributeName,
				attributeSlug: attrEntry.attributeSlug,
				values,
			});
		}

		// Sort attributes by default display order (same across storefront and dashboard)
		result.sort((a, b) => {
			const orderA = getAttributeFilterSortIndex(a.attributeSlug);
			const orderB = getAttributeFilterSortIndex(b.attributeSlug);
			if (orderA !== orderB) return orderA - orderB;
			return a.attributeSlug.localeCompare(b.attributeSlug);
		});

		return result;
	});
