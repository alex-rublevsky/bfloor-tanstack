import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { attributeValues } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { cleanupAttributeValueFromProducts } from "~/utils/cleanupAttributeValueFromProducts";

export const deleteAttributeValue = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(
		async ({ data }): Promise<{ message: string; updatedProducts: number }> => {
			try {
				const db = DB();

				// Check if value exists (outside transaction — read-only)
				const existing = await db
					.select()
					.from(attributeValues)
					.where(eq(attributeValues.id, data.id))
					.limit(1);

				if (existing.length === 0) {
					throw new ApiError("Attribute value not found", 404);
				}

				const valueToDelete = existing[0];
				const attributeId = valueToDelete.attributeId;
				const valueString = valueToDelete.value;

				// Wrap product JSON cleanup + row delete in a transaction
				// so both succeed or both roll back
				let updatedCount = 0;
				await db.transaction(async (tx) => {
					// Clean up this value from all products before deleting
					const cleanupResult = await cleanupAttributeValueFromProducts(
						tx as unknown as Parameters<
							typeof cleanupAttributeValueFromProducts
						>[0],
						attributeId,
						valueString,
					);
					updatedCount = cleanupResult.updatedCount;

					// Delete the value from attribute_values table
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
