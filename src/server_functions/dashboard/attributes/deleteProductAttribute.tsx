import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { productAttributes, variationAttributes } from "~/schema";
import { ApiError } from "~/utils/ApiError";

export const deleteProductAttribute = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }): Promise<{ message: string }> => {
		try {
			const db = DB();

			// Check if attribute exists
			const existingAttribute = await db
				.select()
				.from(productAttributes)
				.where(eq(productAttributes.id, data.id))
				.limit(1);

			if (existingAttribute.length === 0) {
				throw new ApiError("Product attribute not found", 404);
			}

			// Check if attribute is being used in any variations
			// variationAttributes.attributeId stores the numeric ID as a string (e.g., "5")
			const attributeInUse = await db
				.select()
				.from(variationAttributes)
				.where(
					eq(
						variationAttributes.attributeId,
						existingAttribute[0].id.toString(),
					),
				)
				.limit(1);

			if (attributeInUse.length > 0) {
				throw new ApiError(
					"Cannot delete attribute that is being used in product variations",
					409,
				);
			}

			await db
				.delete(productAttributes)
				.where(eq(productAttributes.id, data.id));

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
