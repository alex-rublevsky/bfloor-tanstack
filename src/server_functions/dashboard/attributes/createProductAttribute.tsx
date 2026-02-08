import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { productAttributes } from "~/schema";
import type { ProductAttribute } from "~/types";
import { ApiError } from "~/utils/ApiError";

export const createProductAttribute = createServerFn({ method: "POST" })
	.inputValidator((data: { name: string; slug: string }) => data)
	.handler(
		async ({
			data,
		}): Promise<{ attribute: ProductAttribute; message: string }> => {
			try {
				const db = DB();

				// Validate that slug is not empty
				if (!data.slug.trim()) {
					throw new ApiError(
						"Cannot create attribute: slug must not be empty",
						400,
					);
				}

				// Check if attribute with this name already exists
				const existingByName = await db
					.select()
					.from(productAttributes)
					.where(eq(productAttributes.name, data.name))
					.limit(1);

				if (existingByName.length > 0) {
					throw new ApiError(
						`Attribute with name "${data.name}" already exists`,
						409,
					);
				}

				// Check if attribute with this slug already exists
				const existingBySlug = await db
					.select()
					.from(productAttributes)
					.where(eq(productAttributes.slug, data.slug))
					.limit(1);

				if (existingBySlug.length > 0) {
					throw new ApiError(
						`Attribute with slug "${data.slug}" already exists`,
						409,
					);
				}

				const newAttribute = await db
					.insert(productAttributes)
					.values({
						name: data.name,
						slug: data.slug,
					})
					.returning();

				return {
					attribute: newAttribute[0],
					message: "Product attribute created successfully",
				};
			} catch (error) {
				if (error instanceof ApiError) {
					setResponseStatus(error.status);
				} else {
					console.error("Error creating attribute:", error);
					setResponseStatus(500);
				}
				throw error;
			}
		},
	);
