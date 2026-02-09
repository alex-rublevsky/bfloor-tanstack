import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Image } from "~/components/ui/shared/Image";
import { Link } from "~/components/ui/shared/Link";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { publishedNewsQueryOptions } from "~/lib/queryOptions";
import { seo } from "~/utils/seo";

const formatDate = (date: Date | null): string => {
	if (!date) return "";
	return new Intl.DateTimeFormat("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(date));
};

// Strip markdown syntax for plain text preview
const getPlainTextPreview = (
	markdown: string | null,
	maxLength = 200,
): string => {
	if (!markdown) return "";
	const plain = markdown
		.replace(/#{1,6}\s/g, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/\[(.+?)\]\(.+?\)/g, "$1")
		.replace(/!\[.*?\]\(.+?\)/g, "")
		.replace(/`(.+?)`/g, "$1")
		.replace(/\n/g, " ")
		.trim();
	return plain.length > maxLength ? `${plain.slice(0, maxLength)}...` : plain;
};

export const Route = createFileRoute("/news/")({
	component: NewsListPage,
	head: () => ({
		meta: [
			...seo({
				title: "Новости — BeautyFloor",
				description: "Новости и обновления от BeautyFloor",
			}),
		],
	}),

	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(publishedNewsQueryOptions());
	},
});

function NewsListPage() {
	const { data: newsArticles } = useSuspenseQuery(publishedNewsQueryOptions());

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
			<h1 className="mb-8 font-bold text-3xl">Новости</h1>

			{newsArticles.length === 0 ? (
				<div className="py-16 text-center">
					<p className="text-lg text-muted-foreground">
						Пока нет опубликованных новостей
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{newsArticles.map((article) => (
						<Link
							key={article.id}
							href={`/news/${article.slug}`}
							className="group block overflow-hidden rounded-lg border border-border transition-colors hover:border-primary/30 hover:bg-muted/30"
						>
							<div className="flex flex-col sm:flex-row">
								{/* Cover Image */}
								{article.image && (
									<div className="relative shrink-0 overflow-hidden bg-muted/30 sm:w-64">
										<Image
											src={`${ASSETS_BASE_URL}/${article.image}`}
											alt={article.name}
											className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-105"
										/>
									</div>
								)}

								<div className="flex flex-col p-6">
									{/* Date */}
									<span className="text-muted-foreground text-sm">
										{formatDate(article.publishedAt)}
									</span>

									{/* Title */}
									<h2 className="mt-2 font-semibold text-xl">{article.name}</h2>

									{/* Body preview */}
									{article.body && (
										<p className="mt-3 line-clamp-3 text-muted-foreground">
											{getPlainTextPreview(article.body, 300)}
										</p>
									)}

									{/* Read more */}
									<span className="mt-4 inline-block font-medium text-primary text-sm">
										Читать далее →
									</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
