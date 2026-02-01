import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useMemo } from "react";
import {
	DashboardEntityManager,
	type EntityFormData,
	type EntityFormFieldsProps,
	type EntityListProps,
	type EntityManagerConfig,
} from "~/components/ui/dashboard/DashboardEntityManager";
import { EntityCardContent } from "~/components/ui/dashboard/EntityCardContent";
import { EntityCardGrid } from "~/components/ui/dashboard/EntityCardGrid";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/shared/Select";
import {
	brandsQueryOptions,
	collectionsQueryOptions,
	productCollectionCountsQueryOptions,
} from "~/lib/queryOptions";
import { createCollection } from "~/server_functions/dashboard/collections/createCollection";
import { deleteCollection } from "~/server_functions/dashboard/collections/deleteCollection";
import { getAllCollections } from "~/server_functions/dashboard/collections/getAllCollections";
import { updateCollection } from "~/server_functions/dashboard/collections/updateCollection";
import type { Collection, CollectionFormData } from "~/types";
import { simpleSearchSchema } from "~/utils/searchSchemas";

// Type for collection with potentially loading count
type CollectionWithCount = Collection & {
	productCount: number | null; // null means count is still loading
};

// Collection form fields component
const CollectionFormFields = ({
	formData,
	onFieldChange,
	idPrefix,
}: EntityFormFieldsProps<Collection, CollectionFormData & EntityFormData>) => {
	// Get brands for the select dropdown (data is already loaded by loader)
	const { data: brands = [] } = useQuery(brandsQueryOptions());

	return (
		<>
			{/* Brand selection */}
			<div>
				<label
					htmlFor={`${idPrefix}-collection-brand`}
					className="mb-1 block font-medium text-sm"
				>
					Бренд <span className="text-red-500">*</span>
				</label>
				<Select
					value={(formData as CollectionFormData).brandSlug || ""}
					onValueChange={(value: string) => {
						onFieldChange("brandSlug", value);
					}}
					required
				>
					<SelectTrigger id={`${idPrefix}-collection-brand`}>
						<SelectValue placeholder="Выберите бренд" />
					</SelectTrigger>
					<SelectContent>
						{brands.map((brand) => (
							<SelectItem key={brand.slug} value={brand.slug}>
								{brand.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</>
	);
};

// Collection list component using the reusable component
const CollectionList = ({
	entities,
	onEdit,
}: EntityListProps<CollectionWithCount>) => {
	const { data: brands } = useSuspenseQuery(brandsQueryOptions());

	return (
		<EntityCardGrid
			entities={entities}
			onEdit={onEdit}
			renderEntity={(collection) => {
				const brand = brands.find((b) => b.slug === collection.brandSlug);
				return (
					<EntityCardContent
						name={collection.name}
						slug={collection.slug}
						isActive={collection.isActive}
						secondaryInfo={brand ? `Бренд: ${brand.name}` : undefined}
						count={collection.productCount}
					/>
				);
			}}
		/>
	);
};

export const Route = createFileRoute("/dashboard/collections")({
	component: RouteComponent,
	validateSearch: zodValidator(simpleSearchSchema),

	// Loader prefetches collections and brands (fast) before component renders
	// Counts will load separately and stream in
	loader: async ({ context: { queryClient } }) => {
		// Only prefetch collections and brands (fast), not counts (slower)
		await Promise.all([
			queryClient.ensureQueryData(collectionsQueryOptions()),
			queryClient.ensureQueryData(brandsQueryOptions()),
		]);
	},
});

function RouteComponent() {
	const queryClient = useQueryClient();

	// Get search params from URL (Zod ensures search is string | undefined)
	const searchParams = Route.useSearch();
	const searchTerm = searchParams.search ?? "";

	// Load collections with Suspense (fast - guaranteed to be loaded by loader)
	const { data: collections } = useSuspenseQuery(collectionsQueryOptions());

	// Load counts separately with regular query (slower - streams in)
	const { data: counts } = useQuery(productCollectionCountsQueryOptions());

	// Merge collections with counts efficiently
	// Using useMemo to prevent unnecessary recalculations when dependencies haven't changed
	const collectionsWithCounts = useMemo((): CollectionWithCount[] => {
		return collections.map((collection) => ({
			...collection,
			productCount: counts?.[collection.id] ?? null, // null = still loading
		}));
	}, [collections, counts]);

	// Helper function to invalidate counts after mutations
	// DashboardEntityManager already invalidates ["bfloorCollections"], so we only need to invalidate counts
	const invalidateCounts = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: ["productCollectionCounts"],
		});
	}, [queryClient]);

	// Entity manager configuration
	// Using useMemo to prevent recreation on every render
	const entityManagerConfig = useMemo(
		(): EntityManagerConfig<CollectionWithCount, CollectionFormData> => ({
			queryKey: ["bfloorCollections"],
			// Wrapper function to match expected return type (though data is passed directly)
			queryFn: async (): Promise<CollectionWithCount[]> => {
				const colls = await getAllCollections();
				// Map to CollectionWithCount with null counts (will be populated by counts query)
				return colls.map((coll) => ({
					...coll,
					productCount: null,
				}));
			},
			createFn: async (data: { data: CollectionFormData }) => {
				await createCollection({
					data: {
						data: {
							name: data.data.name,
							slug: data.data.slug,
							brandSlug: data.data.brandSlug,
							isActive: data.data.isActive,
						},
					},
				});
				// DashboardEntityManager will invalidate ["bfloorCollections"]
				// Also invalidate counts so they refresh
				invalidateCounts();
			},
			updateFn: async (data: { id: number; data: CollectionFormData }) => {
				await updateCollection({
					data: {
						id: data.id,
						data: {
							name: data.data.name,
							slug: data.data.slug,
							brandSlug: data.data.brandSlug,
							isActive: data.data.isActive,
						},
					},
				});
				// DashboardEntityManager will invalidate ["bfloorCollections"]
				// Also invalidate counts so they refresh
				invalidateCounts();
			},
			deleteFn: async (data: { id: number }) => {
				await deleteCollection({
					data: { data: { id: data.id } },
				});
				// DashboardEntityManager will invalidate ["bfloorCollections"]
				// Also invalidate counts so they refresh
				invalidateCounts();
			},
			entityName: "коллекция",
			entityNamePlural: "коллекции",
			emptyStateEntityType: "collections",
			defaultFormData: {
				name: "",
				slug: "",
				brandSlug: "",
				isActive: true,
			} as CollectionFormData,
			formFields: CollectionFormFields,
			renderList: CollectionList,
		}),
		[invalidateCounts], // Only recreate if invalidateCounts changes
	);

	return (
		<div className="px-6 py-6">
			<DashboardEntityManager
				config={entityManagerConfig}
				data={collectionsWithCounts}
				searchTerm={searchTerm}
			/>
		</div>
	);
}
