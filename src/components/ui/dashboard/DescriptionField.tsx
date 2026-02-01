import React from "react";
import { cn } from "~/lib/utils";

interface DescriptionFieldProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	variant?: "default" | "large";
}

/**
 * Reusable description field component for dashboard forms
 * Provides consistent styling and sizing across all forms
 */
export const DescriptionField = React.forwardRef<
	HTMLTextAreaElement,
	DescriptionFieldProps
>(({ className, label = "Описание", variant = "default", ...props }, ref) => {
	const id = React.useId();

	// Calculate height based on variant
	// Default: 2.5x the original min-height (60px * 2.5 = 150px)
	// Large: 3x the original min-height (60px * 3 = 180px)
	const heightClass = variant === "large" ? "min-h-[180px]" : "min-h-[150px]";

	return (
		<div>
			{label && (
				<label htmlFor={id} className="mb-1 block font-medium text-sm">
					{label}
				</label>
			)}
			<textarea
				id={id}
				className={cn(
					"field-sizing-content flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					heightClass,
					className,
				)}
				ref={ref}
				data-vaul-no-drag=""
				{...props}
			/>
		</div>
	);
});

DescriptionField.displayName = "DescriptionField";
