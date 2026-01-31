import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "~/utils/utils";

const badgeVariants = cva(
	"inline-flex items-center justify-center rounded-md border w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all overflow-hidden border-transparent hover:brightness-95 active:brightness-95",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground! hover:bg-primary/90 active:bg-primary/90!",
				secondary:
					"bg-muted/65 text-secondary-foreground hover:brightness-96 active:brightness-96",
				destructive:
					"bg-destructive text-primary-foreground hover:bg-destructive/90 active:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70",
				outline:
					"text-foreground border-muted hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
				green:
					"bg-discount-badge text-discount-badge-foreground font-medium hover:bg-discount-badge/90 active:bg-discount-badge/90 focus-visible:ring-discount-badge/20 dark:focus-visible:ring-discount-badge/40 dark:bg-discount-badge/70",
				greenOutline:
					"!bg-transparent border-discount-badge text-discount-badge-foreground font-medium hover:!bg-discount-badge hover:text-discount-badge-foreground active:!bg-discount-badge active:text-discount-badge-foreground hover:brightness-100 active:brightness-100 focus-visible:ring-discount-badge/20 dark:focus-visible:ring-discount-badge/40 dark:bg-discount-badge/70 border-solid",
			},
			size: {
				default: "px-2 py-0.5 text-xs",
				lg: "px-3 py-1 text-2xl",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Badge({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			data-slot="badge"
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
