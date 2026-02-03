import { useQuery } from "@tanstack/react-query";
import { EnhancedDescriptionField } from "~/components/ui/dashboard/EnhancedDescriptionField";
import { ImageUpload } from "~/components/ui/dashboard/ImageUpload";
import ProductAttributesForm from "~/components/ui/dashboard/ProductAttributesForm";
import { ProductBasicInfoFields } from "~/components/ui/dashboard/ProductBasicInfoFields";
import { DrawerSection } from "~/components/ui/dashboard/ProductFormSection";
import ProductVariationAttributesSelector from "~/components/ui/dashboard/ProductVariationAttributesSelector";
import ProductVariationForm from "~/components/ui/dashboard/ProductVariationForm";
import { StoreLocationsSelector } from "~/components/ui/dashboard/StoreLocationsSelector";
import { CheckboxList } from "~/components/ui/shared/CheckboxList";
import { getProductTagName, PRODUCT_TAGS } from "~/constants/units";
import { getAllStoreLocations } from "~/data/storeLocations";
import type { Variation } from "~/hooks/useProductForm";
import {
	brandsQueryOptions,
	categoriesQueryOptions,
	collectionsQueryOptions,
} from "~/lib/queryOptions";
import type { ProductFormData } from "~/types";

interface ProductFormProps {
	formData: ProductFormData;
	variations: Variation[];
	selectedVariationAttributes: string[];
	selectedStoreLocationIds: number[];
	isAutoSlug: boolean;
	hasAttemptedSubmit: boolean;
	onChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void;
	onImagesChange: (images: string) => void;
	onStoreLocationChange: (locationId: number, checked: boolean) => void;
	onVariationsChange: (variations: Variation[]) => void;
	onSelectedVariationAttributesChange: (attributes: string[]) => void;
	onSlugChange: (slug: string) => void;
	onAutoSlugChange: (isAuto: boolean) => void;
	onAttributesChange: (attributes: ProductFormData["attributes"]) => void;
	onTagsChange: (itemId: string, checked: boolean) => void;
	idPrefix: "edit" | "add" | "create";
	productId?: number | string; // Can be numeric ID or slug for view transitions
}

export function ProductForm({
	formData,
	variations,
	selectedVariationAttributes,
	selectedStoreLocationIds,
	isAutoSlug,
	hasAttemptedSubmit,
	onChange,
	onImagesChange,
	onStoreLocationChange,
	onVariationsChange,
	onSelectedVariationAttributesChange,
	onSlugChange,
	onAutoSlugChange,
	onAttributesChange,
	onTagsChange,
	idPrefix,
	productId,
}: ProductFormProps) {
	const { data: categories } = useQuery(categoriesQueryOptions());
	const { data: brands } = useQuery(brandsQueryOptions());
	const { data: collections } = useQuery(collectionsQueryOptions());
	// Get store locations from hardcoded data
	const storeLocations = getAllStoreLocations();

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{/* Left Column - Images, Tags, Store Locations */}
			<div className="flex flex-col space-y-4">
				{/* Product Images Block */}
				<DrawerSection variant="default">
					<ImageUpload
						currentImages={formData.images}
						onImagesChange={onImagesChange}
						slug={formData.slug}
						categorySlug={formData.categorySlug}
						productName={formData.name}
						productId={productId}
					/>
				</DrawerSection>

				{/* Tags Block */}
				<DrawerSection variant="default" title="Теги">
					<CheckboxList
						items={PRODUCT_TAGS.map((tag) => ({
							id: tag,
							label: getProductTagName(tag),
						}))}
						selectedIds={formData.tags || []}
						onItemChange={(itemId, checked) => {
							onTagsChange(String(itemId), checked);
						}}
						idPrefix={`${idPrefix}-tag`}
					/>
				</DrawerSection>

				{/* Store Locations Block */}
				<DrawerSection variant="default" title="Местоположения магазинов">
					<StoreLocationsSelector
						storeLocations={storeLocations || []}
						selectedLocationIds={selectedStoreLocationIds}
						onLocationChange={onStoreLocationChange}
						idPrefix={idPrefix}
					/>
				</DrawerSection>

				{/* Description Field */}
				<DrawerSection variant="default" title="Описание">
					<EnhancedDescriptionField
						name="description"
						value={formData.description || ""}
						onChange={onChange}
						placeholder="Добавьте описание товара..."
						className="min-h-[4rem]"
						showPreview={true}
						showHelp={true}
						autoClean={false}
						label=""
					/>
				</DrawerSection>
			</div>

			{/* Right Column - Basic Information */}
			<div className="flex flex-col space-y-4">
				{/* Basic Info */}
				<DrawerSection variant="default" title="Базовая информация">
					<ProductBasicInfoFields
						formData={formData}
						onChange={onChange}
						isAutoSlug={isAutoSlug}
						onSlugChange={onSlugChange}
						onAutoSlugChange={onAutoSlugChange}
						hasAttemptedSubmit={hasAttemptedSubmit}
						idPrefix={idPrefix}
						categories={categories?.map((c) => ({ ...c, count: 0 }))}
						brands={brands}
						collections={collections}
						productId={productId}
					/>
				</DrawerSection>

				<DrawerSection variant="default" title="Важная заметка">
					<EnhancedDescriptionField
						name="importantNote"
						value={formData.importantNote || ""}
						onChange={onChange}
						placeholder="Добавьте важную заметку с поддержкой Markdown..."
						className="min-h-[4rem]"
						label=""
						showPreview={true}
						showHelp={true}
					/>
				</DrawerSection>

				{/* Dimensions Field */}
				<DrawerSection variant="default" title="Габариты">
					<textarea
						name="dimensions"
						value={formData.dimensions || ""}
						onChange={onChange}
						placeholder="Введите габариты товара..."
						className="field-sizing-content min-h-[4rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					/>
				</DrawerSection>
			</div>

			{/* Product Attributes Block */}
			<DrawerSection variant="default" className="lg:col-span-2">
				<ProductAttributesForm
					attributes={formData.attributes || []}
					onChange={onAttributesChange}
				/>
			</DrawerSection>

			{/* Variations Block */}
			{formData.hasVariations && (
				<>
					<DrawerSection variant="default" className="lg:col-span-2">
						<ProductVariationAttributesSelector
							selectedAttributes={selectedVariationAttributes}
							onChange={onSelectedVariationAttributesChange}
						/>
					</DrawerSection>

					<DrawerSection variant="default" className="lg:col-span-2">
						<ProductVariationForm
							variations={variations}
							productSlug={formData.slug}
							selectedAttributes={selectedVariationAttributes}
							onChange={onVariationsChange}
						/>
					</DrawerSection>
				</>
			)}
		</div>
	);
}
