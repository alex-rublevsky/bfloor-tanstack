import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import styles from "~/components/ui/store/productCard.module.css";
import { StoreCatalogSkeleton } from "~/components/ui/store/skeletons/StoreCatalogSkeleton";
import { CATEGORY_CATALOG_IMAGES } from "~/constants/categoryCatalogImages";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { usePrefetch } from "~/hooks/usePrefetch";
import {
	categoriesQueryOptions,
	productCategoryCountsQueryOptions,
} from "~/lib/queryOptions";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/store/")({
	component: StoreCatalogPage,
	pendingComponent: StoreCatalogSkeleton,
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData(categoriesQueryOptions()),
			queryClient.ensureQueryData(productCategoryCountsQueryOptions()),
		]);
	},
	head: () => ({
		meta: [
			...seo({
				title: "Каталог - BeautyFloor",
				description:
					"Ламинат, инженерная доска, ковролин и другие напольные покрытия во Владивостоке",
			}),
		],
	}),
});

// Placeholder when category has no image (for later: replace with real images)
const CategoryImagePlaceholder = ({ className }: { className?: string }) => (
	<div
		className={`flex items-center justify-center bg-muted ${className}`}
		aria-hidden
	>
		<svg
			className="h-12 w-12 text-muted-foreground/60"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<title>Категория</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
	</div>
);

function StoreCatalogPage() {
	const { prefetchStoreWithCategory } = usePrefetch();
	const { data: categories = [] } = useSuspenseQuery(categoriesQueryOptions());
	const { data: counts } = useSuspenseQuery(
		productCategoryCountsQueryOptions(),
	);

	// Filter active categories and sort by order
	// Exclude categories with count 0 or errors (missing from counts when counts is loaded)
	const activeCategories = useMemo(() => {
		return categories
			.filter((cat) => cat.isActive)
			.map((category) => ({
				...category,
				productCount: counts?.[category.slug] ?? null, // null = still loading or missing
			}))
			.filter((category) => {
				// If counts haven't loaded yet, show all categories
				if (counts === undefined) return true;
				// If counts have loaded, only show categories with count > 0
				// Missing from counts object means 0 products or error
				const count = counts[category.slug];
				return count !== undefined && count > 0;
			})
			.sort((a, b) => a.order - b.order);
	}, [categories, counts]);

	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col">
			{/* Catalog grid - same format as StoreProductGrid (px-4, no max-w); window scrolls so navbar hide/show on scroll works */}
			<div className="min-h-0 flex-1">
				{/* Same format as $categorySlug: title has px-4, grid is edge-to-edge (no horizontal padding) */}
				<div className="py-6 md:py-10">
					<h1 className="mb-6 px-4 font-semibold text-2xl md:mb-8 md:text-3xl">
						Каталог
					</h1>

					{activeCategories.length === 0 ? (
						<div className="flex flex-col items-center justify-center px-4 py-20 text-muted-foreground">
							<p>Нет категорий</p>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
							{activeCategories.map((category) => {
								const entry = CATEGORY_CATALOG_IMAGES[category.slug];
								const imagePath = entry?.image ?? category.image;
								return (
									<Link
										key={category.slug}
										to="/store/$categorySlug"
										params={{ categorySlug: category.slug }}
										viewTransition={true}
										preload="intent"
										onMouseEnter={() =>
											prefetchStoreWithCategory(category.slug)
										}
										className="relative block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										{/* Card structure matching ProductCard (product-card, overflow-hidden, group, transition-standard) */}
										<div
											className={`product-card group w-full overflow-hidden transition-standard ${styles.categoryCard}`}
										>
											<div className="flex flex-col bg-background">
												{/* Image: same as ProductCard – relative aspect-square overflow-hidden */}
												<div className="relative aspect-square overflow-hidden">
													<div className="relative flex aspect-square items-center justify-center overflow-hidden">
														{imagePath ? (
															<img
																src={`${ASSETS_BASE_URL}/${imagePath}`}
																alt={category.name}
																className="absolute inset-0 h-full w-full object-cover object-center transition-standard"
																style={{
																	viewTransitionName: entry?.productSlug
																		? `product-image-${entry.productSlug}`
																		: undefined,
																}}
															/>
														) : (
															<CategoryImagePlaceholder className="absolute inset-0 h-full w-full" />
														)}
													</div>
												</div>

												{/* Content: same structure as ProductCard – flex flex-col, padding, name + count */}
												<div className="flex h-auto flex-col pb-4 md:h-full md:p-4">
													<div className="flex h-auto flex-col px-4 pt-4 md:h-full md:px-0 md:pt-0">
														<div className="mb-2 flex flex-col">
															<p className="text-foreground">{category.name}</p>
															{category.productCount !== null && (
																<span className="mt-0.5 text-muted-foreground text-sm">
																	{category.productCount} товаров
																</span>
															)}
														</div>
													</div>
												</div>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
