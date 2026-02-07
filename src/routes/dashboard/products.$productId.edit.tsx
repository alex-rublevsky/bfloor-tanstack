import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DeleteConfirmationDialog from "~/components/ui/dashboard/ConfirmationDialog";
import { ProductForm } from "~/components/ui/dashboard/ProductForm";
import { Button } from "~/components/ui/shared/Button";
import { Eye, Trash } from "~/components/ui/shared/Icon";
import { useFormNavigation } from "~/hooks/useFormNavigation";
import { useProductForm } from "~/hooks/useProductForm";
import { useProductFormHandlers } from "~/hooks/useProductFormHandlers";
import { dispatchDashboardFormStatus } from "~/lib/dashboardFormStatus";
import { dashboardProductQueryOptions } from "~/lib/queryOptions";
import { deleteProduct } from "~/server_functions/dashboard/store/deleteProduct";
import { deleteProductImage } from "~/server_functions/dashboard/store/deleteProductImage";
import { updateProduct } from "~/server_functions/dashboard/store/updateProduct";
import {
	calculateProductChanges,
	hasChanges as hasProductChanges,
} from "~/utils/calculateProductChanges";
import { transformProductToFormData } from "~/utils/productFormHelpers";

export const Route = createFileRoute("/dashboard/products/$productId/edit")({
	component: EditProductPage,
	// Loader fetches and transforms product data before component renders
	// OPTIMIZATION: Check cache first for instant navigation (like storefront)
	// Following TanStack Router best practices: return data from loader, use useLoaderData()
	loader: async ({ context: { queryClient }, params }) => {
		const productIdNum = parseInt(params.productId, 10);
		if (!productIdNum || Number.isNaN(productIdNum)) {
			throw new Error("Invalid product ID");
		}

		// OPTIMIZATION: Try to get cached product from list view first
		// This enables instant navigation similar to storefront product pages
		// The cache seeding happens on hover in the table (seedDashboardProductCache)
		// ensureQueryData is smart:
		// - If data exists (from cache/seed) → returns immediately (instant!)
		// - If data is stale → returns cached, refetches in background
		// - If no data → fetches and waits
		const product = await queryClient.ensureQueryData(
			dashboardProductQueryOptions(productIdNum),
		);

		// Transform product data to form format
		// Note: dashboard product includes storeLocationIds array (not in base type)
		// biome-ignore lint/suspicious/noExplicitAny: Dashboard product type extends base type with storeLocationIds
		const transformed = transformProductToFormData(product as any);

		// Return transformed data - component will use useLoaderData() to access it
		return {
			productIdNum,
			product,
			formData: transformed.formData,
			variations: transformed.variations,
			selectedVariationAttributes: transformed.selectedVariationAttributes,
			storeLocationIds: transformed.storeLocationIds,
			isAutoSlug: transformed.isAutoSlug,
			originalSlug: product.slug,
		};
	},
});

function EditProductPage() {
	// Use loader data - data is guaranteed to be available, no loading state needed
	const loaderData = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const editProductFormId = "edit-product-form";

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Initialize form with transformed data from loader
	// All data is available immediately - no useEffect needed!
	const productForm = useProductForm({
		initialFormData: loaderData.formData,
		initialIsAutoSlug: loaderData.isAutoSlug,
		initialVariations: loaderData.variations,
		initialSelectedVariationAttributes: loaderData.selectedVariationAttributes,
		initialSelectedStoreLocationIds: loaderData.storeLocationIds,
		// Edit page validation: name, slug, and price are required (categorySlug optional for edit)
		validate: (formData) => {
			return !!(formData.name && formData.slug && formData.price);
		},
		onSubmit: async (submissionData) => {
			// Delete removed images first
			// Pass current images to check for duplicate references before deleting
			if (productForm.deletedImages.length > 0) {
				const currentImages = submissionData.images || "";
				const deletePromises = productForm.deletedImages.map((filename) =>
					deleteProductImage({
						data: {
							filename,
							currentImages, // Pass current images to check for duplicates
						},
					}).catch((error) => {
						console.error(`Failed to delete ${filename}:`, error);
					}),
				);
				await Promise.all(deletePromises);
			}

			// Calculate what changed (client-side change detection)
			const changes = calculateProductChanges(
				loaderData.formData,
				submissionData,
				loaderData.storeLocationIds,
				productForm.selectedStoreLocationIds,
				loaderData.variations,
				productForm.variations,
			);

			// Send only what changed (80-90% smaller payload)
			await updateProduct({
				data: {
					id: loaderData.productIdNum,
					changes,
				},
			});
		},
		onSuccess: () => {
			dispatchDashboardFormStatus("success");
			toast.success("Product updated successfully!");
			setTimeout(() => dispatchDashboardFormStatus("idle"), 1500);
			navigate({ to: "/dashboard" });
			queryClient.invalidateQueries({
				queryKey: ["bfloorDashboardProductsInfinite"],
			});
			queryClient.invalidateQueries({
				queryKey: ["bfloorDashboardProduct", loaderData.productIdNum],
			});
			queryClient.removeQueries({
				queryKey: ["bfloorStoreDataInfinite"],
			});
			if (loaderData.originalSlug !== productForm.formData.slug) {
				queryClient.removeQueries({
					queryKey: ["bfloorProduct", loaderData.originalSlug],
				});
				queryClient.removeQueries({
					queryKey: ["bfloorProduct", productForm.formData.slug],
				});
			}
		},
	});

	// Calculate changes between original and current data (client-side)
	const changes = calculateProductChanges(
		loaderData.formData,
		productForm.formData,
		loaderData.storeLocationIds,
		productForm.selectedStoreLocationIds,
		loaderData.variations,
		productForm.variations,
	);

	const hasChanges = hasProductChanges(changes);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Sync nav button status with form state (noChanges vs idle)
	// Don't override while submitting (analyzing → success/warning)
	useEffect(() => {
		if (isSubmitting) return;
		dispatchDashboardFormStatus(hasChanges ? "idle" : "noChanges");
	}, [hasChanges, isSubmitting]);

	// Handle submit; drive status button (analyzing → success/warning)
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// No changes: button already shows noChanges, no toast
		if (!hasChanges) return;

		setIsSubmitting(true);
		dispatchDashboardFormStatus("analyzing");
		try {
			await productForm.handleSubmit(e);
			// onSuccess (below) will set "success" then navigate away
		} catch (err) {
			dispatchDashboardFormStatus("warning");
			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			toast.error(errorMessage);
			setTimeout(() => {
				dispatchDashboardFormStatus("idle");
				setIsSubmitting(false);
			}, 2500);
		}
	};

	// Use shared handlers to avoid duplication
	const { handleTagsChange, handleAttributesChange } = useProductFormHandlers(
		productForm.setFormData,
	);

	const handleDeleteClick = useCallback(() => {
		setShowDeleteDialog(true);
	}, []);

	const handleDeleteConfirm = async () => {
		setIsDeleting(true);

		try {
			await deleteProduct({ data: { id: loaderData.productIdNum } });
			toast.success("Product deleted successfully!");
			navigate({ to: "/dashboard" });
			queryClient.invalidateQueries({
				queryKey: ["bfloorDashboardProductsInfinite"],
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			toast.error(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDeleteCancel = () => {
		setShowDeleteDialog(false);
	};

	// Use shared navigation hook
	useFormNavigation(editProductFormId, navigate);

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<button
					type="button"
					onClick={() => window.history.back()}
					className="cursor-pointer text-muted-foreground hover:text-foreground"
				>
					← Назад
				</button>
				{loaderData.product.slug && (
					<div className="flex items-center gap-2">
						<Button asChild variant="default" size="sm">
							<Link
								to="/product/$productId"
								params={{
									productId: loaderData.product.slug,
								}}
							>
								<Eye className="h-4 w-4" />
								посмотреть на страницу этого товара
							</Link>
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={handleDeleteClick}
						>
							<Trash className="h-4 w-4" />
							Удалить товар
						</Button>
					</div>
				)}
			</div>

			<h1 className="mb-8 font-bold text-3xl">Редактировать товар</h1>

			<form
				onSubmit={handleSubmit}
				id={editProductFormId}
				className="space-y-6"
			>
				<ProductForm
					formData={productForm.formData}
					variations={productForm.variations}
					selectedVariationAttributes={productForm.selectedVariationAttributes}
					selectedStoreLocationIds={productForm.selectedStoreLocationIds}
					isAutoSlug={productForm.isAutoSlug}
					hasAttemptedSubmit={productForm.hasAttemptedSubmit}
					onChange={productForm.handleChange}
					onImagesChange={productForm.handleImagesChange}
					onStoreLocationChange={productForm.handleStoreLocationChange}
					onVariationsChange={productForm.handleVariationsChange}
					onSelectedVariationAttributesChange={
						productForm.setSelectedVariationAttributes
					}
					onSlugChange={productForm.handleSlugManualChange}
					onAutoSlugChange={productForm.handleAutoSlugChange}
					onAttributesChange={handleAttributesChange}
					onTagsChange={handleTagsChange}
					idPrefix="edit"
					productId={loaderData.originalSlug}
				/>
			</form>

			<DeleteConfirmationDialog
				isOpen={showDeleteDialog}
				onClose={handleDeleteCancel}
				onConfirm={handleDeleteConfirm}
				title="Удалить товар?"
				description="Это действие нельзя отменить. Товар будет удален навсегда."
				isDeleting={isDeleting}
			/>
		</div>
	);
}
