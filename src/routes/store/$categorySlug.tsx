import {
	createFileRoute,
	notFound,
	stripSearchParams,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { StoreProductGrid } from "~/components/ui/store/StoreProductGrid";
import { brandQueryOptions, categoryQueryOptions } from "~/lib/queryOptions";
import { seo } from "~/utils/seo";
import {
	defaultStoreSearchValues,
	storeSearchParamsSchema,
} from "~/utils/storePageUtils";

export const Route = createFileRoute("/store/$categorySlug")({
	component: StoreSlugPage,
	validateSearch: zodValidator(storeSearchParamsSchema),
	// Strip default values from URL to keep it clean
	search: {
		middlewares: [stripSearchParams(defaultStoreSearchValues)],
	},
	loader: async ({ params, context: { queryClient } }) => {
		const slug = params.categorySlug;

		// Resolve slug: category first (takes precedence), then brand if not found
		// Uses ensureQueryData for caching (7 days staleTime, 14 days gcTime)
		// - If cached → returns instantly
		// - If stale → returns cached, refetches in background
		// - If not found → queryOptions converts to notFound() automatically
		try {
			const category = await queryClient.ensureQueryData(
				categoryQueryOptions(slug),
			);
			if (category?.isActive) {
				return { type: "category" as const, category };
			}
		} catch {
			// Category not found or inactive, try brand
		}

		// Fallback to brand
		try {
			const brand = await queryClient.ensureQueryData(brandQueryOptions(slug));
			if (brand?.isActive) {
				return { type: "brand" as const, brand };
			}
		} catch {
			// Brand not found or inactive
		}

		throw notFound();
	},
	head: ({ loaderData }) => {
		const title =
			loaderData?.type === "category"
				? `${loaderData.category.name} - BeautyFloor`
				: loaderData?.type === "brand"
					? `${loaderData.brand.name} - BeautyFloor`
					: "Каталог - BeautyFloor";
		const description =
			loaderData?.type === "category"
				? `${loaderData.category.name} - Напольные покрытия во Владивостоке`
				: loaderData?.type === "brand"
					? `${loaderData.brand.name} - Напольные покрытия во Владивостоке`
					: "Каталог напольных покрытий во Владивостоке";
		return {
			meta: [...seo({ title, description })],
		};
	},
});

function StoreSlugPage() {
	const { categorySlug: slug } = Route.useParams();
	const loaderData = Route.useLoaderData();
	const searchParams = Route.useSearch();
	const navigate = Route.useNavigate();

	const isCategory = loaderData?.type === "category";
	const isBrand = loaderData?.type === "brand";

	return (
		<StoreProductGrid
			categorySlug={isCategory ? slug : undefined}
			categoryName={isCategory ? loaderData.category.name : null}
			brandSlug={isBrand ? slug : undefined}
			brand={
				isBrand
					? { slug: loaderData.brand.slug, name: loaderData.brand.name }
					: undefined
			}
			searchParams={searchParams}
			navigate={navigate}
		/>
	);
}
