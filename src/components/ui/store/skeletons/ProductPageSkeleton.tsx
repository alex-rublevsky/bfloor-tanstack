import { Skeleton } from "~/components/ui/dashboard/skeleton";

// ImageGallery Skeleton Component
function ImageGallerySkeleton() {
	return (
		<div className="gallery-stack flex w-full flex-col gap-2 lg:flex-row lg:pt-4 lg:pb-4 lg:pl-4">
			{/* Thumbnails */}
			<div className="scrollbar-none order-2 w-full shrink-0 overflow-x-auto lg:order-1 lg:w-24 lg:overflow-x-hidden">
				{/* Scrollable container */}
				<div className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-4 lg:flex-col lg:overflow-y-auto lg:px-0">
					{/* Multiple thumbnail skeletons */}
					{[
						<div
							key="thumbnail-1"
							className="relative h-24 w-24 shrink-0 last:mb-2"
						>
							<div className="absolute inset-0 overflow-hidden rounded-sm">
								<Skeleton className="h-full w-full rounded-sm" />
							</div>
						</div>,
						<div
							key="thumbnail-2"
							className="relative h-24 w-24 shrink-0 last:mb-2"
						>
							<div className="absolute inset-0 overflow-hidden rounded-sm">
								<Skeleton className="h-full w-full rounded-sm" />
							</div>
						</div>,
						<div
							key="thumbnail-3"
							className="relative h-24 w-24 shrink-0 last:mb-2"
						>
							<div className="absolute inset-0 overflow-hidden rounded-sm">
								<Skeleton className="h-full w-full rounded-sm" />
							</div>
						</div>,
						<div
							key="thumbnail-4"
							className="relative h-24 w-24 shrink-0 last:mb-2"
						>
							<div className="absolute inset-0 overflow-hidden rounded-sm">
								<Skeleton className="h-full w-full rounded-sm" />
							</div>
						</div>,
					]}
				</div>
			</div>

			{/* Main image */}
			<div className="relative order-1 flex grow items-center justify-center lg:items-start lg:justify-start">
				<div className="relative h-[60vh] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth lg:h-auto lg:snap-none lg:overflow-x-hidden">
					{/* Mobile sliding images container */}
					<div className="flex h-full lg:hidden">
						{[
							<div
								key="mobile-image-1"
								className="flex w-full shrink-0 snap-center items-center justify-center"
							>
								<div className="relative flex h-full w-full items-center justify-center">
									<div className="relative flex h-full w-auto items-center justify-center">
										<Skeleton className="aspect-square h-full max-h-[60vh] w-auto rounded-none" />
									</div>
								</div>
							</div>,
							<div
								key="mobile-image-2"
								className="flex w-full shrink-0 snap-center items-center justify-center"
							>
								<div className="relative flex h-full w-full items-center justify-center">
									<div className="relative flex h-full w-auto items-center justify-center">
										<Skeleton className="aspect-square h-full max-h-[60vh] w-auto rounded-none" />
									</div>
								</div>
							</div>,
							<div
								key="mobile-image-3"
								className="flex w-full shrink-0 snap-center items-center justify-center"
							>
								<div className="relative flex h-full w-full items-center justify-center">
									<div className="relative flex h-full w-auto items-center justify-center">
										<Skeleton className="aspect-square h-full max-h-[60vh] w-auto rounded-none" />
									</div>
								</div>
							</div>,
							<div
								key="mobile-image-4"
								className="flex w-full shrink-0 snap-center items-center justify-center"
							>
								<div className="relative flex h-full w-full items-center justify-center">
									<div className="relative flex h-full w-auto items-center justify-center">
										<Skeleton className="aspect-square h-full max-h-[60vh] w-auto rounded-none" />
									</div>
								</div>
							</div>,
						]}
					</div>

					{/* Desktop selected image */}
					<div className="hidden lg:block">
						<Skeleton className="aspect-square h-auto max-h-[calc(100vh-5rem)] w-auto rounded-lg" />
					</div>
				</div>
			</div>
		</div>
	);
}

export function ProductPageSkeleton() {
	return (
		<div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
			<div className="flex grow items-start justify-center">
				<div className="flex h-full w-full flex-col items-start gap-0 lg:flex-row lg:gap-10">
					{/* Image gallery section */}
					<div className="flex w-full flex-col gap-2 self-start lg:h-full lg:w-3/5 lg:flex-row xl:w-2/3">
						<ImageGallerySkeleton />
					</div>

					{/* Product information section */}
					<div className="scrollbar-none w-full px-4 pt-4 pb-20 lg:h-[100dvh] lg:w-2/5 lg:overflow-y-auto lg:px-0 lg:pr-4 xl:w-1/3">
						<div className="w-full space-y-6">
							{/* Product name */}
							<Skeleton className="h-8 w-3/4" />

							{/* Price section */}
							<div className="flex items-center gap-4">
								<Skeleton className="h-6 w-32" />
								<Skeleton className="h-6 w-20" />
							</div>

							{/* Variation selection */}
							<div className="flex flex-wrap gap-4">
								{/* First variation group */}
								<div className="space-y-2">
									<Skeleton className="h-5 w-12" />
									<div className="flex flex-wrap gap-2">
										<Skeleton className="h-10 w-12 rounded-full" />
										<Skeleton className="h-10 w-12 rounded-full" />
										<Skeleton className="h-10 w-12 rounded-full" />
									</div>
								</div>

								{/* Second variation group */}
								<div className="space-y-2">
									<Skeleton className="h-5 w-16" />
									<div className="flex flex-wrap gap-2">
										<Skeleton className="h-10 w-16 rounded-full" />
										<Skeleton className="h-10 w-20 rounded-full" />
									</div>
								</div>
							</div>

							{/* Quantity selector and Add to cart */}
							<div className="flex flex-wrap items-center gap-4">
								<Skeleton className="h-12 w-32" />
								<Skeleton className="h-12 w-32" />
							</div>

							{/* Blog post link */}
							<div className="pt-4">
								<Skeleton className="h-5 w-48" />
							</div>

							{/* Product description */}
							<div className="prose max-w-none space-y-3">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-5/6" />
								<Skeleton className="h-4 w-4/5" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>

							{/* Metadata */}
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 w-24" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton className="h-4 w-12" />
									<Skeleton className="h-4 w-20" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
