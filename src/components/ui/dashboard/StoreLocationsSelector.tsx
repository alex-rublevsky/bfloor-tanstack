import {
	CheckboxList,
	type CheckboxListItem,
} from "~/components/ui/shared/CheckboxList";
import type { StoreLocation } from "~/data/storeLocations";

interface StoreLocationsSelectorProps {
	storeLocations: StoreLocation[];
	selectedLocationIds: number[];
	onLocationChange: (locationId: number, checked: boolean) => void;
	idPrefix: "edit" | "add" | "create";
}

export function StoreLocationsSelector({
	storeLocations,
	selectedLocationIds,
	onLocationChange,
	idPrefix,
}: StoreLocationsSelectorProps) {
	// Debug logging
	console.log(
		"[StoreLocationsSelector] Selected location IDs:",
		selectedLocationIds,
	);
	console.log("[StoreLocationsSelector] Store locations:", storeLocations);

	// Convert store locations to CheckboxListItem format
	const checkboxItems: CheckboxListItem[] = storeLocations.map((location) => ({
		id: location.id,
		label: location.address,
		description: location.description || undefined,
		isActive: true, // All store locations are active by default
	}));

	return (
		<CheckboxList
			items={checkboxItems}
			selectedIds={selectedLocationIds}
			onItemChange={(itemId, checked) => {
				console.log(
					"[StoreLocationsSelector] Location change:",
					itemId,
					checked,
				);
				onLocationChange(itemId as number, checked);
			}}
			idPrefix={`${idPrefix}-store-location`}
			showOnlyActive={true}
		/>
	);
}
