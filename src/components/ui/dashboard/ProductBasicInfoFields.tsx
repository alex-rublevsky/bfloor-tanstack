import { useId } from "react";
import { ProductSettingsFields } from "~/components/ui/dashboard/ProductSettingsFields";
import { SelectWithCreate } from "~/components/ui/dashboard/SelectWithCreate";
import { SlugField } from "~/components/ui/dashboard/SlugField";
import { Input } from "~/components/ui/shared/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/shared/Select";
import { UNITS_OF_MEASUREMENT } from "~/constants/units";
import { generateSlug } from "~/hooks/useSlugGeneration";
import type { Brand, Category, Collection, ProductFormData } from "~/types";

interface ProductBasicInfoFieldsProps {
	formData: ProductFormData;
	onChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void;
	isAutoSlug: boolean;
	onSlugChange: (slug: string) => void;
	onAutoSlugChange: (isAuto: boolean) => void;
	hasAttemptedSubmit: boolean;
	idPrefix: string;
	categories?: Category[];
	brands?: Brand[];
	collections?: Collection[];
	onEntityCreated: () => void;
	productId?: number | string; // product ID for view transition
}

export function ProductBasicInfoFields({
	formData,
	onChange,
	isAutoSlug,
	onSlugChange,
	onAutoSlugChange,
	hasAttemptedSubmit,
	idPrefix,
	categories = [],
	brands = [],
	collections = [],
	onEntityCreated,
	productId,
}: ProductBasicInfoFieldsProps) {
	const categoryId = useId();
	const brandId = useId();
	const collectionId = useId();
	const unitId = useId();
	const priceId = useId();
	const discountId = useId();

	// Apply view transition to name and price inputs if productId is provided
	const nameTransitionStyle =
		productId && idPrefix === "edit"
			? { viewTransitionName: `product-name-${productId}` }
			: undefined;
	const priceTransitionStyle =
		productId && idPrefix === "edit"
			? { viewTransitionName: `product-price-${productId}` }
			: undefined;

	return (
		<div className="grid grid-cols-1 gap-4">
			<Input
				label={idPrefix === "edit" ? "Название" : "Название товара"}
				type="text"
				name="name"
				value={formData.name}
				onChange={onChange}
				required
				error={hasAttemptedSubmit && !formData.name ? "обязательно" : undefined}
				style={nameTransitionStyle}
			/>
			<SlugField
				slug={formData.slug}
				name={formData.name}
				isAutoSlug={isAutoSlug}
				onSlugChange={(slug) => {
					onAutoSlugChange(false);
					onSlugChange(slug);
				}}
				onAutoSlugChange={(isAuto) => {
					onAutoSlugChange(isAuto);
					if (isAuto && formData.name) {
						const generated = generateSlug(formData.name);
						onSlugChange(generated);
					}
				}}
				idPrefix={idPrefix}
				error={hasAttemptedSubmit && !formData.slug ? "обязательно" : undefined}
			/>

			<Input
				label="Артикул (SKU)"
				type="text"
				name="sku"
				value={formData.sku || ""}
				onChange={onChange}
			/>

			<ProductSettingsFields
				isActive={formData.isActive}
				isFeatured={formData.isFeatured}
				hasVariations={formData.hasVariations}
				onIsActiveChange={onChange}
				onIsFeaturedChange={onChange}
				onHasVariationsChange={onChange}
				idPrefix={idPrefix === "edit" ? "edit" : "add"}
			/>

			<div className="grid grid-cols-2 gap-4">
				<Input
					id={priceId}
					type="number"
					name="price"
					label="Цена р"
					value={formData.price}
					onChange={onChange}
					step="0.01"
					required
					min={idPrefix === "edit" ? undefined : "0"}
					error={
						hasAttemptedSubmit && !formData.price ? "обязательно" : undefined
					}
					style={priceTransitionStyle}
				/>

				<Input
					id={discountId}
					type="number"
					name="discount"
					label="Скидка %"
					value={formData.discount || ""}
					onChange={onChange}
					min="0"
					max="100"
				/>

				<Input
					label="Площадь упаковки (м²)"
					type="number"
					name="squareMetersPerPack"
					value={formData.squareMetersPerPack || ""}
					onChange={onChange}
					step="0.001"
					min="0"
				/>

				<div>
					<Select
						value={formData.unitOfMeasurement || "упаковка"}
						onValueChange={(value) => {
							onChange({
								target: { name: "unitOfMeasurement", value },
							} as React.ChangeEvent<HTMLSelectElement>);
						}}
						required
					>
						<SelectTrigger id={unitId} label="Единица количества" required>
							<SelectValue placeholder="Выберите единицу" />
						</SelectTrigger>
						<SelectContent>
							{UNITS_OF_MEASUREMENT.map((unit) => (
								<SelectItem key={unit} value={unit}>
									{unit}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{hasAttemptedSubmit && !formData.unitOfMeasurement && (
						<p className="mt-1 text-red-500 text-sm">обязательно</p>
					)}
				</div>

				<div className="col-span-2 flex flex-wrap gap-4">
					<div className="min-w-[150px] flex-1">
						<SelectWithCreate
							value={formData.categorySlug}
							onValueChange={(value) => {
								onChange({
									target: {
										name: "categorySlug",
										value: value || "",
									},
								} as React.ChangeEvent<HTMLSelectElement>);
							}}
							placeholder="Выберите категорию"
							label="Категория"
							required
							id={categoryId}
							entityType="category"
							options={categories}
							onEntityCreated={onEntityCreated}
							error={
								hasAttemptedSubmit && !formData.categorySlug
									? "обязательно"
									: undefined
							}
						/>
					</div>

					<div className="min-w-[150px] flex-1">
						<SelectWithCreate
							value={formData.brandSlug}
							onValueChange={(value) => {
								onChange({
									target: { name: "brandSlug", value },
								} as React.ChangeEvent<HTMLSelectElement>);
							}}
							placeholder="Выберите бренд"
							label="Бренд"
							id={brandId}
							entityType="brand"
							options={brands}
							onEntityCreated={onEntityCreated}
						/>
					</div>

					<div className="min-w-[150px] flex-1">
						<SelectWithCreate
							value={formData.collectionSlug || null}
							onValueChange={(value) => {
								onChange({
									target: { name: "collectionSlug", value },
								} as React.ChangeEvent<HTMLSelectElement>);
							}}
							placeholder="Выберите коллекцию"
							label="Коллекция"
							id={collectionId}
							entityType="collection"
							options={collections}
							brands={brands}
							onEntityCreated={onEntityCreated}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
