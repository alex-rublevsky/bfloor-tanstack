import { Skeleton } from "~/components/ui/dashboard/skeleton";

export function CategoriesPageSkeleton() {
	return (
		<div className="space-y-6 px-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="relative">
						<span className="invisible">Categories Management</span>
						<Skeleton className="absolute inset-0 w-48" />
					</h1>
				</div>
			</div>

			{/* Two-column layout for categories */}
			<div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
				{/* Product Categories Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="relative font-medium text-lg">
							<span className="invisible">Product Categories</span>
							<Skeleton className="absolute inset-0 w-40" />
						</h3>
						<div className="relative">
							<button type="button" className="invisible h-8 px-3" disabled>
								<span>Add Category</span>
							</button>
							<Skeleton className="absolute inset-0 rounded" />
						</div>
					</div>

					<div>
						<div className="overflow-x-auto">
							<table className="min-w-full">
								<tbody className="divide-y divide-border">
									{Array.from({ length: 5 }, (_, index) => (
										<tr
											key={`product-category-skeleton-${Date.now()}-${index}`}
											className="hover:bg-muted/30"
										>
											<td className="px-1 py-4">
												<div>
													<div className="relative font-medium">
														<span className="invisible">Category Name</span>
														<Skeleton className="absolute inset-0 w-32" />
													</div>
													<div className="relative mt-1 text-muted-foreground text-sm">
														<span className="invisible">category-slug</span>
														<Skeleton className="absolute inset-0 w-24" />
													</div>
												</div>
											</td>
											<td className="px-1 py-4">
												<div className="relative">
													<span className="invisible">Active</span>
													<Skeleton className="absolute inset-0 h-6 w-16 rounded-full" />
												</div>
											</td>
											<td className="px-1 py-4 text-right">
												<div className="flex justify-end space-x-2">
													<div className="relative">
														<button
															type="button"
															className="invisible h-8 px-3"
															disabled
														>
															<span>Edit</span>
														</button>
														<Skeleton className="absolute inset-0 rounded" />
													</div>
													<div className="relative">
														<button
															type="button"
															className="invisible h-8 px-3"
															disabled
														>
															<span>Delete</span>
														</button>
														<Skeleton className="absolute inset-0 rounded" />
													</div>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Categories Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="relative font-medium text-lg">
							<span className="invisible">Categories</span>
							<Skeleton className="absolute inset-0 w-32" />
						</h3>
						<div className="relative">
							<button type="button" className="invisible h-8 px-3" disabled>
								<span>Add Category</span>
							</button>
							<Skeleton className="absolute inset-0 rounded" />
						</div>
					</div>

					<div>
						<div className="overflow-x-auto">
							<table className="min-w-full">
								<tbody className="divide-y divide-border">
									{Array.from({ length: 4 }, (_, index) => (
										<tr
											key={`category-skeleton-${Date.now()}-${index}`}
											className="hover:bg-muted/30"
										>
											<td className="px-1 py-4">
												<div>
													<div className="relative font-medium">
														<span className="invisible">Category Name</span>
														<Skeleton className="absolute inset-0 w-36" />
													</div>
													<div className="relative mt-1 text-muted-foreground text-sm">
														<span className="invisible">category-slug</span>
														<Skeleton className="absolute inset-0 w-28" />
													</div>
												</div>
											</td>
											<td className="px-1 py-4">
												<div className="relative">
													<span className="invisible">Active</span>
													<Skeleton className="absolute inset-0 h-6 w-16 rounded-full" />
												</div>
											</td>
											<td className="px-1 py-4 text-right">
												<div className="flex justify-end space-x-2">
													<div className="relative">
														<button
															type="button"
															className="invisible h-8 px-3"
															disabled
														>
															<span>Edit</span>
														</button>
														<Skeleton className="absolute inset-0 rounded" />
													</div>
													<div className="relative">
														<button
															type="button"
															className="invisible h-8 px-3"
															disabled
														>
															<span>Delete</span>
														</button>
														<Skeleton className="absolute inset-0 rounded" />
													</div>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
