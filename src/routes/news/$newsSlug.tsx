import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Image } from "~/components/ui/shared/Image";
import { Link } from "~/components/ui/shared/Link";
import {
	markdownComponents,
	rehypePlugins,
} from "~/components/ui/shared/MarkdownComponents";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { newsBySlugQueryOptions } from "~/lib/queryOptions";
import { seo } from "~/utils/seo";

const formatDate = (date: Date | null): string => {
	if (!date) return "";
	return new Intl.DateTimeFormat("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(date));
};

export const Route = createFileRoute("/news/$newsSlug")({
	component: NewsArticlePage,
	head: ({ loaderData }) => {
		const article = loaderData?.article;
		return {
			meta: [
				...seo({
					title: article
						? `${article.name} — Новости BeautyFloor`
						: "Новость — BeautyFloor",
					description: article?.body
						? article.body.slice(0, 160).replace(/\n/g, " ")
						: "Новости BeautyFloor",
				}),
			],
		};
	},

	loader: async ({ context: { queryClient }, params }) => {
		const article = await queryClient.ensureQueryData(
			newsBySlugQueryOptions(params.newsSlug),
		);
		return { article };
	},

	notFoundComponent: () => (
		<div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
			<h1 className="mb-4 font-bold text-2xl">Новость не найдена</h1>
			<p className="mb-8 text-muted-foreground">
				Запрошенная новость не существует или была удалена.
			</p>
			<Link href="/news" className="font-medium text-primary hover:underline">
				← Вернуться к новостям
			</Link>
		</div>
	),
});

function NewsArticlePage() {
	const { newsSlug } = Route.useParams();
	const { data: article } = useSuspenseQuery(newsBySlugQueryOptions(newsSlug));

	return (
		<article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
			{/* Back link */}
			<Link
				href="/news"
				className="mb-6 inline-block text-muted-foreground text-sm hover:text-primary"
			>
				← Все новости
			</Link>

			{/* Date */}
			<div className="mb-4">
				<span className="text-muted-foreground text-sm">
					{formatDate(article.publishedAt)}
				</span>
			</div>

			{/* Title */}
			<h1 className="mb-8 font-bold text-3xl leading-tight">{article.name}</h1>

			{/* Cover Image */}
			{article.image && (
				<div className="relative mb-8 overflow-hidden rounded-lg bg-muted/30">
					<Image
						src={`${ASSETS_BASE_URL}/${article.image}`}
						alt={article.name}
						className="h-auto w-full object-contain"
					/>
				</div>
			)}

			{/* Body - rendered as Markdown */}
			{article.body && (
				<div className="prose prose-neutral dark:prose-invert max-w-none">
					<ReactMarkdown
						components={markdownComponents}
						rehypePlugins={rehypePlugins}
					>
						{article.body}
					</ReactMarkdown>
				</div>
			)}
		</article>
	);
}
