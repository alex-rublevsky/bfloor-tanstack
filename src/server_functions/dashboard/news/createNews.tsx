import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { news } from "~/schema";
import type { NewsFormData } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const createNews = createServerFn({ method: "POST" })
	.inputValidator((data: NewsFormData) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();

			if (!data.name || !data.slug) {
				throw new ApiError(
					"Missing required fields: name and slug are required",
					400,
				);
			}

			// Check for duplicate slug
			const existingNews = await db
				.select({ slug: news.slug })
				.from(news)
				.where(eq(news.slug, data.slug))
				.limit(1);

			if (existingNews.length > 0) {
				throw new ApiError("A news article with this slug already exists", 409);
			}

			// Move staging image to final location before saving (in same request)
			let finalImage = data.image || "";
			if (finalImage?.startsWith("images/staging/")) {
				const bucket = getStorageBucket();
				const moveResult = await moveStagingImagesWithBucket(bucket, {
					imagePaths: [finalImage],
					finalFolder: "news",
					slug: data.slug,
					productName: data.name,
				});

				if (moveResult?.pathMap?.[finalImage]) {
					finalImage = moveResult.pathMap[finalImage];
				} else if (
					moveResult?.movedImages &&
					moveResult.movedImages.length > 0
				) {
					finalImage = moveResult.movedImages[0];
				}
			}

			// Insert the news article
			const insertResult = await db
				.insert(news)
				.values({
					name: data.name,
					slug: data.slug,
					image: finalImage || null,
					body: data.body || null,
					publishedAt: data.publishedAt
						? new Date(data.publishedAt)
						: new Date(),
					isActive: data.isActive ?? true,
					createdAt: new Date(),
				})
				.returning();

			return {
				message: "News article created successfully",
				news: insertResult[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error creating news article:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
