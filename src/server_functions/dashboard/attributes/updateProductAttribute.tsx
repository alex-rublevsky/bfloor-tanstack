import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { productAttributes } from "~/schema";
import type { ProductAttribute } from "~/types";
import { ApiError } from "~/utils/ApiError";

export const updateProductAttribute = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { id: number; data: Partial<ProductAttribute> }) => data,
	)
	.handler(
		async ({
			data,
		}): Promise<{ attribute: ProductAttribute; message: string }> => {
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

				// Prepare update data
				const updateData: Partial<ProductAttribute> = { ...data.data };

				// Check for duplicate name if name is being updated
				if (data.data.name && data.data.name !== existingAttribute[0].name) {
					const duplicateAttribute = await db
						.select()
						.from(productAttributes)
						.where(eq(productAttributes.name, data.data.name))
						.limit(1);

					if (duplicateAttribute.length > 0) {
						throw new ApiError(
							`Attribute with name "${data.data.name}" already exists`,
							409,
						);
					}
				}

				// Check for duplicate slug if slug is being updated
				if (data.data.slug && data.data.slug !== existingAttribute[0].slug) {
					const duplicateSlug = await db
						.select()
						.from(productAttributes)
						.where(eq(productAttributes.slug, data.data.slug))
						.limit(1);

					if (duplicateSlug.length > 0) {
						throw new ApiError(
							`Attribute with slug "${data.data.slug}" already exists`,
							409,
						);
					}
				}

				const updatedAttribute = await db
					.update(productAttributes)
					.set(updateData)
					.where(eq(productAttributes.id, data.id))
					.returning();

				return {
					attribute: updatedAttribute[0],
					message: "Product attribute updated successfully",
				};
			} catch (error) {
				if (error instanceof ApiError) {
					setResponseStatus(error.status);
				} else {
					console.error("Error updating attribute:", error);
					setResponseStatus(500);
				}
				throw error;
			}
		},
	);
