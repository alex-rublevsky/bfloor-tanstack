import { Slot } from "@radix-ui/react-slot";
import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "~/utils/utils";

// Type definitions for TanStack Router props
type RouterParams = Record<string, string | number | boolean>;
type RouterSearch = Record<
	string,
	string | number | boolean | string[] | undefined
>;

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[15px] text-sm font-medium transition-standard focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-80 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary-hover",
				secondary:
					"bg-transparent border border-accent text-secondary-foreground hover:bg-accent active:bg-accent hover:text-accent-foreground",
				destructive:
					"bg-backgorund text-destructive border-[1.5px] border-destructive hover:bg-destructive hover:text-destructive-foreground active:bg-destructive active:text-destructive-foreground",
				green:
					//TODO: update with hover and active styles. create the colors using oklch in css variables.
					"bg-discount-badge text-discount-badge-foreground hover:bg-destructive/90",

				outline:
					"bg-transparent text-foreground border border-black hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground",
				accent:
					"bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-hover active:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline active:underline",
				cart: "absolute bottom-0 left-0 right-0 hidden md:flex items-center justify-center gap-3 py-2 opacity-0 group-hover:opacity-100 rounded-none bg-muted/70 backdrop-blur-xs text-foreground hover:bg-primary active:bg-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/70 disabled:hover:text-foreground disabled:active:bg-muted/70 disabled:active:text-foreground [&_svg]:!w-5 [&_svg]:!h-5 hover:[&_svg]:text-muted active:[&_svg]:text-muted hover:[&_span]:!text-background active:[&_span]:!text-background",
				"cart-mobile":
					"w-full flex items-center justify-center gap-3 py-2 rounded-none bg-muted backdrop-blur-xs text-foreground hover:bg-primary active:bg-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/70 disabled:hover:text-foreground disabled:active:bg-muted/70 disabled:active:text-foreground [&_svg]:!w-5 [&_svg]:!h-5 hover:[&_svg]:text-muted active:[&_svg]:text-muted hover:[&_span]:!text-background active:[&_span]:!text-background",
			},
			size: {
				default: "h-11 px-4 py-3",
				sm: "h-9 rounded-[0.9375rem] px-3 py-1 text-xs",
				lg: "h-12 rounded-[0.9375rem] px-4 py-3 text-md",
				icon: "h-11 w-11",
			},
			alignment: {
				left: "text-left",
				center: "text-center",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
			alignment: "left",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	description?: string;
	centered?: boolean;
	// Link props - automatically handles internal/external routing
	to?: string;
	href?: string;
	target?: string;
	rel?: string;
	// TanStack Router specific props
	params?: RouterParams;
	search?: RouterSearch;
	hash?: string;
	preload?: "intent" | "render" | false;
	viewTransition?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			description,
			centered = false,
			disabled = false,
			onMouseEnter,
			onMouseLeave,
			children,
			// Link-related props
			to,
			href,
			target,
			rel,
			params,
			search,
			hash,
			preload,
			viewTransition,
			...props
		},
		ref,
	) => {
		// Smart link detection logic
		const isLink = Boolean(to || href);
		const isExternalLink = Boolean(
			href &&
				(href.startsWith("http://") ||
					href.startsWith("https://") ||
					href.startsWith("mailto:") ||
					href.startsWith("tel:")),
		);
		const isHashLink = Boolean(href?.startsWith("#"));
		const isInternalRoute = Boolean(
			to || (href?.startsWith("/") && !isExternalLink),
		);

		// Determine the component to render
		let Comp: React.ElementType = "button";
		let linkProps: Record<string, unknown> = {};

		if (asChild) {
			Comp = Slot;
		} else if (isLink && !disabled) {
			if (isInternalRoute && to) {
				// Use TanStack Router Link for internal routes
				Comp = Link;
				linkProps = {
					to,
					params,
					search,
					hash,
					preload,
					viewTransition,
				};
			} else if (isExternalLink || isHashLink || href) {
				// Use regular anchor for external links, hash links, or any href
				Comp = "a";
				linkProps = {
					href,
					target: target || (isExternalLink ? "_blank" : undefined),
					rel: rel || (isExternalLink ? "noopener noreferrer" : undefined),
				};
			}
		}

		// When description is provided, we need to wrap content in a div structure
		const hasDescription = description && !asChild;

		const buttonContent = hasDescription ? (
			<div
				className={cn(
					"flex flex-col gap-1",
					centered && "items-center text-center",
				)}
			>
				<div className="font-light! text-2xl!">{children}</div>
				<div className="whitespace-normal break-words font-normal text-sm leading-tight opacity-75">
					{description}
				</div>
			</div>
		) : (
			children
		);

		return (
			<Comp
				className={cn(
					buttonVariants({
						variant,
						size: hasDescription ? undefined : size,
						alignment: centered ? "center" : "left",
						className,
					}),
					// Use cursor-not-allowed for disabled buttons, cursor-default for enabled buttons
					disabled ? "cursor-not-allowed" : "cursor-pointer",
					// Adjust button styling when description is present - must come after buttonVariants to override
					hasDescription && "h-auto whitespace-normal px-4 py-3",
				)}
				ref={ref}
				disabled={disabled}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				{...linkProps}
				{...props}
			>
				{buttonContent}
			</Comp>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
