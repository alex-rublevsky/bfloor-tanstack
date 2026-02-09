import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { DB } from "~/db";
import { news } from "~/schema";
import { ApiError } from "~/utils/ApiError";
import { getStorageBucket } from "~/utils/storage";
import { getProductImageStorageKey } from "../store/moveStagingImages";

export const deleteNews = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number }) => data)
	.handler(async ({ data }) => {
		try {
			const db = DB();
			const { id } = data;

			// Check if news article exists and get its image
			const existingNews = await db
				.select({
					id: news.id,
					image: news.image,
				})
				.from(news)
				.where(eq(news.id, id))
				.limit(1);

			if (existingNews.length === 0) {
				throw new ApiError("News article not found", 404);
			}

			// Delete the cover image from R2 if it exists (outside transaction — storage I/O)
			// DB stores path without "images/" prefix, but bucket key includes it
			const newsImage = existingNews[0].image;
			if (newsImage && !newsImage.startsWith("images/staging/")) {
				try {
					const bucket = getStorageBucket();
					const storageKey = getProductImageStorageKey(newsImage);
					await bucket.delete(storageKey);
				} catch (deleteError) {
					console.warn("Failed to delete news image from R2:", deleteError);
				}
			}

			// Delete the news article
			const deleteResult = await db
				.delete(news)
				.where(eq(news.id, id))
				.returning();

			if (deleteResult.length === 0) {
				throw new ApiError("News article not found", 404);
			}

			return {
				message: "News article deleted successfully",
			};
		} catch (error) {
			if (error instanceof ApiError) {
				setResponseStatus(error.status);
			} else {
				console.error("Error deleting news article:", error);
				setResponseStatus(500);
			}
			throw error;
		}
	});
