import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	DrawerBody,
	DrawerClose,
	DrawerHeader,
	DrawerTitle,
} from "~/components/ui/shared/Drawer";
import { Link } from "~/components/ui/shared/Link";
import { usePrefetch } from "~/hooks/usePrefetch";
import {
	categoriesQueryOptions,
	productCategoryCountsQueryOptions,
} from "~/lib/queryOptions";

export function CatalogDrawerContent() {
	const { data: categories = [] } = useQuery({
		...categoriesQueryOptions(),
	});

	// Load category counts separately (streams in after categories)
	const { data: counts } = useQuery(productCategoryCountsQueryOptions());

	// Get prefetch hook for category hover
	const { prefetchStoreWithCategory } = usePrefetch();

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
		<>
			<DrawerHeader>
				<DrawerTitle>Каталог</DrawerTitle>
			</DrawerHeader>

			<DrawerBody>
				{activeCategories.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center">
						<p className="text-muted-foreground">Нет категорий</p>
					</div>
				) : (
					<div className="space-y-0">
						{activeCategories.map((category) => (
							<DrawerClose asChild key={category.slug}>
								<Link
									href={`/store/${category.slug}`}
									variant="category"
									disableAnimation={true}
									onMouseEnter={() => {
										// Prefetch store data for this category on hover
										prefetchStoreWithCategory(category.slug);
									}}
								>
									<span className="wrap-break-word min-w-0 flex-1 pr-3">
										{category.name}
									</span>
									{category.productCount !== null && (
										<span className="shrink-0 text-xs opacity-70">
											{category.productCount}
										</span>
									)}
								</Link>
							</DrawerClose>
						))}
					</div>
				)}
			</DrawerBody>
		</>
	);
}
