import { createFileRoute } from "@tanstack/react-router";
import { EntityCardContent } from "~/components/ui/dashboard/EntityCardContent";
import { getAllStoreLocations } from "~/data/storeLocations";

export const Route = createFileRoute("/dashboard/misc")({
	component: RouteComponent,
});

function RouteComponent() {
	// Get store locations from hardcoded data
	const locations = getAllStoreLocations();

	return (
		<div className="space-y-6 px-6 py-6">
			{/* Main grid layout - 3 columns on desktop, 1 column on mobile */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Store Addresses Card - Read Only */}
				<div className="space-y-4">
					<div className="flex flex-col gap-2">
						<h3 className="font-semibold text-lg">Адреса магазинов</h3>
					</div>

					{/* Use EntityCardGrid container styling but with custom cards */}
					<div className="rounded-lg border border-border bg-transparent p-4">
						<div className="grid grid-cols-1 gap-3">
							{locations.map((location) => (
								<div
									key={location.id}
									className="flex w-full flex-col rounded-md border border-border bg-muted/30 p-3"
								>
									<div className="flex items-center space-x-2">
										<EntityCardContent
											name={location.address}
											secondaryInfo={location.description || undefined}
										/>
									</div>
									{location.openingHours && (
										<div className="mt-2 ml-0 whitespace-pre-line break-words text-muted-foreground text-xs">
											{location.openingHours}
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Placeholder for future cards */}
				<div className="space-y-6 lg:col-span-2">
					{/* Additional cards will be added here in the future */}
				</div>
			</div>
		</div>
	);
}
