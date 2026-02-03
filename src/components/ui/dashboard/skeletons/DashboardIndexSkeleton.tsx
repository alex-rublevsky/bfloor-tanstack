import { Skeleton } from "~/components/ui/dashboard/skeleton";

const ROW_KEYS = Array.from(
	{ length: 18 },
	(_, i) => `dashboard-index-skeleton-row-${i}`,
);

const COLUMN_SIZES = [50, 100, 300, 150, 150, 100, 110] as const;
const COLUMN_ROLES = [
	"select",
	"photo",
	"name",
	"price",
	"category",
	"brand",
	"views",
] as const;

function TableHeaderSkeleton() {
	return (
		<div className="border-t bg-background">
			<div className="px-4">
				<div className="flex border-b">
					{COLUMN_SIZES.map((width) => (
						<div
							key={`header-${width}`}
							className="flex items-center border-r px-4 py-3 last:border-r-0"
							style={{ width: `${width}px` }}
						>
							<Skeleton className="h-4 w-full max-w-16 rounded" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function TableBodySkeleton() {
	return (
		<div className="px-4">
			{ROW_KEYS.map((key) => (
				<div key={key} className="flex border-b py-3" style={{ minHeight: 65 }}>
					{COLUMN_ROLES.map((role, idx) => (
						<div
							key={`${key}-col-${role}`}
							className="flex items-center border-r px-4 last:border-r-0"
							style={{ width: `${COLUMN_SIZES[idx]}px` }}
						>
							{role === "select" && <Skeleton className="h-4 w-4 rounded" />}
							{role === "photo" && (
								<Skeleton className="h-16 w-16 rounded-md" />
							)}
							{role === "name" && (
								<Skeleton className="h-4 w-3/4 max-w-[200px] rounded" />
							)}
							{role === "price" && <Skeleton className="h-4 w-16 rounded" />}
							{role === "category" && <Skeleton className="h-4 w-20 rounded" />}
							{role === "brand" && <Skeleton className="h-4 w-12 rounded" />}
							{role === "views" && <Skeleton className="h-4 w-10 rounded" />}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

export function DashboardIndexSkeleton({
	tableOnly = false,
}: {
	tableOnly?: boolean;
}) {
	if (tableOnly) {
		return (
			<div>
				<TableHeaderSkeleton />
				<TableBodySkeleton />
			</div>
		);
	}

	return (
		<div>
			{/* Sticky filters + table header - match dashboard-sticky-filters */}
			<div className="sticky top-0 z-9999 overflow-visible border-border border-b bg-background/80 backdrop-blur-sm">
				{/* Filters bar skeleton */}
				<div className="flex flex-wrap items-center gap-3 px-4 py-3">
					<Skeleton className="h-9 w-32 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
					<Skeleton className="h-9 w-24 rounded-md" />
					<Skeleton className="h-9 w-36 rounded-md" />
				</div>

				<TableHeaderSkeleton />
			</div>

			<TableBodySkeleton />
		</div>
	);
}
