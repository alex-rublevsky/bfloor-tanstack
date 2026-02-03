import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SlugField } from "~/components/ui/dashboard/SlugField";
import { Button } from "~/components/ui/shared/Button";
import { Input } from "~/components/ui/shared/input";
import { Select } from "~/components/ui/shared/Select";
import { Switch } from "~/components/ui/shared/Switch";
import { getActiveCountries } from "~/data/countries";
import { useSlugGeneration } from "~/hooks/useSlugGeneration";
import { cn } from "~/lib/utils";
import { createBrand } from "~/server_functions/dashboard/brands/createBrand";
import { createProductCategory } from "~/server_functions/dashboard/categories/createProductCategory";
import { createCollection } from "~/server_functions/dashboard/collections/createCollection";
import type {
	Brand,
	BrandFormData,
	Category,
	CategoryFormData,
	Collection,
	CollectionFormData,
} from "~/types";

interface SelectWithCreateProps {
	value: string | null;
	onValueChange: (value: string | null) => void;
	placeholder: string;
	label: string;
	required?: boolean;
	className?: string;
	id?: string;
	entityType: "category" | "brand" | "collection";
	options: (Category | Brand | Collection)[];
	brands?: Brand[]; // For collections to select from brands
	onEntityCreated?: (entity: Category | Brand | Collection) => void;
	error?: string;
}

// Brand country select component that uses hardcoded countries
function BrandCountrySelect({
	formData,
	setFormData,
	entityType,
}: {
	formData: BrandFormData;
	setFormData: React.Dispatch<
		React.SetStateAction<CategoryFormData | BrandFormData | CollectionFormData>
	>;
	entityType: "brand";
}) {
	// Get countries from hardcoded data
	const countries = getActiveCountries();

	return (
		<div>
			<Select
				id={`${entityType}-country`}
				label="Страна"
				value={formData.countryId?.toString() || ""}
				onValueChange={(v) =>
					setFormData((prev) => ({
						...prev,
						countryId: v ? parseInt(v, 10) : null,
					}))
				}
				placeholder="Не указано"
				options={[
					{ value: "", label: "Не указано" },
					...countries.map((c) => ({
						value: c.id.toString(),
						label: `${c.name} (${c.code})`,
					})),
				]}
			/>
		</div>
	);
}

export function SelectWithCreate({
	value,
	onValueChange,
	placeholder,
	label,
	required = false,
	className,
	id,
	entityType,
	options,
	brands,
	onEntityCreated,
	error,
}: SelectWithCreateProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isAutoSlug, setIsAutoSlug] = useState(true);

	// Form data for different entity types
	const [formData, setFormData] = useState<
		CategoryFormData | BrandFormData | CollectionFormData
	>({
		name: "",
		slug: "",
		isActive: true,
		...(entityType === "category" && { parentSlug: null, image: "", order: 0 }),
		...(entityType === "brand" && { logo: "", countryId: null }),
		...(entityType === "collection" && { brandSlug: "" }),
	} as CategoryFormData | BrandFormData | CollectionFormData);

	// Slug generation
	const handleSlugChange = useCallback((slug: string) => {
		setFormData((prev) => ({ ...prev, slug }));
	}, []);

	useSlugGeneration(formData.name, isAutoSlug, handleSlugChange);

	const handleCreate = async () => {
		if (!formData.name.trim()) {
			toast.error("Название обязательно");
			return;
		}

		if (!formData.slug.trim()) {
			toast.error("Slug обязателен");
			return;
		}

		// Additional validation for collections
		if (
			entityType === "collection" &&
			!(formData as CollectionFormData).brandSlug
		) {
			toast.error("Бренд обязателен для коллекции");
			return;
		}

		setIsSubmitting(true);
		try {
			let result: {
				category?: Category;
				brand?: Brand;
				collection?: Collection;
			};

			switch (entityType) {
				case "category":
					result = await createProductCategory({
						data: formData as CategoryFormData,
					});
					break;
				case "brand":
					result = await createBrand({
						data: {
							name: (formData as BrandFormData).name,
							slug: (formData as BrandFormData).slug,
							logo: (formData as BrandFormData).logo || "",
							countryId: (formData as BrandFormData).countryId || null,
							isActive: (formData as BrandFormData).isActive,
						},
					});
					break;
				case "collection":
					result = await createCollection({
						data: {
							data: formData as CollectionFormData,
						},
					});
					break;
				default:
					throw new Error("Неизвестный тип сущности");
			}

			toast.success(
				`${entityType === "category" ? "Категория" : entityType === "brand" ? "Бренд" : "Коллекция"} создана успешно!`,
			);

			// Removed debug log

			// Reset form
			setFormData({
				name: "",
				slug: "",
				isActive: true,
				...(entityType === "category" && {
					parentSlug: null,
					image: "",
					order: 0,
				}),
				...(entityType === "brand" && { logo: "", countryId: null }),
				...(entityType === "collection" && { brandSlug: "" }),
			} as CategoryFormData | BrandFormData | CollectionFormData);

			setIsAutoSlug(true);
			setIsCreating(false);

			// Select the newly created entity
			let newEntity: Category | Brand | Collection | undefined;
			switch (entityType) {
				case "category":
					newEntity = result.category;
					break;
				case "brand":
					newEntity = result.brand;
					break;
				case "collection":
					newEntity = result.collection;
					break;
			}

			if (newEntity) {
				// Call the entity created callback first to refresh the options
				onEntityCreated?.(newEntity);
				// Then select the new entity after a small delay to ensure options are updated
				setTimeout(() => {
					onValueChange(newEntity.slug);
				}, 100);
			}
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : "Ошибка при создании";
			toast.error(errorMsg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		setIsCreating(false);
		setFormData({
			name: "",
			slug: "",
			isActive: true,
			...(entityType === "category" && {
				parentSlug: null,
				image: "",
				order: 0,
			}),
			...(entityType === "brand" && { logo: "", countryId: null }),
			...(entityType === "collection" && { brandSlug: "" }),
		} as CategoryFormData | BrandFormData | CollectionFormData);
		setIsAutoSlug(true);
	};

	return (
		<div className="space-y-2">
			<div className="relative">
				<Select
					id={id}
					label={label}
					required={required}
					className={cn("w-full", error && "border-red-500", className)}
					value={value || "none"}
					onValueChange={(newValue) => {
						if (newValue === "create-new") {
							setIsCreating(true);
						} else {
							onValueChange(newValue === "none" ? null : newValue);
						}
					}}
					placeholder={placeholder}
					options={[
						...(entityType !== "category"
							? [{ value: "none", label: "Нет" }]
							: []),
						...options.map((o) => ({ value: o.slug, label: o.name })),
						{
							value: "create-new",
							label: `+ Создать новый ${entityType === "category" ? "категорию" : entityType === "brand" ? "бренд" : "коллекцию"}`,
						},
					]}
				/>

				{error && (
					<span className="-bottom-5 absolute left-0 font-medium text-red-500 text-xs">
						{error}
					</span>
				)}
			</div>

			{/* Inline creation form */}
			{isCreating && (
				<div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4">
					<h5 className="font-medium text-muted-foreground text-xs">
						Создать новый{" "}
						{entityType === "category"
							? "категорию"
							: entityType === "brand"
								? "бренд"
								: "коллекцию"}
					</h5>

					<div className="space-y-3">
						<Input
							label="Название"
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, name: e.target.value }))
							}
							placeholder={`Название ${entityType === "category" ? "категории" : entityType === "brand" ? "бренда" : "коллекции"}`}
							required
						/>

						<SlugField
							slug={formData.slug}
							name={formData.name}
							isAutoSlug={isAutoSlug}
							onSlugChange={(slug) => {
								setIsAutoSlug(false);
								setFormData((prev) => ({ ...prev, slug }));
							}}
							onAutoSlugChange={setIsAutoSlug}
							idPrefix={`create-${entityType}-`}
						/>

						{/* Country selection for brands */}
						{entityType === "brand" && (
							<BrandCountrySelect
								formData={formData as BrandFormData}
								setFormData={setFormData}
								entityType={entityType}
							/>
						)}

						{/* Brand selection for collections */}
						{entityType === "collection" && (
							<div>
								<Select
									id={`${entityType}-brand`}
									label="Бренд"
									required
									value={(formData as CollectionFormData).brandSlug}
									onValueChange={(brandSlug) =>
										setFormData((prev) => ({ ...prev, brandSlug }))
									}
									placeholder="Выберите бренд"
									options={(brands || []).map((b) => ({
										value: b.slug,
										label: b.name,
									}))}
								/>
							</div>
						)}

						<div className="flex items-center gap-2">
							<Switch
								id={`${entityType}-isActive`}
								checked={formData.isActive}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										isActive: e.target.checked,
									}))
								}
							/>
							<label htmlFor={`${entityType}-isActive`} className="text-sm">
								Активен
							</label>
						</div>
					</div>

					<div className="flex gap-2">
						<Button
							type="button"
							onClick={handleCreate}
							disabled={isSubmitting}
							size="sm"
						>
							{isSubmitting ? "Создание..." : "Создать"}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isSubmitting}
							size="sm"
						>
							Отмена
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
