import type { ReactNode } from "react";
import { Button } from "~/components/ui/shared/Button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "~/components/ui/shared/Drawer";

interface DashboardFormDrawerProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	formId: string;
	isSubmitting: boolean;
	submitButtonText: string;
	submittingText: string;
	onCancel: () => void;
	error?: string;
	children: ReactNode;
	/**
	 * Layout mode:
	 * - "two-column": Grid with 2 columns (for products, complex forms)
	 * - "single-column": Single column layout (for simpler forms like blog posts)
	 */
	layout?: "two-column" | "single-column";
	/**
	 * Optional: Use full width drawer (defaults to true for consistency)
	 */
	fullWidth?: boolean;
	/**
	 * Optional: Additional footer actions to display before Cancel/Apply buttons
	 */
	footerActions?: ReactNode;
}

export function DashboardFormDrawer({
	isOpen,
	onOpenChange,
	title,
	formId,
	isSubmitting,
	submitButtonText,
	submittingText,
	onCancel,
	error,
	children,
	layout = "two-column",
	fullWidth = true,
	footerActions,
}: DashboardFormDrawerProps) {
	return (
		<Drawer open={isOpen} onOpenChange={onOpenChange}>
			<DrawerContent
				width={fullWidth ? "full" : undefined}
				className="border-primary"
			>
				{title && (
					<DrawerHeader className="px-4 sm:px-6 lg:px-8">
						<DrawerTitle>{title}</DrawerTitle>
					</DrawerHeader>
				)}

				<DrawerBody className="w-full">
					{error && (
						<div className="mb-4 border border-destructive bg-destructive/20 px-4 py-3 text-destructive-foreground sm:px-6 lg:px-8">
							{error}
						</div>
					)}
					<div
						className={
							layout === "two-column"
								? "grid grid-cols-1 gap-4 lg:grid-cols-2"
								: "space-y-4"
						}
					>
						{children}
					</div>
				</DrawerBody>

				<DrawerFooter className="border-border border-t bg-background px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<div>{footerActions}</div>
						<div className="flex space-x-2">
							<Button variant="secondary" type="button" onClick={onCancel}>
								Отмена
							</Button>
							<Button
								variant="green"
								type="submit"
								form={formId}
								disabled={isSubmitting}
							>
								{isSubmitting ? submittingText : submitButtonText}
							</Button>
						</div>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
