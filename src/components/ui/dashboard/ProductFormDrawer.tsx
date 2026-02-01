/**
 * @deprecated This component is deprecated. Use DashboardFormDrawer instead.
 * DashboardFormDrawer provides the same functionality with more flexibility
 * and is shared across all dashboard forms (products, blog, etc.)
 */

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

/**
 * @deprecated Use DashboardFormDrawer instead
 */
interface ProductFormDrawerProps {
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
}

/**
 * @deprecated Use DashboardFormDrawer instead
 */
export function ProductFormDrawer({
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
}: ProductFormDrawerProps) {
	return (
		<Drawer open={isOpen} onOpenChange={onOpenChange}>
			<DrawerContent width="full">
				<DrawerHeader className="px-4 sm:px-6 lg:px-8">
					<DrawerTitle>{title}</DrawerTitle>
				</DrawerHeader>

				<DrawerBody className="w-full p-0">
					{error && (
						<div className="mb-4 border border-destructive bg-destructive/20 px-4 py-3 text-destructive-foreground sm:px-6 lg:px-8">
							{error}
						</div>
					)}
					{children}
				</DrawerBody>

				<DrawerFooter className="border-border border-t bg-background px-4 sm:px-6 lg:px-8">
					<div className="flex justify-end space-x-2">
						<Button
							variant="secondaryInverted"
							type="button"
							onClick={onCancel}
						>
							Cancel
						</Button>
						<Button
							variant="greenInverted"
							type="submit"
							form={formId}
							disabled={isSubmitting}
						>
							{isSubmitting ? submittingText : submitButtonText}
						</Button>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
