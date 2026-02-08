import { and, eq, inArray } from "drizzle-orm";
import type { DbContext } from "~/db";
import { attributeValues } from "~/schema";
import { getAttributeMappings } from "./attributeMapping";

/**
 * Validates that standardized attribute values exist in attribute_values table.
 * Uses a single batch query instead of per-value lookups for efficiency.
 * Returns array of validation errors (empty if all valid).
 */
export async function validateAttributeValues(
	db: DbContext,
	attributes: Array<{ attributeId: string; value: string }>,
): Promise<{ attributeId: string; value: string; error: string }[]> {
	const errors: { attributeId: string; value: string; error: string }[] = [];

	if (!attributes || attributes.length === 0) {
		return errors;
	}

	// Get all attribute definitions to check which are standardized (cached)
	const { attributes: attributeDefinitions, slugToId } =
		await getAttributeMappings();
	const attributeMap = new Map(
		attributeDefinitions.map((attr) => [attr.id.toString(), attr]),
	);
	const slugToIdMap = new Map(
		Array.from(slugToId.entries()).map(([slug, id]) => [slug, id.toString()]),
	);

	// Collect all standardized attribute IDs that need validation
	const standardizedAttrIds: number[] = [];
	const attrEntries: Array<{
		originalAttrId: string;
		numericAttrId: number;
		attrDef: (typeof attributeDefinitions)[0];
		valuesToCheck: string[];
	}> = [];

	for (const attr of attributes) {
		if (!attr.value || !attr.value.trim()) continue;

		// Resolve attribute ID (could be numeric string or slug)
		let attributeId: number | null = null;
		const numericId = parseInt(attr.attributeId, 10);
		if (!Number.isNaN(numericId) && attributeMap.has(attr.attributeId)) {
			attributeId = numericId;
		} else if (slugToIdMap.has(attr.attributeId)) {
			const idFromSlug = slugToIdMap.get(attr.attributeId);
			if (idFromSlug) attributeId = parseInt(idFromSlug, 10);
		}

		if (!attributeId) continue;

		const attributeDef = attributeMap.get(attributeId.toString());
		if (!attributeDef) continue;

		const isStandardized =
			attributeDef.valueType === "standardized" ||
			attributeDef.valueType === "both";
		if (!isStandardized) continue;

		// Parse comma-separated values
		const valuesToCheck = attr.value.includes(",")
			? attr.value
					.split(",")
					.map((v) => v.trim())
					.filter(Boolean)
			: [attr.value.trim()];

		standardizedAttrIds.push(attributeId);
		attrEntries.push({
			originalAttrId: attr.attributeId,
			numericAttrId: attributeId,
			attrDef: attributeDef,
			valuesToCheck,
		});
	}

	if (standardizedAttrIds.length === 0) {
		return errors;
	}

	// Single batch query: fetch ALL active values for ALL relevant attributes at once
	const uniqueAttrIds = [...new Set(standardizedAttrIds)];
	let allValidValues: Array<{ attributeId: number; value: string }>;

	try {
		allValidValues = await db
			.select({
				attributeId: attributeValues.attributeId,
				value: attributeValues.value,
			})
			.from(attributeValues)
			.where(
				and(
					inArray(attributeValues.attributeId, uniqueAttrIds),
					eq(attributeValues.isActive, true),
				),
			);
	} catch (dbError) {
		console.error("Error fetching attribute values for validation:", dbError);
		return errors; // Can't validate — don't block
	}

	// Build a lookup set: "attributeId:value" for O(1) checks
	const validSet = new Set(
		allValidValues.map((r) => `${r.attributeId}:${r.value}`),
	);

	// Build a set of attribute IDs that have at least one standardized value defined
	const attrIdsWithValues = new Set(allValidValues.map((r) => r.attributeId));

	// Validate each entry against the batch-fetched data
	for (const entry of attrEntries) {
		// If no standardized values are defined for this attribute, skip (treat as free-text)
		if (!attrIdsWithValues.has(entry.numericAttrId)) continue;

		for (const valueToCheck of entry.valuesToCheck) {
			if (!validSet.has(`${entry.numericAttrId}:${valueToCheck}`)) {
				errors.push({
					attributeId: entry.originalAttrId,
					value: valueToCheck,
					error: `Значение "${valueToCheck}" не входит в список стандартизированных значений для атрибута "${entry.attrDef.name}"`,
				});
			}
		}
	}

	return errors;
}
