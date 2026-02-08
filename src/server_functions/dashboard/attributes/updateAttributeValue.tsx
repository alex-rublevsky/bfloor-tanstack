import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, eq, ne } from "drizzle-orm";
import { DB } from "~/db";
import { attributeValues, variationAttributes } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { updateAttributeValueInProducts } from "~/utils/updateAttributeValueInProducts";
import type { AttributeValue } from "./getAttributeValues";

export const updateAttributeValue = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			id: number;
			data: {
				value?: string;
				slug?: string | null;
				sortOrder?: number;
				isActive?: boolean;
			};
		}) => data,
	)
	.handler(
		async ({ data }): Promise<{ value: AttributeValue; message: string }> => {
			try {
				const db = DB();

				// Get existing value to check attributeId
				const existing = await db
					.select()
					.from(attributeValues)
					.where(eq(attributeValues.id, data.id))
					.limit(1);

				if (existing.length === 0) {
					throw new ApiError("Attribute value not found", 404);
				}

				const attributeId = existing[0].attributeId;
				const oldValue = existing[0].value;

				// If value is being changed, check for duplicates (excluding current value)
				if (data.data.value && data.data.value !== oldValue) {
					const duplicate = await db
						.select()
						.from(attributeValues)
						.where(
							and(
								eq(attributeValues.attributeId, attributeId),
								eq(attributeValues.value, data.data.value),
								ne(attributeValues.id, data.id), // Exclude current value
							),
						)
						.limit(1);

					if (duplicate.length > 0) {
						throw new ApiError(
							`Value "${data.data.value}" already exists for this attribute`,
							409,
						);
					}
				}

				const updateData: {
					value?: string;
					slug?: string | null;
					sortOrder?: number;
					isActive?: boolean;
				} = {};

				if (data.data.value !== undefined) {
					updateData.value = data.data.value;
				}
				if (data.data.slug !== undefined) {
					updateData.slug = data.data.slug;
				}
				if (data.data.sortOrder !== undefined) {
					updateData.sortOrder = data.data.sortOrder;
				}
				if (data.data.isActive !== undefined) {
					updateData.isActive = data.data.isActive;
				}

				// Wrap product JSON updates + attributeValues row update in a transaction
				// so both succeed or both roll back
				const updated = await db.transaction(async (tx) => {
					// If value is being renamed, propagate to all referencing tables
					if (data.data.value && data.data.value !== oldValue) {
						// Propagate to products.productAttributes JSON
						await updateAttributeValueInProducts(
							tx as unknown as Parameters<
								typeof updateAttributeValueInProducts
							>[0],
							attributeId,
							oldValue,
							data.data.value,
						);

						// Propagate to variationAttributes.value
						await tx
							.update(variationAttributes)
							.set({ value: data.data.value })
							.where(
								and(
									eq(variationAttributes.attributeId, attributeId.toString()),
									eq(variationAttributes.value, oldValue),
								),
							);
					}

					return await tx
						.update(attributeValues)
						.set(updateData)
						.where(eq(attributeValues.id, data.id))
						.returning();
				});

				return {
					value: {
						id: updated[0].id,
						attributeId: updated[0].attributeId,
						value: updated[0].value,
						slug: updated[0].slug || null,
						sortOrder: updated[0].sortOrder,
						isActive: updated[0].isActive,
						createdAt: updated[0].createdAt
							? Number(updated[0].createdAt)
							: null,
					},
					message: "Attribute value updated successfully",
				};
			} catch (error) {
				if (error instanceof ApiError) {
					setResponseStatus(error.status);
				} else {
					console.error("Error updating attribute value:", error);
					setResponseStatus(500);
				}
				throw error;
			}
		},
	);
