import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { DB } from "~/db";
import { attributeValues } from "~/schema";
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

				// Check for duplicate value for this attribute
				const existing = await db
					.select()
					.from(attributeValues)
					.where(
						and(
							eq(attributeValues.attributeId, data.attributeId),
							eq(attributeValues.value, data.value),
						),
					)
					.limit(1);

				if (existing.length > 0) {
					throw new ApiError(
						`Value "${data.value}" already exists for this attribute`,
						409,
					);
				}

				// Get max sort_order for this attribute to set next value
				const maxSortOrderResult = await db
					.select()
					.from(attributeValues)
					.where(eq(attributeValues.attributeId, data.attributeId))
					.orderBy(attributeValues.sortOrder);

				const maxSortOrder =
					maxSortOrderResult.length > 0
						? Math.max(...maxSortOrderResult.map((v) => v.sortOrder))
						: -1;

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
