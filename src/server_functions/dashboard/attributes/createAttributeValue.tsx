import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, eq, sql } from "drizzle-orm";
import { DB } from "~/db";
import { attributeValues, productAttributes } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import type { AttributeValue } from "./getAttributeValues";

export const createAttributeValue = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			attributeId: number;
			value: string;
			slug?: string | null;
			sortOrder?: number;
		}) => data,
	)
	.handler(
		async ({ data }): Promise<{ value: AttributeValue; message: string }> => {
			try {
				const db = DB();

				// Validate parent, check duplicate, and get max sortOrder — all in parallel
				const [parentAttribute, existing, maxResult] = await Promise.all([
					db
						.select({ id: productAttributes.id })
						.from(productAttributes)
						.where(eq(productAttributes.id, data.attributeId))
						.limit(1),
					db
						.select({ id: attributeValues.id })
						.from(attributeValues)
						.where(
							and(
								eq(attributeValues.attributeId, data.attributeId),
								eq(attributeValues.value, data.value),
							),
						)
						.limit(1),
					db
						.select({
							maxSort: sql<number>`MAX(${attributeValues.sortOrder})`.as(
								"maxSort",
							),
						})
						.from(attributeValues)
						.where(eq(attributeValues.attributeId, data.attributeId)),
				]);

				if (parentAttribute.length === 0) {
					throw new ApiError("Parent attribute not found", 404);
				}

				if (existing.length > 0) {
					throw new ApiError(
						`Value "${data.value}" already exists for this attribute`,
						409,
					);
				}

				const maxSortOrder = maxResult[0]?.maxSort ?? -1;
				const nextSortOrder = data.sortOrder ?? maxSortOrder + 1;

				const newValue = await db
					.insert(attributeValues)
					.values({
						attributeId: data.attributeId,
						value: data.value,
						slug: data.slug || null,
						sortOrder: nextSortOrder,
						isActive: true,
						createdAt: new Date(),
					})
					.returning();

				return {
					value: {
						id: newValue[0].id,
						attributeId: newValue[0].attributeId,
						value: newValue[0].value,
						slug: newValue[0].slug || null,
						sortOrder: newValue[0].sortOrder,
						isActive: newValue[0].isActive,
						createdAt: newValue[0].createdAt
							? Number(newValue[0].createdAt)
							: null,
					},
					message: "Attribute value created successfully",
				};
			} catch (error) {
				if (error instanceof ApiError) {
					setResponseStatus(error.status);
				} else {
					console.error("Error creating attribute value:", error);
					setResponseStatus(500);
				}
				throw error;
			}
		},
	);
