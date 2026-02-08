import { eq, sql } from "drizzle-orm";
import type { DbContext } from "~/db";
import { productAttributes, products } from "~/schema";

/**
 * Removes a specific attribute value from all products that have it selected.
 * Handles both formats:
 *   - New array format: [{attributeId: "5", value: "Wood,Oak"}, ...]
 *   - Legacy object format: {"thickness": "3mm", "5": "Wood"}
 * Comma-separated multi-values within a single entry are supported.
 *
 * @param db - Database connection or transaction context
 * @param attributeId - Numeric ID of the attribute
 * @param valueToRemove - The value string to remove
 * @returns Number of products updated
 */
export async function cleanupAttributeValueFromProducts(
	db: DbContext,
	attributeId: number,
	valueToRemove: string,
): Promise<{ updatedCount: number; productIds: number[] }> {
	// Get the attribute slug for legacy object-format lookup
	const attribute = await db
		.select()
		.from(productAttributes)
		.where(eq(productAttributes.id, attributeId))
		.limit(1);

	if (attribute.length === 0) {
		return { updatedCount: 0, productIds: [] };
	}

	const attributeSlug = attribute[0].slug;
	const attrIdStr = attributeId.toString();

	// Get all products with non-null attributes
	const allProducts = await db
		.select({
			id: products.id,
			productAttributes: products.productAttributes,
		})
		.from(products)
		.where(sql`${products.productAttributes} IS NOT NULL`);

	const updatedProductIds: number[] = [];
	let updateCount = 0;

	for (const product of allProducts) {
		if (!product.productAttributes) continue;

		try {
			let parsed = JSON.parse(product.productAttributes);
			let changed = false;

			if (Array.isArray(parsed)) {
				// New array format: [{attributeId: "5", value: "Wood,Oak"}, ...]
				const updatedArray: typeof parsed = [];

				for (const entry of parsed) {
					if (entry.attributeId !== attrIdStr) {
						updatedArray.push(entry);
						continue;
					}

					// Handle comma-separated multi-values
					const values = entry.value
						.split(",")
						.map((v: string) => v.trim())
						.filter(Boolean);

					if (!values.includes(valueToRemove)) {
						updatedArray.push(entry);
						continue;
					}

					const updatedValues = values.filter(
						(v: string) => v !== valueToRemove,
					);

					if (updatedValues.length > 0) {
						// Keep entry with remaining values
						updatedArray.push({
							...entry,
							value: updatedValues.join(","),
						});
					}
					// If no values left, entry is dropped entirely
					changed = true;
				}

				if (changed) {
					parsed = updatedArray;
				}
			} else if (typeof parsed === "object" && parsed !== null) {
				// Legacy object format: {"thickness": "3mm"} or {"5": "Wood"}
				const currentValue = parsed[attributeSlug] || parsed[attrIdStr];
				if (!currentValue) continue;

				const values =
					typeof currentValue === "string"
						? currentValue
								.split(",")
								.map((v: string) => v.trim())
								.filter(Boolean)
						: [String(currentValue)];

				if (!values.includes(valueToRemove)) continue;

				const updatedValues = values.filter((v: string) => v !== valueToRemove);

				if (updatedValues.length === 0) {
					if (parsed[attributeSlug] !== undefined) delete parsed[attributeSlug];
					if (parsed[attrIdStr] !== undefined) delete parsed[attrIdStr];
				} else {
					const newValue = updatedValues.join(",");
					if (parsed[attributeSlug] !== undefined) {
						parsed[attributeSlug] = newValue;
					} else {
						parsed[attrIdStr] = newValue;
					}
				}
				changed = true;
			}

			if (changed) {
				await db
					.update(products)
					.set({ productAttributes: JSON.stringify(parsed) })
					.where(eq(products.id, product.id));

				updatedProductIds.push(product.id);
				updateCount++;
			}
		} catch (error) {
			console.warn(
				`Failed to parse attributes for product ${product.id}:`,
				error,
			);
		}
	}

	return { updatedCount: updateCount, productIds: updatedProductIds };
}
