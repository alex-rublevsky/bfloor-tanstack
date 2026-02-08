import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import AttributeValuesManager from "~/components/ui/dashboard/AttributeValuesManager";
import {
	DashboardEntityManager,
	type EntityFormData,
	type EntityFormFieldsProps,
	type EntityListProps,
} from "~/components/ui/dashboard/DashboardEntityManager";
import { DrawerSection } from "~/components/ui/dashboard/DrawerSection";
import { EntityCardContent } from "~/components/ui/dashboard/EntityCardContent";
import { EntityCardGrid } from "~/components/ui/dashboard/EntityCardGrid";
import { AttributesPageSkeleton } from "~/components/ui/dashboard/skeletons/AttributesPageSkeleton";
import {
	allAttributeValuesByAttributeQueryOptions,
	productAttributesQueryOptions,
} from "~/lib/queryOptions";
import { createProductAttribute } from "~/server_functions/dashboard/attributes/createProductAttribute";
import { deleteProductAttribute } from "~/server_functions/dashboard/attributes/deleteProductAttribute";
import { updateProductAttribute } from "~/server_functions/dashboard/attributes/updateProductAttribute";
import type { ProductAttribute } from "~/types";
import { simpleSearchSchema } from "~/utils/searchSchemas";

// Type for attribute with values
type ProductAttributeWithCount = ProductAttribute & {
	values?: Array<{ id: number; value: string; slug: string | null }>; // Standardized values
};

// Attribute form fields component
const AttributeFormFields = ({
	editingEntity,
}: EntityFormFieldsProps<ProductAttributeWithCount, EntityFormData>) => {
	// Show attribute values manager if editing and attribute has standardized values
	const isEditing = editingEntity !== null && editingEntity !== undefined;
	const hasStandardizedValues =
		isEditing && editingEntity.valueType === "standardized";

	if (!hasStandardizedValues || !editingEntity) {
		return null;
	}

	// Return the AttributeValuesManager wrapped in a DrawerSection
	// This will be rendered after the main form section
	return (
		<DrawerSection maxWidth title="Стандартизированные значения">
			<AttributeValuesManager attributeId={editingEntity.id} />
		</DrawerSection>
	);
};

// Attribute list component using the reusable component
const AttributeList = ({
	entities,
	onEdit,
}: EntityListProps<ProductAttributeWithCount>) => (
	<EntityCardGrid
		entities={entities}
		onEdit={onEdit}
		renderEntity={(attribute) => (
			<EntityCardContent
				name={attribute.name}
				slug={attribute.slug}
				tags={attribute.values}
			/>
		)}
	/>
);

export const Route = createFileRoute("/dashboard/attributes")({
	component: AttributesPage,
	pendingComponent: AttributesPageSkeleton,
	validateSearch: zodValidator(simpleSearchSchema),
	// Loader prefetches attributes and their values in parallel
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData(productAttributesQueryOptions()),
			queryClient.ensureQueryData(allAttributeValuesByAttributeQueryOptions()),
		]);
	},
});

function AttributesPage() {
	const queryClient = useQueryClient();

	// Get search params from URL (Zod ensures search is string | undefined)
	const searchParams = Route.useSearch();
	const searchTerm = searchParams.search ?? "";

	// Load attributes with Suspense (fast - guaranteed to be loaded by loader)
	const { data: attributes } = useSuspenseQuery(
		productAttributesQueryOptions(),
	);

	// Load attribute values grouped by attribute ID
	const { data: attributeValuesByAttribute } = useQuery(
		allAttributeValuesByAttributeQueryOptions(),
	);

	// Merge attributes with values
	const attributesWithCounts = useMemo((): ProductAttributeWithCount[] => {
		return attributes.map((attr) => ({
			...attr,
			values: attributeValuesByAttribute?.[attr.id] || undefined, // Standardized values if they exist
		}));
	}, [attributes, attributeValuesByAttribute]);

	// Entity manager configuration
	const entityManagerConfig = {
		queryKey: ["productAttributes"],
		queryFn: async () => attributesWithCounts || [],
		createFn: async (data: {
			data: { name: string; slug: string; isActive: boolean };
		}) => {
			await createProductAttribute({
				data: { name: data.data.name, slug: data.data.slug },
			});
			// DashboardEntityManager will invalidate ["productAttributes"]
			// Also invalidate values so they refresh
			queryClient.invalidateQueries({
				queryKey: ["attributeValuesByAttribute"],
			});
			// Also invalidate ["productAttributes"] for other parts of the app
			queryClient.invalidateQueries({
				queryKey: ["productAttributes"],
			});
		},
		updateFn: async (data: {
			id: number;
			data: { name: string; slug: string; isActive: boolean };
		}) => {
			await updateProductAttribute({
				data: {
					id: data.id,
					data: { name: data.data.name, slug: data.data.slug },
				},
			});
			// DashboardEntityManager will invalidate ["productAttributes"]
			// Also invalidate values so they refresh
			queryClient.invalidateQueries({
				queryKey: ["attributeValuesByAttribute"],
			});
			// Also invalidate ["productAttributes"] for other parts of the app
			queryClient.invalidateQueries({
				queryKey: ["productAttributes"],
			});
		},
		deleteFn: async (data: { id: number }) => {
			await deleteProductAttribute({ data });
			// DashboardEntityManager will invalidate ["productAttributes"]
			// Also invalidate values so they refresh
			queryClient.invalidateQueries({
				queryKey: ["attributeValuesByAttribute"],
			});
			// Also invalidate ["productAttributes"] for other parts of the app
			queryClient.invalidateQueries({
				queryKey: ["productAttributes"],
			});
		},
		entityName: "атрибут",
		entityNamePlural: "атрибуты",
		emptyStateEntityType: "attributes",
		defaultFormData: {
			name: "",
			slug: "",
			isActive: true,
		},
		formFields: AttributeFormFields,
		renderList: AttributeList,
	};

	return (
		<div className="px-6 py-6">
			<DashboardEntityManager
				config={entityManagerConfig}
				data={attributesWithCounts}
				searchTerm={searchTerm}
			/>
		</div>
	);
}
