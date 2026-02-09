import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { news } from "~/schema";
import type { NewsFormData } from "~/types";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { moveStagingImagesWithBucket } from "../store/moveStagingImages";

export const updateNews = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number; data: NewsFormData }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id, data: newsData } = data;

			if (!newsData.name || !newsData.slug) {
				throw new ApiError(
					"Missing required fields: name and slug are required",
					400,
				);
			}

			// Check if news article exists
			const currentNews = await db
				.select({ id: news.id, slug: news.slug })
				.from(news)
				.where(eq(news.id, id))
				.limit(1);

			if (currentNews.length === 0) {
				throw new ApiError("News article not found", 404);
			}

			// If slug is being changed, check for duplicate
			if (currentNews[0].slug !== newsData.slug) {
				const duplicateSlug = await db
					.select({ slug: news.slug })
					.from(news)
					.where(eq(news.slug, newsData.slug))
					.limit(1);

				if (duplicateSlug.length > 0) {
					throw new ApiError(
						"A news article with this slug already exists",
						409,
					);
				}
			}

			// Move staging image to final location before saving (in same request)
			let finalImage = newsData.image || "";
			if (finalImage?.startsWith("images/staging/")) {
				const bucket = getStorageBucket();
				const moveResult = await moveStagingImagesWithBucket(bucket, {
					imagePaths: [finalImage],
					finalFolder: "news",
					slug: newsData.slug,
					productName: newsData.name,
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

			// Update the news article
			const updateResult = await db
				.update(news)
				.set({
					name: newsData.name,
					slug: newsData.slug,
					image: finalImage || null,
					body: newsData.body || null,
					publishedAt: newsData.publishedAt
						? new Date(newsData.publishedAt)
						: null,
					isActive: newsData.isActive ?? true,
				})
				.where(eq(news.id, id))
				.returning();

			if (updateResult.length === 0) {
				throw new ApiError("News article not found", 404);
			}

			return {
				message: "News article updated successfully",
				news: updateResult[0],
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error updating news article:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
