/**
 * Store Page Skeleton
 * Loading state for the store index page
 * Matches the actual store page layout with proper spacing and structure
 */

// Simple fixed number of skeleton cards
const SKELETON_CARDS = Array.from(
	{ length: 18 },
	(_, i) => `store-skeleton-card-${i}`,
);

export function StorePageSkeleton() {
	return (
		<div className="flex min-h-screen flex-col">
			{/* Title and Filter Pills Section Skeleton */}
			<div className="px-4 pt-6 pb-4">
				{/* Title skeleton - taller to better match actual title */}
				<div className="h-10 w-48 animate-pulse rounded bg-muted md:h-12" />
			</div>

			{/* Products Grid Skeleton - no horizontal padding to match actual layout */}
			<div className="flex-1 py-4">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
					{SKELETON_CARDS.map((key) => (
						<div key={key} className="w-full bg-background">
							{/* Image skeleton - aspect-square to match ProductCard */}
							<div className="aspect-square animate-pulse bg-muted" />

							{/* Content skeleton - matching ProductCard structure */}
							<div className="flex flex-col space-y-2 p-4">
								{/* Price skeleton */}
								<div className="mb-2 h-7 w-20 animate-pulse rounded bg-muted" />

								{/* Product name skeleton */}
								<div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-muted" />

								{/* Mobile button skeleton */}
								<div className="mt-auto md:hidden">
									<div className="h-10 w-full animate-pulse rounded bg-muted" />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
