import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import {
	DashboardEntityManager,
	type EntityFormFieldsProps,
	type EntityListProps,
	type EntityManagerConfig,
} from "~/components/ui/dashboard/DashboardEntityManager";
import { EntityCardContent } from "~/components/ui/dashboard/EntityCardContent";
import { EntityCardGrid } from "~/components/ui/dashboard/EntityCardGrid";
import { ImageUpload } from "~/components/ui/dashboard/ImageUpload";
import { CategoriesPageSkeleton } from "~/components/ui/dashboard/skeletons/CategoriesPageSkeleton";
import { Select } from "~/components/ui/shared/Select";
import {
	categoriesQueryOptions,
	productCategoryCountsQueryOptions,
} from "~/lib/queryOptions";
import { createProductCategory } from "~/server_functions/dashboard/categories/createProductCategory";
import { deleteProductCategory } from "~/server_functions/dashboard/categories/deleteProductCategory";
import { getAllProductCategories } from "~/server_functions/dashboard/categories/getAllProductCategories";
import { updateProductCategory } from "~/server_functions/dashboard/categories/updateProductCategory";
import type { Category, CategoryFormData } from "~/types";
import { simpleSearchSchema } from "~/utils/searchSchemas";

// Category with count type (for displaying product counts)
interface CategoryWithCount extends Category {
	productCount: number | null;
}

// Category form fields component
const CategoryFormFields = ({
	formData,
	onFieldChange,
	idPrefix,
	entities = [],
	editingEntity,
}: EntityFormFieldsProps<Category, CategoryFormData>) => {
	const parentCategoryId = `${idPrefix}-parent-category`;

	return (
		<>
			{/* Parent Category Selector */}
			<div>
				<label
					htmlFor={parentCategoryId}
					className="mb-1 block font-medium text-sm"
				>
					Родительская категория (опционально)
				</label>
				<Select
					id={parentCategoryId}
					className="w-full"
					value={(formData as CategoryFormData).parentSlug || "none"}
					onValueChange={(v) =>
						onFieldChange("parentSlug", v === "none" ? null : v)
					}
					placeholder="Нет (корневая категория)"
					options={[
						{ value: "none", label: "Нет (корневая категория)" },
						...entities
							.filter(
								(cat) =>
									cat.isActive &&
									(!editingEntity || cat.slug !== editingEntity.slug),
							)
							.map((c) => ({ value: c.slug, label: c.name })),
					]}
				/>
			</div>

			{/* Image Upload */}
			<ImageUpload
				currentImages={(formData as CategoryFormData).image || ""}
				onImagesChange={(images) => onFieldChange("image", images)}
				folder="categories"
				slug={(formData as CategoryFormData).slug}
				productName={(formData as CategoryFormData).name}
				label="Изображение категории"
			/>
		</>
	);
};

// Category list component using the reusable component
const CategoryList = ({
	entities,
	onEdit,
}: EntityListProps<CategoryWithCount>) => {
	// Use entities directly instead of fetching again - they already contain all category data
	// Create a lookup map for O(1) parent category lookup
	const categoryMap = useMemo(() => {
		const map = new Map<string, CategoryWithCount>();
		entities.forEach((cat) => {
			map.set(cat.slug, cat);
		});
		return map;
	}, [entities]);

	return (
		<EntityCardGrid
			entities={entities}
			onEdit={onEdit}
			renderEntity={(category) => {
				const parentCategory = category.parentSlug
					? categoryMap.get(category.parentSlug)
					: null;
				return (
					<EntityCardContent
						name={category.name}
						slug={category.slug}
						isActive={category.isActive}
						secondaryInfo={
							parentCategory ? `Родитель: ${parentCategory.name}` : undefined
						}
						count={category.productCount}
					/>
				);
			}}
		/>
	);
};

export const Route = createFileRoute("/dashboard/categories")({
	component: RouteComponent,
	pendingComponent: CategoriesPageSkeleton,
	validateSearch: zodValidator(simpleSearchSchema),

	// Loader prefetches categories and counts before component renders
	// This ensures consistent server/client rendering and prevents hydration mismatches
	loader: async ({ context: { queryClient } }) => {
		// Prefetch all data to ensure consistent server/client rendering
		await Promise.all([
			queryClient.ensureQueryData(categoriesQueryOptions()),
			queryClient.ensureQueryData(productCategoryCountsQueryOptions()),
		]);
	},
});

function RouteComponent() {
	// Get search params from URL (Zod ensures search is string | undefined)
	const searchParams = Route.useSearch();
	const searchTerm = searchParams.search ?? "";

	// Load categories with Suspense (fast - guaranteed to be loaded by loader)
	const { data: categories } = useSuspenseQuery(categoriesQueryOptions());

	// Load counts separately with regular query (slower - streams in)
	const { data: counts } = useQuery(productCategoryCountsQueryOptions());

	// Merge categories with counts efficiently
	// Using useMemo to prevent unnecessary recalculations when dependencies haven't changed
	const categoriesWithCounts = useMemo((): CategoryWithCount[] => {
		return categories.map((category) => ({
			...category,
			productCount: counts?.[category.slug] ?? null, // null = still loading
		}));
	}, [categories, counts]);

	// Entity manager configuration
	// Using useMemo to prevent recreation on every render
	const entityManagerConfig = useMemo(
		(): EntityManagerConfig<CategoryWithCount, CategoryFormData> => ({
			queryKey: ["bfloorCategories"],
			// Wrapper function to match expected return type (though data is passed directly)
			queryFn: async (): Promise<CategoryWithCount[]> => {
				const cats = await getAllProductCategories();
				// Map to CategoryWithCount with null counts (will be populated by counts query)
				return cats.map((cat) => ({
					...cat,
					productCount: null,
				}));
			},
			createFn: async (data: { data: CategoryFormData }) => {
				await createProductCategory({ data: data.data });
			},
			updateFn: async (data: { id: number; data: CategoryFormData }) => {
				await updateProductCategory({ data });
			},
			deleteFn: async (data: { id: number }) => {
				await deleteProductCategory({ data });
			},
			entityName: "категория",
			entityNamePlural: "категории",
			emptyStateEntityType: "categories",
			defaultFormData: {
				name: "",
				slug: "",
				parentSlug: null,
				image: "",
				isActive: true,
			} as CategoryFormData,
			formFields: CategoryFormFields,
			renderList: CategoryList,
		}),
		[], // Empty deps - config is stable
	);

	return (
		<div className="px-6 py-6">
			<DashboardEntityManager
				config={entityManagerConfig}
				data={categoriesWithCounts}
				searchTerm={searchTerm}
			/>
		</div>
	);
}
