import * as React from "react";
import { cn } from "~/lib/utils";

// Meta component that provides the exact look and feel of the categories page
export interface EntityCardProps<T> {
	entity: T;
	onEdit: (entity: T) => void;
	children: React.ReactNode; // Entity-specific content
	mode?: "horizontal" | "vertical"; // Display mode
}

export function EntityCard<T>({
	entity,
	onEdit,
	children,
	mode = "horizontal",
}: EntityCardProps<T>) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onEdit(entity);
		}
	};

	// Check if children is a vertical layout (has flex-col class) or mode is vertical
	const isVerticalLayout =
		mode === "vertical" ||
		(React.isValidElement(children) &&
			children.props !== null &&
			typeof children.props === "object" &&
			"className" in children.props &&
			typeof children.props.className === "string" &&
			children.props.className.includes("flex-col"));

	return (
		<button
			type="button"
			onClick={() => onEdit(entity)}
			onKeyDown={handleKeyDown}
			style={{ transition: "var(--transition-standard)" }}
			className={cn(
				isVerticalLayout
					? "group flex w-auto cursor-pointer flex-col border-none bg-transparent p-0 text-left"
					: "group flex w-full cursor-pointer items-center space-x-2 rounded-md border border-transparent bg-transparent p-2 text-left hover:border-border hover:bg-muted",
			)}
		>
			{/* Entity-specific content */}
			{children}

			{/* Hover indicator - Edit text on the right (only for horizontal layout) */}
			{!isVerticalLayout && (
				<div
					className="flex-shrink-0 text-muted-foreground text-sm opacity-0 md:group-hover:opacity-100"
					style={{ transition: "var(--transition-standard)" }}
				>
					Редактировать
				</div>
			)}
		</button>
	);
}

export interface EntityCardGridProps<T> {
	entities: T[];
	onEdit: (entity: T) => void;
	renderEntity: (entity: T) => React.ReactNode;
	gridClassName?: string; // Optional custom grid classes
	mode?: "horizontal" | "vertical"; // Display mode: horizontal (countries) or vertical (brands)
}

export function EntityCardGrid<T>({
	entities,
	onEdit,
	renderEntity,
	gridClassName = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",
	mode = "horizontal", // Default to horizontal for backward compatibility
}: EntityCardGridProps<T>) {
	return (
		<div className="rounded-lg border border-border bg-transparent p-4">
			<div className={gridClassName}>
				{entities.map((entity) => (
					<EntityCard
						key={JSON.stringify(entity)}
						entity={entity}
						onEdit={onEdit}
						mode={mode}
					>
						{renderEntity(entity)}
					</EntityCard>
				))}
			</div>
		</div>
	);
}
