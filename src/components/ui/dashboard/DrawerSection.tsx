import type { CSSProperties, ReactNode } from "react";
import { cn } from "~/lib/utils";

interface DrawerSectionProps {
	title?: string;
	variant?: "default" | "muted";
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	maxWidth?: boolean; // Add max-width for single-column layouts
}

export function DrawerSection({
	title,
	variant = "default",
	children,
	className,
	style,
	maxWidth = false,
}: DrawerSectionProps) {
	return (
		<div
			className={cn(
				"px-4 py-6 sm:px-6 lg:px-8",
				variant === "muted" ? "bg-muted/30" : "bg-background",
				maxWidth && "mx-auto max-w-2xl", // Add max-width for single-column layouts
				className,
			)}
			style={style}
		>
			{title && <h5 className="mb-4">{title}</h5>}
			{children}
		</div>
	);
}

// Keep the old name for backward compatibility
export const ProductFormSection = DrawerSection;
