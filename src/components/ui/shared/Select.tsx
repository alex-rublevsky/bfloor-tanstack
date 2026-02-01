import * as SelectPrimitive from "@radix-ui/react-select";
import * as React from "react";
import { cn } from "~/utils/utils";
import { Check, ChevronDown } from "./Icon";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Value>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Value
		ref={ref}
		className={cn("text-sm", className)}
		{...props}
	/>
));
SelectValue.displayName = SelectPrimitive.Value.displayName;

const SelectTrigger = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
		label?: string;
		required?: boolean;
		labelBackgroundColor?: string;
	}
>(
	(
		{
			className,
			children,
			onMouseEnter,
			onMouseLeave,
			label,
			required,
			labelBackgroundColor,
			id,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const finalId = id ?? generatedId;

		return (
			<div className="relative h-9">
				{label && (
					<label
						htmlFor={finalId}
						className={cn(
							"-translate-y-1/2 pointer-events-none absolute top-0 left-3 z-10 origin-left scale-75 px-1 text-foreground text-sm",
							labelBackgroundColor || "bg-background",
						)}
					>
						<span className="flex items-center gap-1">
							{label}
							{required && <span className="text-destructive">*</span>}
						</span>
					</label>
				)}
				<SelectPrimitive.Trigger
					ref={ref}
					id={finalId}
					className={cn(
						"flex h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-foreground text-sm shadow-black/5 shadow-sm transition-standard",
						"hover:border-primary active:border-primary",
						"focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
						label && "pt-4",
						className,
					)}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					{...props}
				>
					<span className="relative z-10 flex w-full items-center justify-between text-foreground text-sm">
						<span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left filter-none [mix-blend-normal]">
							{children}
						</span>
						<SelectPrimitive.Icon asChild>
							<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</SelectPrimitive.Icon>
					</span>
				</SelectPrimitive.Trigger>
			</div>
		);
	},
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			className={cn(
				"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-32 overflow-hidden rounded-2xl border border-primary bg-background text-foreground data-[state=closed]:animate-out data-[state=open]:animate-in",
				position === "popper" &&
					"data-[side=left]:-translate-x-1 data-[side=top]:-translate-y-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1",
				className,
			)}
			position={position}
			{...props}
		>
			<SelectPrimitive.Viewport
				className={
					position === "popper"
						? "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
						: undefined
				}
			>
				{children}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		className={cn("px-2 py-1.5 font-semibold text-sm", className)}
		{...props}
	/>
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, onMouseEnter, onMouseLeave, ...props }, ref) => {
	return (
		<SelectPrimitive.Item
			ref={ref}
			className={cn(
				"relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm outline-none transition-standard hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground active:bg-primary active:text-primary-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				className,
			)}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			{...props}
		>
			<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<Check className="h-3 w-3" />
				</SelectPrimitive.ItemIndicator>
			</span>

			<SelectPrimitive.ItemText className="pr-6">
				{children}
			</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
	React.ElementRef<typeof SelectPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Separator
		ref={ref}
		className={cn("-mx-1 my-1 h-px bg-muted", className)}
		{...props}
	/>
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
