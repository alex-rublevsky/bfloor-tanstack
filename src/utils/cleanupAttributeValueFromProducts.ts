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
 * Optimized: pre-filters with SQL LIKE to only fetch products that *might*
 * contain the value, reducing the number of rows to parse in JS.
 */
export async function cleanupAttributeValueFromProducts(
	db: DbContext,
	attributeId: number,
	valueToRemove: string,
): Promise<{ updatedCount: number; productIds: number[] }> {
	// Get the attribute slug for legacy object-format lookup
	const attribute = await db
		.select({ slug: productAttributes.slug })
		.from(productAttributes)
		.where(eq(productAttributes.id, attributeId))
		.limit(1);

	if (attribute.length === 0) {
		return { updatedCount: 0, productIds: [] };
	}

	const attributeSlug = attribute[0].slug;
	const attrIdStr = attributeId.toString();

	// Only fetch products whose JSON likely contains the value (SQL LIKE pre-filter)
	const candidateProducts = await db
		.select({
			id: products.id,
			productAttributes: products.productAttributes,
		})
		.from(products)
		.where(
			sql`${products.productAttributes} IS NOT NULL AND ${products.productAttributes} LIKE ${`%${valueToRemove}%`}`,
		);

	if (candidateProducts.length === 0) {
		return { updatedCount: 0, productIds: [] };
	}

	// Parse and update in JS, then batch all updates
	const updates: Array<{ id: number; json: string | null }> = [];

	for (const product of candidateProducts) {
		if (!product.productAttributes) continue;

		try {
			let parsed = JSON.parse(product.productAttributes);
			let changed = false;

			if (Array.isArray(parsed)) {
				const updatedArray: typeof parsed = [];

				for (const entry of parsed) {
					if (entry.attributeId !== attrIdStr) {
						updatedArray.push(entry);
						continue;
					}

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
						updatedArray.push({
							...entry,
							value: updatedValues.join(","),
						});
					}
					changed = true;
				}

				if (changed) {
					parsed = updatedArray;
				}
			} else if (typeof parsed === "object" && parsed !== null) {
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
				const jsonStr =
					Array.isArray(parsed) && parsed.length === 0
						? null
						: typeof parsed === "object" &&
								!Array.isArray(parsed) &&
								Object.keys(parsed).length === 0
							? null
							: JSON.stringify(parsed);

				updates.push({ id: product.id, json: jsonStr });
			}
		} catch (error) {
			console.warn(
				`Failed to parse attributes for product ${product.id}:`,
				error,
			);
		}
	}

	// Execute all updates in parallel
	if (updates.length > 0) {
		await Promise.all(
			updates.map((upd) =>
				db
					.update(products)
					.set({ productAttributes: upd.json })
					.where(eq(products.id, upd.id)),
			),
		);
	}

	return {
		updatedCount: updates.length,
		productIds: updates.map((upd) => upd.id),
	};
}
