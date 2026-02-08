import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { DB } from "~/db";
import {
	attributeValues,
	productAttributeValues,
	variationAttributes,
} from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { cleanupAttributeValueFromProducts } from "~/utils/cleanupAttributeValueFromProducts";

export const deleteAttributeValue = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(
		async ({ data }): Promise<{ message: string; updatedProducts: number }> => {
			try {
				const db = DB();

				// Check if value exists (only fetch needed columns)
				const existing = await db
					.select({
						id: attributeValues.id,
						attributeId: attributeValues.attributeId,
						value: attributeValues.value,
					})
					.from(attributeValues)
					.where(eq(attributeValues.id, data.id))
					.limit(1);

				if (existing.length === 0) {
					throw new ApiError("Attribute value not found", 404);
				}

				const valueToDelete = existing[0];
				const attributeId = valueToDelete.attributeId;
				const attrIdStr = attributeId.toString();
				const valueString = valueToDelete.value;

				// Check if this value is used in any product variations
				const valueInVariations = await db
					.select({ id: variationAttributes.id })
					.from(variationAttributes)
					.where(
						and(
							eq(variationAttributes.attributeId, attrIdStr),
							eq(variationAttributes.value, valueString),
						),
					)
					.limit(1);

				if (valueInVariations.length > 0) {
					throw new ApiError(
						"Cannot delete attribute value that is being used in product variations",
						409,
					);
				}

				// Wrap all cleanup + row delete in a transaction
				let updatedCount = 0;
				await db.transaction(async (tx) => {
					// 1. Clean up this value from products.productAttributes JSON
					const cleanupResult = await cleanupAttributeValueFromProducts(
						tx as unknown as Parameters<
							typeof cleanupAttributeValueFromProducts
						>[0],
						attributeId,
						valueString,
					);
					updatedCount = cleanupResult.updatedCount;

					// 2. Delete productAttributeValues junction rows for this value
					await tx
						.delete(productAttributeValues)
						.where(eq(productAttributeValues.valueId, data.id));

					// 3. Delete the value from attribute_values table
					await tx
						.delete(attributeValues)
						.where(eq(attributeValues.id, data.id));
				});

				return {
					message:
						updatedCount > 0
							? `Attribute value deleted successfully. Removed from ${updatedCount} product(s).`
							: "Attribute value deleted successfully.",
					updatedProducts: updatedCount,
				};
			} catch (error) {
				if (error instanceof ApiError) {
					setResponseStatus(error.status);
				} else {
					console.error("Error deleting attribute value:", error);
					setResponseStatus(500);
				}
				throw error;
			}
		},
	);
