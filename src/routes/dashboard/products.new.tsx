import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { ProductForm } from "~/components/ui/dashboard/ProductForm";
import { useProductForm } from "~/hooks/useProductForm";
import { useProductFormHandlers } from "~/hooks/useProductFormHandlers";
import { setDashboardButtons } from "~/lib/dashboardActions";
import { createProduct } from "~/server_functions/dashboard/store/createProduct";

export const Route = createFileRoute("/dashboard/products/new")({
	component: NewProductPage,
});

function NewProductPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const createProductFormId = "create-product-form";

	const productForm = useProductForm({
		initialIsAutoSlug: true,
		onSubmit: async (submissionData) => {
			await createProduct({ data: submissionData });
		},
		onSuccess: () => {
			toast.success("Product created successfully!");
			navigate({ to: "/dashboard" });
			queryClient.invalidateQueries({
				queryKey: ["bfloorDashboardProductsInfinite"],
			});
			queryClient.removeQueries({
				queryKey: ["bfloorStoreDataInfinite"],
			});
		},
	});

	// Handle submit errors with toast
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		try {
			await productForm.handleSubmit(e);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			toast.error(errorMessage);
		}
	};

	// Use shared handlers to avoid duplication
	const { handleTagsChange, handleAttributesChange } = useProductFormHandlers(
		productForm.setFormData,
	);

	// Set navbar action buttons directly (plain store, no provider needed)
	useEffect(() => {
		setDashboardButtons([
			{
				label: "Отмена",
				onClick: () => navigate({ to: "/dashboard" }),
				variant: "outline",
			},
			{
				label: "Создать товар",
				onClick: () => {
					const form = document.getElementById(
						createProductFormId,
					) as HTMLFormElement;
					form?.requestSubmit();
				},
				variant: "default",
				useStatusButton: true,
				statusLabels: {
					analyzing: "Создание",
					success: "Готово",
					warning: "Ошибка",
				},
			},
		]);
		return () => setDashboardButtons([]);
	}, [navigate]);

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<Link
					to="/dashboard"
					className="cursor-pointer text-muted-foreground hover:text-foreground"
				>
					← Back to Products
				</Link>
			</div>

			<h1 className="mb-8 font-bold text-3xl">Создать новый товар</h1>

			<form
				onSubmit={handleSubmit}
				id={createProductFormId}
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
					idPrefix="create"
				/>

				{productForm.error && (
					<div className="mt-4 text-destructive text-sm">
						{productForm.error}
					</div>
				)}
			</form>
		</div>
	);
}
