import { Skeleton } from "~/components/ui/dashboard/skeleton";

export function ProductsPageSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header with Search - exact match */}
			<div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative text-muted-foreground">
					<span className="invisible">Loading products...</span>
					<Skeleton className="absolute inset-0" />
				</div>
				<div className="relative w-full sm:w-64">
					<input
						type="text"
						className="invisible h-10 w-full"
						tabIndex={-1}
						aria-hidden="true"
					/>
					<Skeleton className="absolute inset-0" />
				</div>
			</div>

			{/* Products Groups */}
			<div className="space-y-8">
				{/* First Group */}
				<div className="space-y-4">
					{/* Group Title - using real text elements for exact height */}
					<div className="px-4">
						<h2 className="relative flex items-baseline gap-1 font-semibold text-2xl text-foreground">
							<span className="invisible">Loading</span>
							<Skeleton className="absolute inset-0 w-64" />
						</h2>
					</div>
					<div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
						{Array.from({ length: 12 }, () => (
							<ProductCardSkeleton key={crypto.randomUUID()} />
						))}
					</div>
				</div>

				{/* No divider */}

				{/* Second Group */}
				<div className="space-y-4">
					{/* Group Title - using real text elements for exact height */}
					<div className="px-4">
						<h2 className="relative flex items-baseline gap-1 font-semibold text-2xl text-foreground">
							<span className="invisible">Loading</span>
							<Skeleton className="absolute inset-0 w-56" />
						</h2>
					</div>
					<div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
						{Array.from({ length: 8 }, () => (
							<ProductCardSkeleton key={crypto.randomUUID()} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function ProductCardSkeleton() {
	return (
		<div className="overflow-hidden bg-background">
			{/* Image - no rounded corners */}
			<div className="relative aspect-square">
				<Skeleton className="absolute inset-0 h-full w-full rounded-none" />
			</div>

			{/* Content Section - exact match to real card */}
			<div className="flex h-auto flex-col md:h-full">
				{/* Info Section */}
				<div className="flex h-auto flex-col p-4 md:h-full">
					{/* Price - using real h5 element for exact height */}
					<div className="mb-2 flex flex-col">
						<div className="flex w-full flex-wrap items-center justify-between gap-x-2">
							<div className="flex flex-col items-baseline gap-1">
								<h5 className="relative whitespace-nowrap">
									<span className="invisible">00.00 р</span>
									<Skeleton className="absolute inset-0 w-24" />
								</h5>
							</div>
						</div>
					</div>

					{/* Product Name - using real div element for exact height */}
					<div className="relative mb-3">
						<span className="invisible">Loading product name</span>
						<Skeleton className="absolute inset-0" />
					</div>

					{/* Metadata - using real text elements with exact spacing */}
					<div className="space-y-1 text-sm">
						{/* Category */}
						<div className="relative">
							<span className="invisible text-muted-foreground">Category</span>
							<Skeleton className="absolute inset-0 w-20" />
						</div>

						{/* Stock */}
						<div className="relative">
							<span className="invisible text-muted-foreground text-xs">
								Stock: 100
							</span>
							<Skeleton className="absolute inset-0 w-24" />
						</div>
					</div>
				</div>

				{/* Mobile Action Buttons - exact match to real buttons */}
				<div className="mt-auto flex items-stretch md:hidden">
					<button
						type="button"
						className="relative flex flex-1 items-center justify-center space-x-2 px-4 py-2"
						disabled
					>
						<span className="invisible">Edit</span>
						<Skeleton className="absolute inset-0 rounded-none" />
					</button>
					<button
						type="button"
						className="relative flex w-12 items-center justify-center"
						disabled
					>
						<span className="invisible">X</span>
						<Skeleton className="absolute inset-0 rounded-none" />
					</button>
				</div>
			</div>
		</div>
	);
}
