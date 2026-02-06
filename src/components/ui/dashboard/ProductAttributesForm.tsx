import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { Button } from "~/components/ui/shared/Button";
import { CheckboxList } from "~/components/ui/shared/CheckboxList";
import { Input } from "~/components/ui/shared/input";
import { useProductAttributes } from "~/hooks/useProductAttributes";
import { allAttributeValuesByAttributeQueryOptions } from "~/lib/queryOptions";
import { cn } from "~/lib/utils";
import type { ProductAttributeFormData } from "~/types";
import { AlertCircle, Trash } from "../shared/Icon";

interface ProductAttributesFormProps {
	attributes?: ProductAttributeFormData[];
	onChange: (attributes: ProductAttributeFormData[]) => void;
}

export default function ProductAttributesForm({
	attributes,
	onChange,
}: ProductAttributesFormProps) {
	const {
		data: availableAttributes,
		isLoading,
		error,
	} = useProductAttributes();

	// Fetch all standardized values grouped by attribute ID
	const { data: allAttributeValues } = useQuery(
		allAttributeValuesByAttributeQueryOptions(),
	);

	const handleUpdateAttributeValue = useCallback(
		(attributeId: string, value: string) => {
			const currentAttributes = attributes || [];
			const existingAttributeIndex = currentAttributes.findIndex(
				(attr) => attr.attributeId === attributeId,
			);

			let newAttributes: ProductAttributeFormData[];
			if (existingAttributeIndex >= 0) {
				// Update existing attribute
				newAttributes = currentAttributes.map((attr) =>
					attr.attributeId === attributeId ? { ...attr, value } : attr,
				);
			} else {
				// Add new attribute
				newAttributes = [...currentAttributes, { attributeId, value }];
			}

			onChange(newAttributes);
		},
		[attributes, onChange],
	);

	// Handle checkbox selection for standardized attributes
	const handleAttributeValueToggle = (
		attributeId: string,
		valueId: string,
		checked: boolean,
		allowMultiple: boolean,
	) => {
		const currentAttributes = attributes || [];
		const existingAttributeIndex = currentAttributes.findIndex(
			(attr) => attr.attributeId === attributeId,
		);

		const attributeInfo = availableAttributes?.find(
			(a) => a.id.toString() === attributeId,
		);
		if (!attributeInfo) return;

		// Get the value string from the standardized value ID
		const standardizedValues = getStandardizedValues(attributeInfo.id);
		const selectedValue = standardizedValues.find(
			(v) => v.id.toString() === valueId,
		);
		if (!selectedValue) return;

		let newAttributes: ProductAttributeFormData[];

		if (existingAttributeIndex >= 0) {
			const currentAttr = currentAttributes[existingAttributeIndex];

			if (allowMultiple) {
				// Multi-value: store as comma-separated string (will be converted to array in backend)
				const currentValues = currentAttr.value
					? currentAttr.value
							.split(",")
							.map((v) => v.trim())
							.filter(Boolean)
					: [];
				let newValues: string[];
				if (checked) {
					// Add value if not already present
					if (!currentValues.includes(selectedValue.value)) {
						newValues = [...currentValues, selectedValue.value];
					} else {
						newValues = currentValues;
					}
				} else {
					// Remove value
					newValues = currentValues.filter((v) => v !== selectedValue.value);
				}

				const newValue = newValues.length > 0 ? newValues.join(",") : "";

				if (newValue) {
					newAttributes = currentAttributes.map((attr) =>
						attr.attributeId === attributeId
							? { ...attr, value: newValue }
							: attr,
					);
				} else {
					// Remove attribute if no values left
					newAttributes = currentAttributes.filter(
						(attr) => attr.attributeId !== attributeId,
					);
				}
			} else {
				// Single-value: replace current value
				if (checked) {
					newAttributes = currentAttributes.map((attr) =>
						attr.attributeId === attributeId
							? { ...attr, value: selectedValue.value }
							: attr,
					);
				} else {
					// Remove attribute if unchecked
					newAttributes = currentAttributes.filter(
						(attr) => attr.attributeId !== attributeId,
					);
				}
			}
		} else {
			// Add new attribute
			if (checked) {
				newAttributes = [
					...currentAttributes,
					{ attributeId, value: selectedValue.value },
				];
			} else {
				newAttributes = currentAttributes;
			}
		}

		onChange(newAttributes);
	};

	// Get selected values for an attribute (for checkbox list)
	// Returns array of value IDs (as strings) that match standardized values
	const getSelectedValues = (attributeId: number): string[] => {
		const attr = attributes?.find(
			(a) => a.attributeId === attributeId.toString(),
		);
		if (!attr || !attr.value) return [];

		// Handle both comma-separated string and single value
		const values = attr.value
			.split(",")
			.map((v) => v.trim())
			.filter(Boolean);

		// Convert value strings to standardized value IDs
		const standardizedValues = getStandardizedValues(attributeId);
		const selectedIds: string[] = [];
		for (const value of values) {
			const stdValue = standardizedValues.find((sv) => sv.value === value);
			if (stdValue) {
				selectedIds.push(stdValue.id.toString());
			}
		}

		return selectedIds;
	};

	const handleDeleteAttribute = useCallback(
		(attributeId: string) => {
			const currentAttributes = attributes || [];
			onChange(
				currentAttributes.filter((attr) => attr.attributeId !== attributeId),
			);
		},
		[attributes, onChange],
	);

	// Check if an attribute is out of scope (not in predefined attributes)
	const isOutOfScopeAttribute = (attributeId: string) => {
		return !availableAttributes?.some(
			(attr) => attr.id.toString() === attributeId,
		);
	};

	// Get the display name for an attribute
	const getAttributeDisplayName = (attributeId: string) => {
		const attribute = availableAttributes?.find(
			(attr) => attr.id.toString() === attributeId,
		);
		return attribute ? attribute.name : attributeId;
	};

	// Get standardized values for an attribute
	const getStandardizedValues = (attributeId: number) => {
		return allAttributeValues?.[attributeId] || [];
	};

	// Check if attribute has standardized values
	const isStandardizedAttribute = (attributeId: number) => {
		const attribute = availableAttributes?.find(
			(attr) => attr.id === attributeId,
		);
		return (
			attribute?.valueType === "standardized" || attribute?.valueType === "both"
		);
	};

	if (isLoading) {
		return (
			<div className="p-4 text-center text-muted-foreground">
				<p>Загрузка атрибутов...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center text-destructive">
				<p>Ошибка загрузки атрибутов</p>
			</div>
		);
	}

	if (!availableAttributes || availableAttributes.length === 0) {
		return (
			<div className="p-4 text-center text-muted-foreground">
				<p>Нет доступных атрибутов</p>
				<p className="mt-1 text-sm">Создайте атрибуты в разделе "Атрибуты"</p>
			</div>
		);
	}

	// Separate out-of-scope attributes (from old database)
	const outOfScopeAttributes =
		attributes?.filter((attr) => isOutOfScopeAttribute(attr.attributeId)) || [];

	// Separate available attributes into input and checkbox groups
	// Maintain fixed order based on availableAttributes list, not based on whether they have values
	const availableInputAttributes = availableAttributes.filter(
		(attributeInfo) => {
			const isStandardized = isStandardizedAttribute(attributeInfo.id);
			const standardizedValues = isStandardized
				? getStandardizedValues(attributeInfo.id)
				: [];
			return !(isStandardized && standardizedValues.length > 0);
		},
	);

	const availableCheckboxAttributes = availableAttributes.filter(
		(attributeInfo) => {
			const isStandardized = isStandardizedAttribute(attributeInfo.id);
			const standardizedValues = isStandardized
				? getStandardizedValues(attributeInfo.id)
				: [];
			return isStandardized && standardizedValues.length > 0;
		},
	);

	// Create a map of attribute values for quick lookup
	const attributeValueMap = new Map<string, string>();
	(attributes || []).forEach((attr) => {
		attributeValueMap.set(attr.attributeId, attr.value);
	});

	// Render all input attributes in fixed order based on availableInputAttributes
	// This ensures positions don't change when values are added
	const allInputAttributes = availableInputAttributes.map((attributeInfo) => {
		const currentValue =
			attributeValueMap.get(attributeInfo.id.toString()) || "";
		return {
			attributeId: attributeInfo.id.toString(),
			value: currentValue,
			attributeInfo,
		};
	});

	return (
		<div className="space-y-6">
			<h3 className="mb-2 font-medium text-foreground text-sm">
				Атрибуты товара
			</h3>

			{/* Out-of-scope attributes (from old database) */}
			{outOfScopeAttributes.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center gap-2 font-medium text-amber-600 text-xs dark:text-amber-400">
						<AlertCircle className="h-4 w-4" />
						<span>Атрибуты из старой базы данных</span>
					</div>
					{outOfScopeAttributes.map((attr) => (
						<div
							key={attr.attributeId}
							className="rounded-md border border-destructive/40 bg-destructive/10 p-3 shadow-sm"
						>
							<div className="mb-2 flex items-start justify-between gap-2">
								<div className="flex items-center gap-2 text-destructive">
									<AlertCircle className="h-4 w-4" />
									<span className="font-medium text-sm">
										Атрибут из старой базы данных
									</span>
								</div>
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={() => handleDeleteAttribute(attr.attributeId)}
									className="shrink-0"
								>
									<Trash size={16} className="mr-1" />
									<span>Удалить</span>
								</Button>
							</div>
							<Input
								id={`out-of-scope-${attr.attributeId}`}
								label={getAttributeDisplayName(attr.attributeId)}
								value={attr.value}
								onChange={(e) =>
									handleUpdateAttributeValue(attr.attributeId, e.target.value)
								}
								className={cn(
									"text-sm",
									"border-destructive/30 bg-destructive/5 focus-visible:ring-destructive",
								)}
							/>
						</div>
					))}
					<div className="border-amber-200 border-t dark:border-amber-900" />
				</div>
			)}

			{/* First sub-block: Input fields (text inputs) in two columns on mobile, three on desktop */}
			{allInputAttributes.length > 0 && (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
					{allInputAttributes.map((item) => {
						return (
							<Input
								key={item.attributeId}
								id={`attr-${item.attributeId}`}
								label={item.attributeInfo.name}
								value={item.value}
								onChange={(e) =>
									handleUpdateAttributeValue(item.attributeId, e.target.value)
								}
								className="text-sm"
							/>
						);
					})}
				</div>
			)}

			{/* Second sub-block: Checkbox lists (standardized attributes) in full width */}
			{/* Always show all standardized attributes (like "Вид профиля") */}
			{availableCheckboxAttributes.length > 0 && (
				<div className="flex flex-wrap items-start justify-between gap-4">
					{availableCheckboxAttributes.map((attributeInfo) => {
						const allowMultiple = attributeInfo.allowMultipleValues === true;
						const selectedValues = getSelectedValues(attributeInfo.id);
						const standardizedValues = getStandardizedValues(attributeInfo.id);

						return (
							<div
								key={attributeInfo.id}
								className="min-w-fit shrink-0 space-y-2"
							>
								<label
									htmlFor={`attr-${attributeInfo.id}`}
									className="block whitespace-nowrap font-medium text-foreground text-sm"
								>
									{attributeInfo.name}
									{allowMultiple && (
										<span className="ml-2 text-muted-foreground text-xs">
											(можно выбрать несколько)
										</span>
									)}
								</label>
								<CheckboxList
									items={standardizedValues.map((stdValue) => ({
										id: stdValue.id.toString(),
										label: stdValue.value,
										isActive: stdValue.isActive,
									}))}
									selectedIds={selectedValues}
									onItemChange={(valueId, checked) => {
										handleAttributeValueToggle(
											attributeInfo.id.toString(),
											valueId as string,
											checked,
											allowMultiple,
										);
									}}
									idPrefix={`attr-${attributeInfo.id}-value`}
									showOnlyActive={true}
								/>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
