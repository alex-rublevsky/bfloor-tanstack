import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import DeleteConfirmationDialog from "~/components/ui/dashboard/ConfirmationDialog";
import { ProductForm } from "~/components/ui/dashboard/ProductForm";
import { DrawerSection } from "~/components/ui/dashboard/ProductFormSection";
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
		const transformed = transformProductToFormData(product);

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

			await updateProduct({
				data: { id: loaderData.productIdNum, data: submissionData },
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

	// Reset nav status when entering edit page
	useEffect(() => {
		dispatchDashboardFormStatus("idle");
	}, []);

	// Handle submit errors with toast; drive status button (analyzing → success/warning)
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		dispatchDashboardFormStatus("analyzing");
		try {
			await productForm.handleSubmit(e);
			// onSuccess (below) will set "success"
		} catch (err) {
			dispatchDashboardFormStatus("warning");
			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			toast.error(errorMessage);
			setTimeout(() => dispatchDashboardFormStatus("idle"), 2500);
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
					<Button
						asChild
						variant="outline"
						size="sm"
						className="flex items-center gap-2"
					>
						<Link
							to="/product/$productId"
							params={{
								productId: loaderData.product.slug,
							}}
						>
							<Eye className="h-4 w-4" />
							<span>посмотреть на страницу этого товара</span>
						</Link>
					</Button>
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

				{/* Delete Product Section */}
				<DrawerSection variant="default" className="lg:col-span-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-destructive text-sm">
							Опасная зона
						</h3>
						<p className="text-muted-foreground text-sm">
							Удаление товара является необратимым действием. Все данные о
							товаре будут безвозвратно удалены.
						</p>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDeleteClick}
							className="mt-2 w-fit"
						>
							<Trash size={16} />
							<span>Удалить товар</span>
						</Button>
					</div>
				</DrawerSection>

				{productForm.error && (
					<div className="mt-4 text-destructive text-sm">
						{productForm.error}
					</div>
				)}
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
