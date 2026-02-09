import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { desc } from "drizzle-orm";
import { DB } from "~/db";
import { news } from "~/schema";

export const getAllNews = createServerFn({ method: "GET" }).handler(
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
				.orderBy(desc(news.publishedAt))
				.all();

			return newsResult || [];
		} catch (error) {
			console.error("Error fetching dashboard news data:", error);
			setResponseStatus(500);
			throw new Error("Failed to fetch dashboard news data");
		}
	},
);
