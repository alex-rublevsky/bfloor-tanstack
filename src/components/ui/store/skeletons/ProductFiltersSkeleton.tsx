import { useId } from "react";
import { Skeleton } from "~/components/ui/dashboard/skeleton";
import { useDeviceType } from "~/hooks/use-mobile";

export function ProductFiltersSkeleton() {
	const { isMobileOrTablet } = useDeviceType();
	const maskId = useId();

	return (
		<div
			className={`sticky top-3 z-10 mt-0 w-full overflow-hidden ${isMobileOrTablet ? "px-2" : ""}`}
			style={{ transform: "translateY(0%)" }} // Match the motion.div initial state
		>
			<div
				className={`relative ${isMobileOrTablet ? "mx-auto w-full max-w-screen-sm" : "mx-auto w-max"}`}
			>
				<div
					className="rounded-3xl bg-background/50"
					style={{
						position: "absolute",
						inset: 0,
						height: "200%",
						backdropFilter: "blur(9px) brightness(90%) saturate(140%)",
						WebkitBackdropFilter: "blur(9px) brightness(90%) saturate(140%)",
						maskImage: `url(#${maskId})`,
						WebkitMaskImage: `url(#${maskId})`,
						pointerEvents: "none",
					}}
				/>

				<svg
					className="absolute inset-0"
					width="100%"
					height="100%"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<title>Frosty glass effect mask</title>
					<mask id={maskId}>
						<rect width="100%" height="100%" fill="white" rx="24" ry="24" />
					</mask>
				</svg>

				<div
					className={`relative flex flex-col gap-3 ${isMobileOrTablet ? "px-4 sm:px-6" : "px-6"} py-3`}
				>
					{isMobileOrTablet ? (
						<>
							{/* First Row: Categories and Sort By */}
							<div className="flex items-start gap-4">
								{/* Categories section */}
								<div className="min-w-0 flex-1 overflow-hidden">
									<div className="space-y-2">
										<div className="relative h-4 font-medium text-sm">
											<span className="text-transparent">Categories</span>
											<Skeleton className="absolute inset-0" />
										</div>
										<div className="flex flex-wrap gap-1">
											<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
												<span className="text-transparent">All</span>
												<Skeleton className="absolute inset-0 rounded-full" />
											</div>
											<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
												<span className="text-transparent">Apparel</span>
												<Skeleton className="absolute inset-0 rounded-full" />
											</div>
											<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
												<span className="text-transparent">Category</span>
												<Skeleton className="absolute inset-0 rounded-full" />
											</div>
											<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
												<span className="text-transparent">Stickers</span>
												<Skeleton className="absolute inset-0 rounded-full" />
											</div>
											<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
												<span className="text-transparent">Produce</span>
												<Skeleton className="absolute inset-0 rounded-full" />
											</div>
										</div>
									</div>
								</div>

								{/* Sort By Filter - Right side, compact */}
								<div className="flex flex-shrink-0 flex-col gap-2">
									<div className="relative h-4 font-medium text-sm">
										<span className="text-transparent">Sort By</span>
										<Skeleton className="absolute inset-0" />
									</div>
									<div className="relative h-9 w-[15ch] rounded-md border border-border bg-background px-3 py-2 text-sm">
										<span className="flex items-center justify-between text-transparent">
											Relevant
											<svg
												width="15"
												height="15"
												viewBox="0 0 15 15"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												aria-hidden="true"
											>
												<path
													d="m4.93179 5.43179c0.20081-0.20081 0.52632-0.20081 0.72713 0l2.34108 2.34108 2.3411-2.34108c0.2008-0.20081 0.5263-0.20081 0.7271 0 0.2008 0.20081 0.2008 0.52632 0 0.72713l-2.7071 2.7071c-0.2008 0.2008-0.5263 0.2008-0.7271 0l-2.7071-2.7071c-0.20081-0.20081-0.20081-0.52632 0-0.72713z"
													fill="currentColor"
													fillRule="evenodd"
													clipRule="evenodd"
												></path>
											</svg>
										</span>
										<Skeleton className="absolute inset-0 rounded-md" />
									</div>
								</div>
							</div>

							{/* Price Range Filter - Full width */}
							<div className="w-full min-w-[13rem] space-y-4 pt-3 pb-5 sm:max-w-[20rem] lg:pt-0">
								<div className="flex items-center justify-between gap-2">
									<div className="relative h-4 font-medium text-sm">
										<span className="text-transparent">Price Range</span>
										<Skeleton className="absolute inset-0" />
									</div>
									<div className="relative h-4 font-medium text-sm tabular-nums">
										<span className="text-transparent">$0 - $100</span>
										<Skeleton className="absolute inset-0" />
									</div>
								</div>
								<div className="relative flex w-full touch-none select-none items-center pt-1.5 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
									<div className="relative h-0.5 w-full grow overflow-hidden rounded-full bg-secondary data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-2">
										<div
											className="absolute h-full bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
											style={{ left: "0%", width: "100%" }}
										/>
									</div>
									<div
										className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring/40 data-disabled:cursor-not-allowed"
										style={{
											position: "absolute",
											left: "0%",
											marginLeft: "-10px",
										}}
									/>
									<div
										className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring/40 data-disabled:cursor-not-allowed"
										style={{
											position: "absolute",
											left: "100%",
											marginLeft: "-10px",
										}}
									/>
								</div>
							</div>
						</>
					) : (
						/* Desktop Layout */
						<div className="flex gap-10">
							{/* Main Categories */}
							<div className="space-y-2">
								<div className="relative h-4 font-medium text-sm">
									<span className="text-transparent">Categories</span>
									<Skeleton className="absolute inset-0" />
								</div>
								<div className="flex flex-wrap gap-1">
									<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
										<span className="text-transparent">All</span>
										<Skeleton className="absolute inset-0 rounded-full" />
									</div>
									<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
										<span className="text-transparent">Apparel</span>
										<Skeleton className="absolute inset-0 rounded-full" />
									</div>
									<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
										<span className="text-transparent">Category</span>
										<Skeleton className="absolute inset-0 rounded-full" />
									</div>
									<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
										<span className="text-transparent">Stickers</span>
										<Skeleton className="absolute inset-0 rounded-full" />
									</div>
									<div className="relative rounded-full border border-border bg-background/80 px-2 py-1.5 font-medium text-xs md:px-4 md:py-2 md:text-sm">
										<span className="text-transparent">Produce</span>
										<Skeleton className="absolute inset-0 rounded-full" />
									</div>
								</div>
							</div>

							{/* Price Range Filter */}
							<div className="min-w-[13rem] space-y-4 sm:max-w-[20rem]">
								<div className="flex items-center justify-between gap-2">
									<div className="relative h-4 font-medium text-sm">
										<span className="text-transparent">Price Range</span>
										<Skeleton className="absolute inset-0" />
									</div>
									<div className="relative h-4 font-medium text-sm tabular-nums">
										<span className="text-transparent">$0 - $100</span>
										<Skeleton className="absolute inset-0" />
									</div>
								</div>
								<div className="relative flex w-full touch-none select-none items-center pt-1.5 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
									<div className="relative h-0.5 w-full grow overflow-hidden rounded-full bg-secondary data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-2">
										<div
											className="absolute h-full bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
											style={{ left: "0%", width: "100%" }}
										/>
									</div>
									<div
										className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring/40 data-disabled:cursor-not-allowed"
										style={{
											position: "absolute",
											left: "0%",
											marginLeft: "-10px",
										}}
									/>
									<div
										className="block h-5 w-5 cursor-grab rounded-full border-2 border-primary bg-background transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring/40 data-disabled:cursor-not-allowed"
										style={{
											position: "absolute",
											left: "100%",
											marginLeft: "-10px",
										}}
									/>
								</div>
							</div>

							{/* Sort By Filter */}
							<div className="flex flex-col gap-2">
								<div className="relative h-4 font-medium text-sm">
									<span className="text-transparent">Sort By</span>
									<Skeleton className="absolute inset-0" />
								</div>
								<div className="relative h-9 w-[15ch] rounded-md border border-border bg-background px-3 py-2 text-sm">
									<span className="flex items-center justify-between text-transparent">
										Relevant
										<svg
											width="15"
											height="15"
											viewBox="0 0 15 15"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											aria-hidden="true"
										>
											<path
												d="m4.93179 5.43179c0.20081-0.20081 0.52632-0.20081 0.72713 0l2.34108 2.34108 2.3411-2.34108c0.2008-0.20081 0.5263-0.20081 0.7271 0 0.2008 0.20081 0.2008 0.52632 0 0.72713l-2.7071 2.7071c-0.2008 0.2008-0.5263 0.2008-0.7271 0l-2.7071-2.7071c-0.20081-0.20081-0.20081-0.52632 0-0.72713z"
												fill="currentColor"
												fillRule="evenodd"
												clipRule="evenodd"
											></path>
										</svg>
									</span>
									<Skeleton className="absolute inset-0 rounded-md" />
								</div>
							</div>
						</div>
					)}

					{/* Bottom handle indicator */}
					<div className="mx-auto h-1.5 w-[5rem] shrink-0 rounded-full bg-secondary" />
				</div>
			</div>
		</div>
	);
}
