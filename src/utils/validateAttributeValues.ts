import { and, eq } from "drizzle-orm";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type * as schema from "~/schema";
import { attributeValues } from "~/schema";
import { getAttributeMappings } from "./attributeMapping";

/**
 * Validates that standardized attribute values exist in attribute_values table
 * Returns array of validation errors (empty if all valid)
 */
export async function validateAttributeValues(
	db: SqliteRemoteDatabase<typeof schema>,
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

	// Process each attribute
	for (const attr of attributes) {
		if (!attr.value || !attr.value.trim()) {
			continue; // Skip empty values
		}

		// Find attribute ID (could be numeric ID string or slug)
		let attributeId: number | null = null;
		const numericId = parseInt(attr.attributeId, 10);
		if (!Number.isNaN(numericId) && attributeMap.has(attr.attributeId)) {
			attributeId = numericId;
		} else if (slugToIdMap.has(attr.attributeId)) {
			const idFromSlug = slugToIdMap.get(attr.attributeId);
			if (idFromSlug) {
				attributeId = parseInt(idFromSlug, 10);
			}
		}

		if (!attributeId) {
			// Attribute doesn't exist - skip validation
			continue;
		}

		const attributeDef = attributeMap.get(attributeId.toString());
		if (!attributeDef) {
			continue;
		}

		// Check if attribute is standardized
		const isStandardized =
			attributeDef.valueType === "standardized" ||
			attributeDef.valueType === "both";

		if (!isStandardized) {
			// Free-text attribute - no validation needed
			continue;
		}

		// For standardized attributes, first check if there are any standardized values defined
		// If no standardized values exist, treat as free-text (allows migration from old data)
		try {
			const availableValues = await db
				.select()
				.from(attributeValues)
				.where(
					and(
						eq(attributeValues.attributeId, attributeId),
						eq(attributeValues.isActive, true),
					),
				)
				.limit(1);

			// If no standardized values are defined, skip validation (treat as free-text)
			if (availableValues.length === 0) {
				continue;
			}
		} catch (dbError) {
			// If we can't check for available values, skip validation to avoid blocking
			console.error(
				`Error checking available values for attribute ${attr.attributeId}:`,
				dbError,
			);
			continue;
		}

		// Handle comma-separated values for multi-value attributes
		const valuesToCheck = attr.value.includes(",")
			? attr.value
					.split(",")
					.map((v) => v.trim())
					.filter(Boolean)
			: [attr.value.trim()];

		// Check each value exists in attribute_values table
		for (const valueToCheck of valuesToCheck) {
			try {
				const validValues = await db
					.select()
					.from(attributeValues)
					.where(
						and(
							eq(attributeValues.attributeId, attributeId),
							eq(attributeValues.value, valueToCheck),
							eq(attributeValues.isActive, true),
						),
					)
					.limit(1);

				if (validValues.length === 0) {
					errors.push({
						attributeId: attr.attributeId,
						value: valueToCheck,
						error: `Значение "${valueToCheck}" не входит в список стандартизированных значений для атрибута "${attributeDef.name}"`,
					});
				}
			} catch (dbError) {
				// If database query fails, log error but don't block validation
				console.error(
					`Error validating attribute value "${valueToCheck}" for attribute ${attr.attributeId}:`,
					dbError,
				);
				errors.push({
					attributeId: attr.attributeId,
					value: valueToCheck,
					error: `Ошибка при проверке значения "${valueToCheck}" для атрибута "${attributeDef.name}"`,
				});
			}
		}
	}

	return errors;
}
