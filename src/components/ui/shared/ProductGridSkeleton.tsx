/**
 * Reusable product grid skeleton component
 * Used on both store page and dashboard products page during loading.
 * @param gridClassName - Optional. Use "px-4" for padded layout (e.g. dashboard); omit for edge-to-edge (store).
 */
export function ProductGridSkeleton({
	itemCount = 18,
	gridClassName,
}: {
	itemCount?: number;
	gridClassName?: string;
}) {
	return (
		<div className="flex-1 py-4">
			<div
				className={`grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 ${gridClassName ?? ""}`}
			>
				{Array.from({ length: itemCount }, (_, i) => `skeleton-${i}`).map(
					(key) => (
						<div key={key} className="w-full bg-background">
							<div className="aspect-square animate-pulse bg-muted" />
							<div className="flex flex-col space-y-2 p-4">
								<div className="mb-2 h-7 w-20 animate-pulse rounded bg-muted" />
								<div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-muted" />
								<div className="mt-auto md:hidden">
									<div className="h-10 w-full animate-pulse rounded bg-muted" />
								</div>
							</div>
						</div>
					),
				)}
			</div>
		</div>
	);
}
