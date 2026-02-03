/**
 * Shared action button components for navigation bars
 * Provides consistent styling and behavior across desktop and mobile
 */

import type { ButtonStatus } from "~/components/ui/shared/Button";
import type { ActionButtonConfig } from "~/config/dashboardActionButtons";
import { cn } from "~/utils/utils";
import { Button } from "../Button";
import { Plus } from "../Icon";

interface ActionButtonProps {
	button: ActionButtonConfig;
	className?: string;
	showIcon?: boolean;
	/** Status for the "Update product" button; from useDashboardFormStatus() in NavBar */
	formStatus?: ButtonStatus;
}

/**
 * Single action button component
 * Uses the shared Button component with custom rounded-full styling.
 * When useStatusButton is true, renders animated status variant (idle/analyzing/success/warning).
 */
export function ActionButton({
	button,
	className = "",
	showIcon = true,
	formStatus = "idle",
}: ActionButtonProps) {
	const isPrimary = button.variant === "default";

	if (isPrimary && button.useStatusButton) {
		return (
			<Button
				variant="status"
				size="sm"
				className={className}
				onClick={button.onClick}
				status={formStatus}
				statusLabels={button.statusLabels}
			>
				{button.label}
			</Button>
		);
	}

	return (
		<Button
			variant={isPrimary ? "default" : "outline"}
			size="sm"
			className={className}
			onClick={button.onClick}
		>
			{isPrimary && showIcon && <Plus className="h-4 w-4" />}
			{button.label}
		</Button>
	);
}

interface ActionButtonsProps {
	buttons: ActionButtonConfig[];
	className?: string;
	showIcon?: boolean;
	formStatus?: ButtonStatus;
}

/**
 * Multiple action buttons component
 * Renders buttons horizontally with consistent spacing
 */
export function ActionButtons({
	buttons,
	className = "",
	showIcon = true,
	formStatus = "idle",
}: ActionButtonsProps) {
	if (buttons.length === 0) return null;

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{buttons.map((button, index) => (
				<ActionButton
					key={`nav-action-${index}-${button.label}`}
					button={button}
					showIcon={showIcon}
					formStatus={formStatus}
				/>
			))}
		</div>
	);
}

/**
 * Mobile floating action button component
 * Used in BottomNavBar for dashboard actions
 */
interface MobileActionButtonProps {
	button: ActionButtonConfig;
	position: "left" | "right";
	className?: string;
}

export function MobileActionButton({
	button,
	position,
	className = "",
}: MobileActionButtonProps) {
	const isPrimary = button.variant === "default";

	return (
		<Button
			variant={isPrimary ? "default" : "outline"}
			size="sm"
			onClick={button.onClick}
			className={cn(
				"fixed bottom-22 z-50 whitespace-nowrap rounded-full md:hidden",
				position === "left" ? "left-2" : "right-2",
				isPrimary
					? "bg-primary text-primary-foreground hover:bg-primary-hover"
					: "border border-border bg-background text-foreground hover:bg-muted",
				className,
			)}
			aria-label={button.label}
		>
			<span className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
				{isPrimary && <Plus className="h-4 w-4" />}
				{button.label}
			</span>
		</Button>
	);
}

/**
 * Mobile floating action buttons container
 * Handles positioning for single or multiple buttons
 */
interface MobileActionButtonsProps {
	buttons: ActionButtonConfig[];
}

export function MobileActionButtons({ buttons }: MobileActionButtonsProps) {
	if (buttons.length === 0) return null;

	if (buttons.length === 1) {
		return <MobileActionButton button={buttons[0]} position="right" />;
	}

	// Multiple buttons: Cancel on left, Primary on right
	return (
		<>
			{buttons.map((button, index) => {
				const isCancel = button.variant === "outline";
				return (
					<MobileActionButton
						key={`mobile-action-${index}-${button.label}`}
						button={button}
						position={isCancel ? "left" : "right"}
					/>
				);
			})}
		</>
	);
}
