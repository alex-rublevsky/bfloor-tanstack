import { Slot } from "@radix-ui/react-slot";
import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import * as React from "react";

import { Edit } from "~/components/ui/shared/Icon";
import { cn } from "~/utils/utils";

/** Status variant: uses project CSS variables; idle = primary (text primary-foreground) */
const STATUS_BG: Record<"idle" | "analyzing" | "success" | "warning", string> =
	{
		idle: "var(--primary)",
		analyzing: "var(--muted)",
		success: "color-mix(in oklch, var(--primary) 22%, var(--background))",
		warning: "color-mix(in oklch, var(--destructive) 18%, var(--background))",
	};
const STATUS_FG: Record<"idle" | "analyzing" | "success" | "warning", string> =
	{
		idle: "var(--primary-foreground)",
		analyzing: "var(--foreground)",
		success: "var(--primary)",
		warning: "var(--destructive)",
	};

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
				default: "bg-primary text-primary-foreground! hover:bg-primary-hover",
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
					"w-full flex items-center justify-center gap-3 py-2 rounded-none bg-muted backdrop-blur-xs text-foreground hover:bg-primary active:bg-primary transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/70 disabled:hover:text-foreground disabled:active:bg-muted/70 disabled:active:text-foreground [&_svg]:!w-5 [&_svg]:!h-5 hover:[&_span]:!text-background active:[&_span]:!text-background",
				status:
					"overflow-clip isolation-isolate font-medium text-xs tracking-tight rounded-[0.9375rem] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
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

export type ButtonStatus = "idle" | "analyzing" | "success" | "warning";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	description?: string;
	centered?: boolean;
	/** When variant="status", controls icon and colors (idle = primary look) */
	status?: ButtonStatus;
	/** Labels for status suffix text when variant="status" */
	statusLabels?: {
		analyzing?: string;
		success?: string;
		warning?: string;
	};
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

function StatusButtonContent({
	status,
	statusLabels,
	children,
}: {
	status: ButtonStatus;
	statusLabels?: ButtonProps["statusLabels"];
	children: React.ReactNode;
}) {
	const analyzingLabel = statusLabels?.analyzing ?? "Analyzing";
	const successLabel = statusLabels?.success ?? "Safe";
	const warningLabel = statusLabels?.warning ?? "Warning";

	return (
		<MotionConfig
			transition={{
				scale: {
					duration: 0.6,
					type: "spring",
					bounce: 0.3,
				},
				opacity: { duration: 0.3 },
				layout: { duration: 0.7, bounce: 0.3, type: "spring" },
			}}
		>
			<motion.div
				layout
				className={cn(
					"button-status-inner isolation-isolate will-transform inline-flex h-9 items-center justify-center gap-2 overflow-clip whitespace-nowrap rounded-[0.9375rem] px-3 py-1 font-medium text-xs",
					status === "idle" && "text-primary-foreground!",
				)}
				data-status={status}
				style={{
					backgroundColor: STATUS_BG[status],
					color: STATUS_FG[status],
				}}
				animate={{
					backgroundColor: STATUS_BG[status],
					color: STATUS_FG[status],
				}}
			>
				{/* Icon slot: same size as default button [&_svg]:size-4 */}
				<motion.div
					layout="position"
					className="will-transform flex h-4 w-4 shrink-0 items-center justify-center"
				>
					<AnimatePresence mode="popLayout" initial={false}>
						{status === "idle" ? (
							<motion.div
								key="idle"
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.5, opacity: 0 }}
							>
								<Edit size={16} className="block" />
							</motion.div>
						) : status === "analyzing" ? (
							<motion.div
								key="analyzing"
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.5, opacity: 0 }}
							>
								<svg
									aria-hidden
									className="animate-spin"
									style={{
										height: "1rem",
										width: "1rem",
										display: "block",
									}}
									viewBox="0 0 40 40"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Loading</title>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M20 6C12.268 6 6 12.268 6 20C6 27.732 12.268 34 20 34C27.732 34 34 27.732 34 20C34 12.268 27.732 6 20 6ZM0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.0457 40 20 40C8.95431 40 0 31.0457 0 20Z"
										fill="#B0DEF9"
									/>
									<path
										fillRule="evenodd"
										clipRule="evenodd"
										d="M20 6C12.268 6 6 12.268 6 20C6 21.6569 4.65685 23 3 23C1.34315 23 0 21.6569 0 20C0 8.95431 8.95431 0 20 0C21.6569 0 23 1.34315 23 3C23 4.65685 21.6569 6 20 6Z"
										fill="#25AAF6"
									/>
								</svg>
							</motion.div>
						) : status === "success" ? (
							<motion.div
								key="success"
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.5, opacity: 0 }}
							>
								<svg
									aria-hidden
									style={{
										height: "1rem",
										width: "1rem",
										display: "block",
									}}
									viewBox="0 0 40 40"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Success</title>
									<circle cx="20" cy="20" r="20" fill={STATUS_FG.success} />
									<path
										d="M11.75 21.25L16.75 26.25L28.25 14.75"
										stroke="white"
										strokeWidth="5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</motion.div>
						) : status === "warning" ? (
							<motion.div
								key="warning"
								initial={{ scale: 0.5, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.5, opacity: 0 }}
							>
								<motion.div
									animate={{ x: [0, 4, -4, 2, -2, 0] }}
									transition={{ duration: 0.25, delay: 0.5 }}
								>
									<svg
										aria-hidden
										style={{
											height: "1rem",
											width: "1rem",
											display: "block",
										}}
										viewBox="0 0 37 37"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<title>Warning</title>
										<path
											d="M14.1699 4.49999C16.0944 1.16666 20.9056 1.16667 22.8301 4.5L35.3875 26.25C37.312 29.5833 34.9064 33.75 31.0574 33.75H5.94262C2.09362 33.75 -0.311997 29.5833 1.6125 26.25L14.1699 4.49999Z"
											fill={STATUS_FG.warning}
										/>
										<circle cx="18.5" cy="27.5" r="2.5" fill="white" />
										<rect
											x="16"
											y="9"
											width="5"
											height="12"
											rx="2.5"
											fill="white"
										/>
									</svg>
								</motion.div>
							</motion.div>
						) : null}
					</AnimatePresence>
				</motion.div>

				{/* Single text slot: same structure as default button (icon + label). No gap between label parts. */}
				<div className="flex min-w-0 items-center gap-0 overflow-hidden">
					<motion.span
						layout="position"
						className="will-transform"
						initial={false}
						animate={{
							opacity: status === "analyzing" ? 1 : 0,
							transition: {
								duration: status === "analyzing" ? 0.175 : 0.125,
								delay: status === "analyzing" ? 0.1 : 0,
							},
						}}
						// @ts-expect-error React doesn't know inert yet
						inert={status === "analyzing" ? undefined : ""}
						style={{
							display: "inline-flex",
							justifyContent: "flex-end",
							width: status === "analyzing" ? "auto" : 0,
							overflow: "hidden",
						}}
					>
						<motion.span
							layout="position"
							className="will-transform inline-block"
						>
							{analyzingLabel}&nbsp;
						</motion.span>
					</motion.span>

					<motion.span
						layout="position"
						className="will-transform"
						initial={false}
						animate={{
							opacity: status === "analyzing" ? 0 : 1,
							transition: {
								duration: status === "analyzing" ? 0.125 : 0.175,
								delay: status === "analyzing" ? 0 : 0.1,
							},
						}}
						// @ts-expect-error React doesn't know inert yet
						inert={status === "analyzing" ? "" : undefined}
						style={{
							display: "inline-flex",
							justifyContent: "flex-start",
							width: status === "analyzing" ? 0 : "auto",
							overflow: "hidden",
						}}
					>
						<motion.span
							layout="position"
							className="will-transform inline-block"
							style={
								status === "idle"
									? { color: "var(--primary-foreground)" }
									: undefined
							}
						>
							{children}
						</motion.span>
					</motion.span>

					<motion.span
						layout="position"
						className="will-transform"
						initial={false}
						animate={{
							opacity: status === "success" ? 1 : 0,
							transition: {
								duration: 0.175,
								delay: status === "success" ? 0.05 : 0,
							},
						}}
						// @ts-expect-error React doesn't know inert yet
						inert={status === "success" ? undefined : ""}
						style={{
							display: "inline-flex",
							justifyContent: "flex-start",
							width: status === "success" ? "auto" : 0,
							overflow: "hidden",
						}}
					>
						<motion.span
							layout="position"
							className="will-transform inline-block"
						>
							&nbsp;{successLabel}
						</motion.span>
					</motion.span>

					<motion.span
						layout="position"
						className="will-transform"
						initial={false}
						animate={{
							opacity: status === "warning" ? 1 : 0,
							transition: {
								duration: 0.175,
								delay: status === "warning" ? 0.075 : 0,
							},
						}}
						// @ts-expect-error React doesn't know inert yet
						inert={status === "warning" ? undefined : ""}
						style={{
							display: "inline-flex",
							justifyContent: "flex-start",
							width: status === "warning" ? "auto" : 0,
							overflow: "hidden",
						}}
					>
						<motion.span
							layout="position"
							className="will-transform inline-block"
						>
							&nbsp;{warningLabel}
						</motion.span>
					</motion.span>
				</div>
			</motion.div>
		</MotionConfig>
	);
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
			status = "idle",
			statusLabels,
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
			onMouseDown: onMouseDownProp,
			...props
		},
		ref,
	) => {
		const isStatusVariant = variant === "status";

		// Status variant always renders as button (no asChild/link)
		const isLink = !isStatusVariant && Boolean(to || href);
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

		if (!isStatusVariant) {
			if (asChild) {
				Comp = Slot;
			} else if (isLink && !disabled) {
				if (isInternalRoute && to) {
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
					Comp = "a";
					linkProps = {
						href,
						target: target || (isExternalLink ? "_blank" : undefined),
						rel: rel || (isExternalLink ? "noopener noreferrer" : undefined),
					};
				}
			}
		}

		// When description is provided, we need to wrap content in a div structure
		const hasDescription = description && !asChild && !isStatusVariant;

		const buttonContent = isStatusVariant ? (
			<StatusButtonContent status={status} statusLabels={statusLabels}>
				{children}
			</StatusButtonContent>
		) : hasDescription ? (
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

		// Prevent double-click text selection on status button
		const onMouseDown = isStatusVariant
			? (e: React.MouseEvent<HTMLButtonElement>) => {
					if (e.detail > 1) e.preventDefault();
					onMouseDownProp?.(e);
				}
			: onMouseDownProp;

		return (
			<Comp
				className={cn(
					buttonVariants({
						variant,
						size: hasDescription ? undefined : size,
						alignment: centered ? "center" : "left",
						className,
					}),
					// Status variant: no bg/color from CVA, inner motion.div handles it
					isStatusVariant && "h-auto min-h-0 border-0 bg-transparent p-0",
					// Use cursor-not-allowed for disabled buttons, cursor-default for enabled buttons
					disabled ? "cursor-not-allowed" : "cursor-pointer",
					// Adjust button styling when description is present - must come after buttonVariants to override
					hasDescription && "h-auto whitespace-normal px-4 py-3",
				)}
				ref={ref}
				disabled={disabled}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onMouseDown={onMouseDown}
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
