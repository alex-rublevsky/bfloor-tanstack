export function OrdersPageSkeleton() {
	return (
		<div className="animate-pulse space-y-6">
			{/* Header with count and search */}
			<div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="h-5 w-32 rounded bg-muted"></div>
				<div className="h-10 w-full rounded bg-muted sm:w-64"></div>
			</div>

			{/* Orders Groups */}
			<div className="space-y-8">
				{/* Group 1 */}
				<div className="space-y-4">
					{/* Group Title */}
					<div className="px-4">
						<div className="h-8 w-48 rounded bg-muted"></div>
					</div>

					{/* Orders Grid */}
					<div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
						{Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
							<div
								key={key}
								className="space-y-4 rounded-lg border bg-card p-4"
							>
								{/* Header */}
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 space-y-2">
										<div className="h-4 w-16 rounded bg-muted"></div>
										<div className="h-3 w-24 rounded bg-muted"></div>
									</div>
									<div className="h-5 w-16 rounded-full bg-muted"></div>
								</div>

								{/* Order Items */}
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<div className="h-12 w-12 rounded bg-muted"></div>
										<div className="flex-1 space-y-1">
											<div className="h-3 w-full rounded bg-muted"></div>
											<div className="h-3 w-2/3 rounded bg-muted"></div>
										</div>
										<div className="h-3 w-12 rounded bg-muted"></div>
									</div>
									<div className="h-3 w-24 rounded bg-muted"></div>
								</div>

								{/* Customer Info */}
								<div className="space-y-1">
									<div className="h-3 w-full rounded bg-muted"></div>
									<div className="h-3 w-3/4 rounded bg-muted"></div>
								</div>

								{/* Price and Toggle */}
								<div className="flex items-center justify-between border-t pt-2">
									<div className="h-5 w-20 rounded bg-muted"></div>
									<div className="h-8 w-24 rounded bg-muted"></div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
