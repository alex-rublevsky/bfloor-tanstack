import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { DB } from "~/db";
import { news } from "~/schema";

/**
 * Fetches all active (published) news articles, ordered by publishedAt desc.
 * Used for: public news carousel on home page and /news listing page.
 *
 * Performance: Simple query on indexed columns (isActive + publishedAt).
 * Only selects needed fields to minimize data transfer.
 */
export const getPublishedNews = createServerFn({ method: "GET" }).handler(
	async () => {
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
				.where(and(eq(news.isActive, true)))
				.orderBy(desc(news.publishedAt))
				.all();

			return newsResult || [];
		} catch (error) {
			console.error("Error fetching published news:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch published news");
		}
	},
);
