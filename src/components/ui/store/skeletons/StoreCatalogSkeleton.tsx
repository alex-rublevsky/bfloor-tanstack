/**
 * Store Catalog Skeleton
 * Loading state for /store (category picker grid)
 */

const SKELETON_CARDS = 8;
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_CARDS },
	(_, i) => `skeleton-card-${i}`,
);

export function StoreCatalogSkeleton() {
	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col">
			<div className="min-h-0 flex-1">
				<div className="py-6 md:py-10">
					<div className="mb-6 h-8 w-32 animate-pulse rounded bg-muted px-4 md:mb-8 md:h-9" />
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
						{SKELETON_KEYS.map((key) => (
							<div key={key} className="overflow-hidden border border-border">
								<div className="aspect-square animate-pulse bg-muted" />
								<div className="space-y-2 p-3 md:p-4">
									<div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
									<div className="h-4 w-16 animate-pulse rounded bg-muted" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
