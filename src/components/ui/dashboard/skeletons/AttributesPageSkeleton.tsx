import { Skeleton } from "~/components/ui/dashboard/skeleton";

// Generate stable keys for skeleton items
const SKELETON_KEYS = Array.from(
	{ length: 10 },
	(_, i) => `attribute-skeleton-${i}`,
);

export function AttributesPageSkeleton() {
	return (
		<div className="space-y-6 px-6 py-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="relative">
						<span className="invisible">Attributes Management</span>
						<Skeleton className="absolute inset-0 w-48" />
					</h1>
				</div>
			</div>

			{/* Attributes Grid */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
				{SKELETON_KEYS.map((key) => (
					<div
						key={key}
						className="space-y-2 rounded-lg border border-muted bg-card p-4"
					>
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<span className="invisible">Attribute Name</span>
								<Skeleton className="absolute inset-0 w-24" />
							</div>
							<div className="relative">
								<span className="invisible">0</span>
								<Skeleton className="absolute inset-0 h-4 w-6 rounded" />
							</div>
						</div>
						<div className="relative">
							<span className="invisible text-xs">attribute-slug</span>
							<Skeleton className="absolute inset-0 h-3 w-20" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
