import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq, sql } from "drizzle-orm";
import { DB } from "~/db";
import {
	attributeValues,
	productAttributes,
	productAttributeValues,
	products,
	variationAttributes,
} from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const deleteProductAttribute = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }): Promise<{ message: string }> => {
		try {
			const db = DB();

			const attrIdStr = data.id.toString();

			// Check existence and variation usage in parallel
			const [existingAttribute, attributeInUse] = await Promise.all([
				db
					.select({
						id: productAttributes.id,
						slug: productAttributes.slug,
					})
					.from(productAttributes)
					.where(eq(productAttributes.id, data.id))
					.limit(1),
				db
					.select({ id: variationAttributes.id })
					.from(variationAttributes)
					.where(eq(variationAttributes.attributeId, attrIdStr))
					.limit(1),
			]);

			if (existingAttribute.length === 0) {
				throw new ApiError("Product attribute not found", 404);
			}

			const attrId = existingAttribute[0].id;
			const attrSlug = existingAttribute[0].slug;

			if (attributeInUse.length > 0) {
				throw new ApiError(
					"Cannot delete attribute that is being used in product variations",
					409,
				);
			}

			// Everything in a transaction: clean up all dependent data then delete
			await db.transaction(async (tx) => {
				// 1. Delete productAttributeValues junction rows for this attribute
				//    (both by attributeId and by valueId, to be thorough)
				await tx
					.delete(productAttributeValues)
					.where(eq(productAttributeValues.attributeId, attrId));

				// 2. Clean up products.productAttributes JSON column
				//    Remove entries referencing this attribute (both array and legacy object format)
				//    Pre-filter with LIKE to only fetch products that might reference this attribute
				const allProducts = await tx
					.select({
						id: products.id,
						productAttributes: products.productAttributes,
					})
					.from(products)
					.where(
						sql`${products.productAttributes} IS NOT NULL AND (${products.productAttributes} LIKE ${`%${attrIdStr}%`} OR ${products.productAttributes} LIKE ${`%${attrSlug}%`})`,
					);

				// Collect all updates first, then execute in parallel
				const productUpdates: Array<{
					id: number;
					json: string | null;
				}> = [];

				for (const product of allProducts) {
					if (!product.productAttributes) continue;

					try {
						const parsed = JSON.parse(product.productAttributes);

						if (Array.isArray(parsed)) {
							// New array format: [{attributeId: "5", value: "Wood"}, ...]
							const filtered = parsed.filter(
								(entry: { attributeId: string }) =>
									entry.attributeId !== attrIdStr,
							);
							if (filtered.length !== parsed.length) {
								productUpdates.push({
									id: product.id,
									json: filtered.length > 0 ? JSON.stringify(filtered) : null,
								});
							}
						} else if (typeof parsed === "object" && parsed !== null) {
							// Legacy object format: {"slug": "value", "5": "value"}
							const newObj = { ...parsed };
							let changed = false;
							if (attrSlug in newObj) {
								delete newObj[attrSlug];
								changed = true;
							}
							if (attrIdStr in newObj) {
								delete newObj[attrIdStr];
								changed = true;
							}
							if (changed) {
								productUpdates.push({
									id: product.id,
									json:
										Object.keys(newObj).length > 0
											? JSON.stringify(newObj)
											: null,
								});
							}
						}
					} catch {
						// Skip products with unparseable JSON
						console.warn(
							`Skipping product ${product.id}: could not parse productAttributes JSON`,
						);
					}
				}

				// Execute all product attribute updates in parallel
				if (productUpdates.length > 0) {
					await Promise.all(
						productUpdates.map((upd) =>
							tx
								.update(products)
								.set({ productAttributes: upd.json })
								.where(eq(products.id, upd.id)),
						),
					);
				}

				// 3. Delete all attributeValues for this attribute
				await tx
					.delete(attributeValues)
					.where(eq(attributeValues.attributeId, attrId));

				// 4. Delete the attribute itself
				await tx
					.delete(productAttributes)
					.where(eq(productAttributes.id, data.id));
			});

			return {
				message: "Product attribute deleted successfully",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting attribute:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
