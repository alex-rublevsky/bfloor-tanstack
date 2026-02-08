import { eq, sql } from "drizzle-orm";
import type { DbContext } from "~/db";
import { productAttributes, products } from "~/schema";

/**
 * Updates a specific attribute value in all products that have it selected.
 * Handles both formats:
 *   - New array format: [{attributeId: "5", value: "Wood,Oak"}, ...]
 *   - Legacy object format: {"thickness": "3mm", "5": "Wood"}
 * Comma-separated multi-values within a single entry are supported.
 *
 * @param db - Database connection or transaction context
 * @param attributeId - Numeric ID of the attribute
 * @param oldValue - The old value string to replace
 * @param newValue - The new value string
 * @returns Number of products updated
 */
export async function updateAttributeValueInProducts(
	db: DbContext,
	attributeId: number,
	oldValue: string,
	newValue: string,
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
			const parsed = JSON.parse(product.productAttributes);
			let changed = false;

			if (Array.isArray(parsed)) {
				// New array format: [{attributeId: "5", value: "Wood,Oak"}, ...]
				for (const entry of parsed) {
					if (entry.attributeId !== attrIdStr) continue;

					// Handle comma-separated multi-values
					const values = entry.value
						.split(",")
						.map((v: string) => v.trim())
						.filter(Boolean);

					if (!values.includes(oldValue)) continue;

					const updatedValues = values.map((v: string) =>
						v === oldValue ? newValue : v,
					);
					entry.value = updatedValues.join(",");
					changed = true;
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

				if (!values.includes(oldValue)) continue;

				const updatedValues = values.map((v: string) =>
					v === oldValue ? newValue : v,
				);
				const newValueString = updatedValues.join(",");

				if (parsed[attributeSlug] !== undefined) {
					parsed[attributeSlug] = newValueString;
				} else {
					parsed[attrIdStr] = newValueString;
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
