import { and, eq, inArray } from "drizzle-orm";
import type { DbContext } from "~/db";
import { attributeValues } from "~/schema";

/**
 * Get value ID from attribute ID and value string
 * Returns null if value doesn't exist
 */
export async function getValueId(
	db: DbContext,
	attributeId: number,
	value: string,
): Promise<number | null> {
	const result = await db
		.select({ id: attributeValues.id })
		.from(attributeValues)
		.where(
			and(
				eq(attributeValues.attributeId, attributeId),
				eq(attributeValues.value, value),
				eq(attributeValues.isActive, true),
			),
		)
		.limit(1);

	return result[0]?.id || null;
}

/**
 * Get multiple value IDs at once (more efficient than individual lookups)
 * Returns a Map of value string -> value ID
 */
export async function getValueIds(
	db: DbContext,
	attributeId: number,
	values: string[],
): Promise<Map<string, number>> {
	if (values.length === 0) {
		return new Map();
	}

	const results = await db
		.select({
			id: attributeValues.id,
			value: attributeValues.value,
		})
		.from(attributeValues)
		.where(
			and(
				eq(attributeValues.attributeId, attributeId),
				inArray(attributeValues.value, values),
				eq(attributeValues.isActive, true),
			),
		);

	const map = new Map<string, number>();
	for (const row of results) {
		map.set(row.value, row.id);
	}
	return map;
}

/**
 * Get actual values from value IDs
 * Returns a Map of value ID -> value string
 */
export async function getValuesByIds(
	db: DbContext,
	valueIds: number[],
): Promise<Map<number, string>> {
	if (valueIds.length === 0) {
		return new Map();
	}

	const results = await db
		.select({
			id: attributeValues.id,
			value: attributeValues.value,
		})
		.from(attributeValues)
		.where(inArray(attributeValues.id, valueIds));

	const map = new Map<number, string>();
	for (const row of results) {
		map.set(row.id, row.value);
	}
	return map;
}

/**
 * OPTIMIZED: Batch lookup for multiple attributes at once
 * Returns a nested Map: attributeId -> (value string -> value ID)
 * This replaces N queries (one per attribute) with a single query
 */
export async function getBatchValueIds(
	db: DbContext,
	attributeValuePairs: Array<{ attributeId: number; values: string[] }>,
): Promise<Map<number, Map<string, number>>> {
	if (attributeValuePairs.length === 0) {
		return new Map();
	}

	// Collect all unique attribute IDs and values
	const allAttributeIds = new Set<number>();
	const allValues = new Set<string>();

	for (const pair of attributeValuePairs) {
		allAttributeIds.add(pair.attributeId);
		for (const value of pair.values) {
			allValues.add(value);
		}
	}

	// Single query to fetch all value IDs at once
	const results = await db
		.select({
			id: attributeValues.id,
			attributeId: attributeValues.attributeId,
			value: attributeValues.value,
		})
		.from(attributeValues)
		.where(
			and(
				inArray(attributeValues.attributeId, Array.from(allAttributeIds)),
				inArray(attributeValues.value, Array.from(allValues)),
				eq(attributeValues.isActive, true),
			),
		);

	// Build nested map: attributeId -> (value -> valueId)
	const resultMap = new Map<number, Map<string, number>>();

	for (const row of results) {
		if (!resultMap.has(row.attributeId)) {
			resultMap.set(row.attributeId, new Map());
		}
		const valueMap = resultMap.get(row.attributeId);
		if (valueMap) {
			valueMap.set(row.value, row.id);
		}
	}

	return resultMap;
}
