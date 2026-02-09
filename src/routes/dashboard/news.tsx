import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
	DashboardEntityManager,
	type EntityFormFieldsProps,
	type EntityListProps,
	type EntityManagerConfig,
} from "~/components/ui/dashboard/DashboardEntityManager";
import { EntityCardGrid } from "~/components/ui/dashboard/EntityCardGrid";
import { ImageUpload } from "~/components/ui/dashboard/ImageUpload";
import { Badge } from "~/components/ui/shared/Badge";
import { Edit } from "~/components/ui/shared/Icon";
import { Image } from "~/components/ui/shared/Image";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { newsQueryOptions } from "~/lib/queryOptions";
import { createNews } from "~/server_functions/dashboard/news/createNews";
import { deleteNews } from "~/server_functions/dashboard/news/deleteNews";
import { getAllNews } from "~/server_functions/dashboard/news/getAllNews";
import { updateNews } from "~/server_functions/dashboard/news/updateNews";
import { deleteProductImage } from "~/server_functions/dashboard/store/deleteProductImage";
import type { News, NewsFormData } from "~/types";
import { simpleSearchSchema } from "~/utils/searchSchemas";

// Helper to format dates for display
const formatDate = (date: Date | null): string => {
	if (!date) return "Не указана";
	return new Intl.DateTimeFormat("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(date));
};

// News form fields component — adds image, body (markdown) and publishedAt fields
const NewsFormFields = ({
	formData,
	onFieldChange,
	idPrefix,
}: EntityFormFieldsProps<News, NewsFormData>) => {
	return (
		<>
			{/* Cover Image Upload */}
			<ImageUpload
				currentImages={(formData as NewsFormData).image || ""}
				onImagesChange={(images) => onFieldChange("image", images)}
				folder="news"
				slug={(formData as NewsFormData).slug}
				productName={(formData as NewsFormData).name}
				label="Обложка новости"
			/>

			{/* Published Date */}
			<div>
				<label
					htmlFor={`${idPrefix}-news-published-at`}
					className="mb-1 block font-medium text-sm"
				>
					Дата публикации
				</label>
				<input
					id={`${idPrefix}-news-published-at`}
					type="date"
					value={(formData as NewsFormData).publishedAt || ""}
					onChange={(e) => onFieldChange("publishedAt", e.target.value)}
					className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
				/>
			</div>

			{/* Body (Markdown) */}
			<div>
				<label
					htmlFor={`${idPrefix}-news-body`}
					className="mb-1 block font-medium text-sm"
				>
					Содержание (Markdown)
				</label>
				<textarea
					id={`${idPrefix}-news-body`}
					value={(formData as NewsFormData).body || ""}
					onChange={(e) => onFieldChange("body", e.target.value)}
					rows={12}
					placeholder="Текст новости в формате Markdown..."
					className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
				/>
			</div>
		</>
	);
};

// News list component
const NewsList = ({ entities, onEdit }: EntityListProps<News>) => (
	<EntityCardGrid
		entities={entities}
		onEdit={onEdit}
		mode="vertical"
		gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3"
		renderEntity={(article) => (
			<div className="group w-full overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/30">
				{/* Cover Image */}
				{article.image && (
					<div className="relative overflow-hidden bg-muted/30">
						<Image
							src={`${ASSETS_BASE_URL}/${article.image}`}
							alt={article.name}
							className="h-auto w-full object-contain"
						/>
						{/* Desktop Edit Indicator - Centered on image */}
						<div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
							<div className="flex items-center justify-center gap-2 rounded-md border border-border/30 bg-background/80 px-3 py-1.5 text-primary backdrop-blur-[2px]">
								<Edit className="h-4 w-4" />
								<span className="font-medium text-sm">Изменить</span>
							</div>
						</div>
					</div>
				)}

				<div className="flex flex-col p-4">
					{/* Title and status */}
					<div className="mb-2 flex items-start justify-between gap-2">
						<h3 className="line-clamp-2 font-medium text-sm">{article.name}</h3>
						<div className="flex shrink-0 items-center gap-1">
							{!article.isActive && (
								<Badge variant="secondary" className="text-xs">
									Скрыта
								</Badge>
							)}
						</div>
					</div>

					{/* Slug */}
					<span className="mb-2 text-muted-foreground text-xs">
						/{article.slug}
					</span>

					{/* Date */}
					<span className="mb-3 text-muted-foreground text-xs">
						{formatDate(article.publishedAt)}
					</span>

					{/* Body preview */}
					{article.body && (
						<p className="line-clamp-3 text-muted-foreground text-xs">
							{article.body}
						</p>
					)}

					{/* Desktop Edit Indicator (when no image) */}
					{!article.image && (
						<div className="mt-3 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
							<div className="flex items-center justify-center gap-2 rounded-md border border-border/30 bg-background/80 px-3 py-1.5 text-primary backdrop-blur-[2px]">
								<Edit className="h-4 w-4" />
								<span className="font-medium text-sm">Изменить</span>
							</div>
						</div>
					)}
				</div>
			</div>
		)}
	/>
);

export const Route = createFileRoute("/dashboard/news")({
	component: RouteComponent,
	validateSearch: zodValidator(simpleSearchSchema),

	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(newsQueryOptions());
	},
});

function RouteComponent() {
	const queryClient = useQueryClient();

	// Get search params from URL
	const searchParams = Route.useSearch();
	const searchTerm = searchParams.search ?? "";

	// Load news with Suspense (guaranteed to be loaded by loader)
	const { data: newsArticles } = useSuspenseQuery(newsQueryOptions());

	// Entity manager configuration
	const entityManagerConfig = {
		queryKey: ["bfloorNews"],
		queryFn: getAllNews,
		createFn: async (data: { data: NewsFormData }) => {
			await createNews({ data: data.data });
			// Also invalidate published news so home page carousel updates
			queryClient.invalidateQueries({
				queryKey: ["bfloorPublishedNews"],
			});
		},
		updateFn: async (data: { id: number; data: NewsFormData }) => {
			// Get the current news to check for old image
			const currentArticle = newsArticles.find((n) => n.id === data.id);
			const oldImage = currentArticle?.image || "";

			// Delete old image from R2 if it changed and exists
			if (
				oldImage &&
				oldImage !== data.data.image &&
				!oldImage.startsWith("images/staging/")
			) {
				try {
					await deleteProductImage({ data: { filename: oldImage } });
				} catch (deleteError) {
					console.warn("Failed to delete old news image:", deleteError);
					// Don't fail the update if deletion fails
				}
			}

			await updateNews({ data });
			// Also invalidate published news so home page carousel updates
			queryClient.invalidateQueries({
				queryKey: ["bfloorPublishedNews"],
			});
		},
		deleteFn: async (data: { id: number }) => {
			await deleteNews({ data });
			// Also invalidate published news so home page carousel updates
			queryClient.invalidateQueries({
				queryKey: ["bfloorPublishedNews"],
			});
		},
		entityName: "новость",
		entityNamePlural: "новости",
		emptyStateEntityType: "news",
		defaultFormData: {
			name: "",
			slug: "",
			image: "",
			body: "",
			publishedAt: new Date().toISOString().split("T")[0],
			isActive: true,
		} as NewsFormData,
		formFields: NewsFormFields,
		renderList: NewsList,
	} as unknown as EntityManagerConfig<News, NewsFormData>;

	return (
		<div className="h-full overflow-auto">
			<div className="space-y-6 px-6 py-6">
				<div>
					<h2 className="mb-4 font-semibold text-lg">Новости</h2>
					<DashboardEntityManager
						config={entityManagerConfig}
						data={newsArticles}
						searchTerm={searchTerm}
					/>
				</div>
			</div>
		</div>
	);
}
