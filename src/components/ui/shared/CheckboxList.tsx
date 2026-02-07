import { Checkbox } from "~/components/ui/shared/Checkbox";

export interface CheckboxListItem {
	id: string | number;
	label: string;
	description?: string;
	isActive?: boolean; // For filtering inactive items
}

interface CheckboxListProps {
	items: CheckboxListItem[];
	selectedIds: (string | number)[];
	onItemChange: (itemId: string | number, checked: boolean) => void;
	idPrefix: string;
	showOnlyActive?: boolean; // Filter to show only active items
	scrollable?: boolean; // Enable scrollable container with limited height
	maxHeight?: string; // Max height for scrollable container (default: "200px")
	horizontal?: boolean; // Enable horizontal layout with wrapping (default: false)
}

export function CheckboxList({
	items,
	selectedIds,
	onItemChange,
	idPrefix,
	showOnlyActive = false,
	scrollable = false,
	maxHeight = "200px",
	horizontal = false,
}: CheckboxListProps) {
	// Filter items if needed
	const filteredItems = showOnlyActive
		? items.filter((item) => item.isActive !== false)
		: items;

	const content = (
		<div
			className={
				horizontal
					? "flex w-full flex-wrap gap-0"
					: "grid w-fit grid-cols-1 gap-0"
			}
		>
			{filteredItems.map((item) => {
				const isChecked = selectedIds.includes(item.id);

				// Debug logging for store locations
				if (idPrefix.includes("store-location")) {
					console.log(
						`[CheckboxList] Item ${item.id} (type: ${typeof item.id}), selectedIds:`,
						selectedIds,
						`(types: ${selectedIds.map((id) => typeof id).join(", ")})`,
						`isChecked: ${isChecked}`,
					);
				}

				return (
					<Checkbox
						key={item.id}
						id={`${idPrefix}-${item.id}`}
						name={`${idPrefix}-${item.id}`}
						checked={isChecked}
						onCheckedChange={(checked) => {
							onItemChange(item.id, !!checked);
						}}
						wrapperClassName="rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
						label={
							<div className="flex flex-col">
								<span className="font-medium text-sm">{item.label}</span>
								{item.description && (
									<span className="text-muted-foreground text-xs">
										{item.description}
									</span>
								)}
							</div>
						}
					/>
				);
			})}
		</div>
	);

	if (scrollable) {
		return (
			<div className="w-fit overflow-y-auto pr-2" style={{ maxHeight }}>
				{content}
			</div>
		);
	}

	return content;
}
