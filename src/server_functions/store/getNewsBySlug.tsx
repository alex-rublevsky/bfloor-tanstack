import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { DB } from "~/db";
import { news } from "~/schema";

/**
 * Fetches a single published news article by slug.
 * Used for: /news/$newsSlug detail page.
 *
 * Performance: Indexed slug lookup with isActive filter.
 */
export const getNewsBySlug = createServerFn({ method: "GET" })
	.inputValidator((data: string) => data)
	.handler(async ({ data: slug }) => {
		try {
			const db = DB();
			const newsResult = await db
				.select({
					id: news.id,
					name: news.name,
					slug: news.slug,
					image: news.image,
					body: news.body,
					publishedAt: news.publishedAt,
					isActive: news.isActive,
					createdAt: news.createdAt,
				})
				.from(news)
				.where(and(eq(news.slug, slug), eq(news.isActive, true)))
				.limit(1);

			if (newsResult.length === 0) {
				throw new Error("News article not found");
			}

			return newsResult[0];
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === "News article not found"
			) {
				setResponseStatus(404);
				throw error;
			}
			console.error("Error fetching news by slug:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch news article");
		}
	});
