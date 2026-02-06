import { createServerFn } from "@tanstack/react-start";
import { eq, type SQL, sql } from "drizzle-orm";
import { getAttributeFilterSortIndex } from "~/constants/filters";
import { getAllStoreLocations } from "~/data/storeLocations";
import { DB } from "~/db";
import {
	attributeValues,
	brands,
	collections,
	productAttributes,
	productAttributeValues,
	productBrands,
	productCollections,
	productStoreLocations,
	products,
} from "~/schema";

/**
 * Unified filter options endpoint - returns ALL filter options in a single request
 *
 * This replaces the separate getFilteredBrands, getFilteredCollections, and
 * getAttributeValuesForFiltering endpoints with a single unified endpoint.
 *
 * Benefits:
 * - Single API call instead of 4 (2-3x faster)
 * - Guaranteed consistency (all filters use same product set)
 * - All filters adapt to ALL other filters (including attributes)
 * - Better caching (single cache entry per filter combination)
 */

export interface AttributeFilterValue {
	id: number;
	value: string;
	slug: string | null;
	count: number;
}

export interface AttributeFilter {
	attributeId: number;
	attributeName: string;
	attributeSlug: string;
	values: AttributeFilterValue[];
}

export interface FilterOptions {
	brands: Array<{
		id: number;
		name: string;
		slug: string;
		image: string | null;
		countryId: number | null;
		isActive: boolean;
	}>;
	collections: Array<{
		id: number;
		name: string;
		slug: string;
		brandSlug: string | null;
		isActive: boolean;
	}>;
	storeLocations: Array<{
		id: number;
		address: string;
	}>;
	attributes: AttributeFilter[];
}

export const getAllFilterOptions = createServerFn({ method: "GET" })
	.inputValidator(
		(
			data: {
				categorySlug?: string;
				brandSlugs?: string[]; // Multi-select: array of brand slugs
				collectionSlugs?: string[]; // Multi-select: array of collection slugs
				storeLocationId?: number;
				attributeFilters?: Record<number, string[]>;
				includeInactive?: boolean;
			} = {},
		) => data,
	)
	.handler(async ({ data = {} }): Promise<FilterOptions> => {
		const db = DB();

		// Build base product filter conditions (shared across all filter types)
		// These are the "always apply" conditions
		const baseConditions: SQL[] = [];

		// Only filter by isActive if includeInactive is not true
		if (!data.includeInactive) {
			baseConditions.push(eq(products.isActive, true));
		}

		// Category filter (always apply)
		if (data.categorySlug) {
			baseConditions.push(eq(products.categorySlug, data.categorySlug));
		}

		// Helper function to build WHERE clause excluding specific filter
		const buildWhereExcluding = (
			exclude: "brand" | "collection" | "storeLocation" | "none",
		): SQL => {
			const conditions = [...baseConditions];

			// Brand filter (skip if querying brands) - supports multi-select
			if (
				data.brandSlugs &&
				data.brandSlugs.length > 0 &&
				exclude !== "brand"
			) {
				conditions.push(sql`EXISTS (
				SELECT 1 FROM ${productBrands}
				WHERE ${productBrands.productId} = ${products.id}
				  AND ${productBrands.brandSlug} IN (${sql.join(data.brandSlugs, sql`, `)})
			)`);
			}

			// Collection filter (skip if querying collections) - supports multi-select
			if (
				data.collectionSlugs &&
				data.collectionSlugs.length > 0 &&
				exclude !== "collection"
			) {
				conditions.push(sql`EXISTS (
				SELECT 1 FROM ${productCollections}
				WHERE ${productCollections.productId} = ${products.id}
				  AND ${productCollections.collectionSlug} IN (${sql.join(data.collectionSlugs, sql`, `)})
			)`);
			}

			// Store location filter (skip if querying store locations)
			if (data.storeLocationId !== undefined && exclude !== "storeLocation") {
				conditions.push(sql`EXISTS (
				SELECT 1 FROM ${productStoreLocations}
				WHERE ${productStoreLocations.productId} = ${products.id}
				  AND ${productStoreLocations.storeLocationId} = ${data.storeLocationId}
			)`);
			}

			// Attribute filters (always apply for brands/collections/locations queries)
			if (
				data.attributeFilters &&
				Object.keys(data.attributeFilters).length > 0
			) {
				for (const [attrIdStr, valueIdStrs] of Object.entries(
					data.attributeFilters,
				)) {
					const attrId = parseInt(attrIdStr, 10);
					const valueIds = valueIdStrs.map((id) => parseInt(id, 10));
					conditions.push(sql`EXISTS (
					SELECT 1 FROM ${productAttributeValues}
					WHERE ${productAttributeValues.productId} = ${products.id}
					  AND ${productAttributeValues.attributeId} = ${attrId}
					  AND ${productAttributeValues.valueId} IN (${sql.join(valueIds, sql`, `)})
				)`);
				}
			}

			return conditions.length > 0
				? sql.join(conditions, sql` AND `)
				: sql`1=1`;
		};

		// Run all 4 database queries in parallel for maximum performance
		const [
			brandsResult,
			collectionsResult,
			availableLocationIds,
			attributesData,
		] = await Promise.all([
			// Query 1: Get available brands (excludes brand filter from WHERE clause)
			db
				.selectDistinct({
					id: brands.id,
					name: brands.name,
					slug: brands.slug,
					image: brands.image,
					countryId: brands.countryId,
					isActive: brands.isActive,
				})
				.from(productBrands)
				.innerJoin(products, eq(productBrands.productId, products.id))
				.innerJoin(brands, eq(productBrands.brandSlug, brands.slug))
				.where(buildWhereExcluding("brand"))
				.all(),

			// Query 2: Get available collections (excludes collection filter from WHERE clause)
			db
				.selectDistinct({
					id: collections.id,
					name: collections.name,
					slug: collections.slug,
					brandSlug: collections.brandSlug,
					isActive: collections.isActive,
				})
				.from(productCollections)
				.innerJoin(products, eq(productCollections.productId, products.id))
				.innerJoin(
					collections,
					eq(productCollections.collectionSlug, collections.slug),
				)
				.where(buildWhereExcluding("collection"))
				.all(),

			// Query 3: Get available store location IDs (excludes store location filter from WHERE clause)
			db
				.selectDistinct({
					storeLocationId: productStoreLocations.storeLocationId,
				})
				.from(productStoreLocations)
				.innerJoin(products, eq(productStoreLocations.productId, products.id))
				.where(buildWhereExcluding("storeLocation"))
				.all(),

			// Query 4: Get available attribute values
			// IMPORTANT: For each attribute, we calculate available values WITHOUT that attribute's own filter
			// This allows multi-select (e.g., select both 8mm and 10mm thickness)
			(async () => {
				// Build base conditions (category, brand, collection, store location - NOT attributes)
				const baseConditions: SQL[] = [];
				if (!data.includeInactive) {
					baseConditions.push(eq(products.isActive, true));
				}
				if (data.categorySlug) {
					baseConditions.push(eq(products.categorySlug, data.categorySlug));
				}
				if (data.brandSlugs && data.brandSlugs.length > 0) {
					baseConditions.push(sql`EXISTS (
					SELECT 1 FROM ${productBrands}
					WHERE ${productBrands.productId} = ${products.id}
					  AND ${productBrands.brandSlug} IN (${sql.join(data.brandSlugs, sql`, `)})
				)`);
				}
				if (data.collectionSlugs && data.collectionSlugs.length > 0) {
					baseConditions.push(sql`EXISTS (
					SELECT 1 FROM ${productCollections}
					WHERE ${productCollections.productId} = ${products.id}
					  AND ${productCollections.collectionSlug} IN (${sql.join(data.collectionSlugs, sql`, `)})
				)`);
				}
				if (data.storeLocationId !== undefined) {
					baseConditions.push(sql`EXISTS (
						SELECT 1 FROM ${productStoreLocations}
						WHERE ${productStoreLocations.productId} = ${products.id}
						  AND ${productStoreLocations.storeLocationId} = ${data.storeLocationId}
					)`);
				}

				// Build attribute filter conditions dynamically
				// For each attribute value, we'll check if the product matches OTHER attribute filters
				const attributeFilterConditions: SQL[] = [];
				if (
					data.attributeFilters &&
					Object.keys(data.attributeFilters).length > 0
				) {
					for (const [attrIdStr, valueIdStrs] of Object.entries(
						data.attributeFilters,
					)) {
						const attrId = parseInt(attrIdStr, 10);
						const valueIds = valueIdStrs.map((id) => parseInt(id, 10));

						// For each attribute filter, add a condition that will be applied
						// EXCEPT when we're querying that attribute's own values
						attributeFilterConditions.push(sql`(
							${productAttributeValues.attributeId} = ${attrId}
							OR EXISTS (
								SELECT 1 FROM ${productAttributeValues} pav_filter
								WHERE pav_filter.product_id = ${products.id}
								  AND pav_filter.attribute_id = ${attrId}
								  AND pav_filter.value_id IN (${sql.join(valueIds, sql`, `)})
							)
						)`);
					}
				}

				// Combine base conditions with attribute filter conditions
				const allConditions = [
					...baseConditions,
					...(attributeFilterConditions.length > 0
						? attributeFilterConditions
						: []),
					eq(attributeValues.isActive, true),
					sql`${productAttributes.valueType} IN ('standardized', 'both')`,
				];

				const attrWhereCondition = sql.join(allConditions, sql` AND `);

				// Single query to get all attribute values
				const results = await db
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
					.innerJoin(
						products,
						eq(products.id, productAttributeValues.productId),
					)
					.innerJoin(
						productAttributes,
						eq(productAttributes.id, productAttributeValues.attributeId),
					)
					.innerJoin(
						attributeValues,
						eq(attributeValues.id, productAttributeValues.valueId),
					)
					.where(attrWhereCondition)
					.groupBy(
						productAttributes.id,
						productAttributes.name,
						productAttributes.slug,
						attributeValues.id,
						attributeValues.value,
						attributeValues.slug,
						attributeValues.sortOrder,
					)
					.all();

				// Group results by attribute
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
				const attributeFilters: AttributeFilter[] = [];

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

					attributeFilters.push({
						attributeId: attrEntry.attributeId,
						attributeName: attrEntry.attributeName,
						attributeSlug: attrEntry.attributeSlug,
						values,
					});
				}

				// Sort attributes by default display order
				attributeFilters.sort((a, b) => {
					const orderA = getAttributeFilterSortIndex(a.attributeSlug);
					const orderB = getAttributeFilterSortIndex(b.attributeSlug);
					if (orderA !== orderB) return orderA - orderB;
					return a.attributeSlug.localeCompare(b.attributeSlug);
				});

				return attributeFilters;
			})(),
		]);

		// Filter hardcoded store locations based on available location IDs from database
		const availableLocationIdSet = new Set(
			availableLocationIds.map((loc) => loc.storeLocationId),
		);
		const allStoreLocations = getAllStoreLocations();
		const filteredStoreLocations = allStoreLocations.filter((loc) =>
			availableLocationIdSet.has(loc.id),
		);

		return {
			brands: brandsResult,
			collections: collectionsResult,
			storeLocations: filteredStoreLocations,
			attributes: attributesData,
		};
	});
