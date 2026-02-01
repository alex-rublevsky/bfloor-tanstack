"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "~/lib/utils";

const Drawer = ({
	shouldScaleBackground = true,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
	<DrawerPrimitive.Root
		shouldScaleBackground={shouldScaleBackground}
		{...props}
	/>
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-[10001] bg-background/45 backdrop-blur-xs transition-all duration-300",
			className,
		)}
		{...props}
	/>
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const drawerContentVariants = cva(
	"mx-auto w-full flex-1 flex flex-col min-h-0",
	{
		variants: {
			width: {
				default: "max-w-3xl",
				full: "max-w-none",
			},
		},
		defaultVariants: {
			width: "default",
		},
	},
);

interface DrawerContentProps
	extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>,
		VariantProps<typeof drawerContentVariants> {}

const DrawerContent = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Content>,
	DrawerContentProps
>(({ className, children, width, ...props }, ref) => (
	<DrawerPortal>
		<DrawerOverlay />
		<DrawerPrimitive.Content
			ref={ref}
			className={cn(
				"fixed inset-x-0 bottom-0 z-[10002] mt-24 flex flex-col rounded-t-[10px] border border-border bg-background",
				"max-h-[95dvh] transition-transform duration-300 ease-in-out",
				className,
			)}
			{...props}
		>
			<div className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />
			<div
				className={cn(drawerContentVariants({ width }), "flex h-full flex-col")}
			>
				{children}
			</div>
		</DrawerPrimitive.Content>
	</DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"grid shrink-0 gap-1.5 bg-background px-4 pt-4 pb-2 sm:text-left",
			className,
		)}
		{...props}
	/>
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerBody = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-6", className)}
		{...props}
	/>
);
DrawerBody.displayName = "DrawerBody";

const DrawerFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex shrink-0 flex-col gap-2 bg-background p-4", className)}
		{...props}
	/>
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Title
		ref={ref}
		className={cn(
			"!text-lg font-semibold leading-none tracking-tight",
			className,
		)}
		{...props}
	/>
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Description
		ref={ref}
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
};
