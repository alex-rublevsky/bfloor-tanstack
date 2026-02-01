import { Badge } from "~/components/ui/shared/Badge";
import { Loader2 } from "~/components/ui/shared/Icon";

export interface EntityCardContentProps {
	name: string;
	slug?: string;
	isActive?: boolean;
	secondaryInfo?: string; // Optional line like "Родитель: ..." or "Бренд: ..." or code
	icon?: React.ReactNode; // Optional icon/flag to show before the content
	inactiveLabel?: string; // Custom label for inactive badge (default: "Неактивна")
	count?: number | null; // Optional count to display (null means loading)
	tags?: Array<{ id: number; value: string }>; // Optional tags/standardized values to display
	maxTags?: number; // Maximum number of tags to show before showing "+X" (default: 5)
}

/**
 * Reusable component for displaying entity information in a horizontal card layout.
 * Used in categories, collections, countries, and attributes pages.
 */
export function EntityCardContent({
	name,
	slug,
	isActive = true,
	secondaryInfo,
	icon,
	inactiveLabel = "Неактивна",
	count,
	tags,
	maxTags = 5,
}: EntityCardContentProps) {
	return (
		<>
			{/* Optional Icon (e.g., country flag) */}
			{icon && <div className="flex-shrink-0">{icon}</div>}

			{/* Entity Info */}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-sm">{name}</span>
					{count === null ? (
						<span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
							<Loader2 className="h-3 w-3 animate-spin" />
						</span>
					) : count !== undefined && count > 0 ? (
						<span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
							{count}
						</span>
					) : null}
					{!isActive && (
						<Badge variant="secondary" className="flex-shrink-0 text-xs">
							{inactiveLabel}
						</Badge>
					)}
				</div>
				{secondaryInfo && (
					<span className="truncate text-muted-foreground text-xs">
						{secondaryInfo}
					</span>
				)}
				{slug && (
					<span className="truncate text-muted-foreground text-xs">{slug}</span>
				)}
				{/* Show standardized values as pills if they exist */}
				{tags && tags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{tags.slice(0, maxTags).map((tag) => (
							<span
								key={tag.id}
								className="rounded border border-primary bg-muted px-1.5 py-0.5 font-medium text-[10px] text-primary leading-tight"
								title={tag.value}
							>
								{tag.value}
							</span>
						))}
						{tags.length > maxTags && (
							<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground leading-tight">
								+{tags.length - maxTags}
							</span>
						)}
					</div>
				)}
			</div>
		</>
	);
}
