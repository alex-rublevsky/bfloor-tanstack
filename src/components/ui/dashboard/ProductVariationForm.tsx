import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "~/components/ui/shared/Button";
import { CheckboxList } from "~/components/ui/shared/CheckboxList";
import { Input } from "~/components/ui/shared/input";
import {
	generateVariationSKU,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
import { allAttributeValuesByAttributeQueryOptions } from "~/lib/queryOptions";
import type { AttributeValue } from "~/server_functions/dashboard/attributes/getAllAttributeValuesByAttribute";
import type { ProductAttribute } from "~/types";

// Define the Variation type
interface Variation {
	id: string;
	sku: string; // Auto-generated SKU
	price: number;
	discount?: number | null;
	sort: number;
	attributeValues: Record<string, string>; // attributeId -> value mapping
}

interface ProductVariationFormProps {
	variations: Variation[];
	productSlug: string;
	selectedAttributes: string[]; // Array of selected attribute IDs
	onChange: (update: VariationUpdater) => void;
}

// Helper type for functional state updates
type VariationUpdater = Variation[] | ((prev: Variation[]) => Variation[]);

// Sortable variation item component
function SortableVariationItem({
	variation,
	onRemove,
	onUpdate,
	selectedAttributes,
	productAttributes,
	attributeMap,
	productSlug,
	onChange,
	allAttributeValues,
}: {
	variation: Variation;
	onRemove: (id: string) => void;
	onUpdate: (
		id: string,
		field: keyof Variation,
		value: string | number | null | Record<string, string>,
	) => void;
	selectedAttributes: string[];
	productAttributes: ProductAttribute[];
	attributeMap: Map<string, ProductAttribute>;
	productSlug: string;
	onChange: (update: VariationUpdater) => void;
	allAttributeValues?: Record<number, AttributeValue[]>;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: variation.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	// Core helper: updates this variation using a functional updater so we
	// always read from the latest state, never from potentially stale props.
	const updateVariation = (
		computeUpdates: (current: Variation) => Partial<Variation>,
	) => {
		onChange((prevVariations) =>
			prevVariations.map((v) => {
				if (v.id !== variation.id) return v;
				return { ...v, ...computeUpdates(v) };
			}),
		);
	};

	const handleAttributeValueChange = (attributeId: string, value: string) => {
		updateVariation((current) => {
			const newAttributeValues = {
				...current.attributeValues,
				[attributeId]: value,
			};

			const attributeArray = selectedAttributes.map((attrId) => ({
				attributeId: attrId,
				value: newAttributeValues[attrId] || "",
			}));

			const newSKU = generateVariationSKU(
				productSlug,
				attributeArray,
				productAttributes,
			);

			return { attributeValues: newAttributeValues, sku: newSKU };
		});
	};

	const handleStandardizedValueToggle = (
		attributeId: string,
		valueId: string,
		checked: boolean,
		allowMultiple: boolean,
		standardizedValues: Array<{ id: number; value: string; isActive: boolean }>,
	) => {
		const selectedValue = standardizedValues.find(
			(v) => v.id.toString() === valueId,
		);
		if (!selectedValue) return;

		updateVariation((current) => {
			const currentValue = current.attributeValues[attributeId] || "";
			const currentValues = currentValue
				? currentValue
						.split(",")
						.map((v) => v.trim())
						.filter(Boolean)
				: [];

			let newValue = "";
			if (allowMultiple) {
				let nextValues = currentValues;
				if (checked && !currentValues.includes(selectedValue.value)) {
					nextValues = [...currentValues, selectedValue.value];
				} else if (!checked) {
					nextValues = currentValues.filter((v) => v !== selectedValue.value);
				}
				newValue = nextValues.join(",");
			} else {
				newValue = checked ? selectedValue.value : "";
			}

			const newAttributeValues = {
				...current.attributeValues,
				[attributeId]: newValue,
			};

			const attributeArray = selectedAttributes.map((attrId) => ({
				attributeId: attrId,
				value: newAttributeValues[attrId] || "",
			}));

			const newSKU = generateVariationSKU(
				productSlug,
				attributeArray,
				productAttributes,
			);

			return { attributeValues: newAttributeValues, sku: newSKU };
		});
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={`relative cursor-grab space-y-3 rounded-md border-1 border-border bg-muted p-3 active:cursor-grabbing ${
				isDragging ? "opacity-50" : ""
			}`}
		>
			{/* First row: SKU with Remove button */}
			<div className="flex items-end gap-1">
				<div className="flex-1">
					<Input
						id={`sku-${variation.id}`}
						type="text"
						label="SKU"
						value={variation.sku}
						placeholder="Автоматически генерируется на основе атрибутов"
						disabled
						onPointerDown={(e) => e.stopPropagation()}
						labelBackgroundColor="bg-muted"
						className="bg-muted/50 text-sm"
					/>
				</div>
				<Button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(variation.id);
					}}
					onPointerDown={(e) => e.stopPropagation()}
					variant="destructive"
					size="sm"
					className=""
				>
					Удалить
				</Button>
			</div>

			{/* Second row: Price, Discount */}
			<div className="grid grid-cols-2 gap-2">
				<div>
					<Input
						id={`price-${variation.id}`}
						type="number"
						label="Цена"
						value={variation.price}
						onChange={(e) =>
							onUpdate(variation.id, "price", parseFloat(e.target.value) || 0)
						}
						onPointerDown={(e) => e.stopPropagation()}
						labelBackgroundColor="bg-muted"
						className="text-sm"
					/>
				</div>
				<div>
					<Input
						id={`discount-${variation.id}`}
						type="number"
						label="Скидка (%)"
						value={variation.discount || ""}
						onChange={(e) =>
							onUpdate(
								variation.id,
								"discount",
								e.target.value ? parseFloat(e.target.value) : null,
							)
						}
						onPointerDown={(e) => e.stopPropagation()}
						labelBackgroundColor="bg-muted"
						className="text-sm"
					/>
				</div>
			</div>

			{/* Attribute values section */}
			{selectedAttributes.length > 0 && (
				<div>
					<div className="mb-2 block font-medium text-foreground text-sm">
						Значения атрибутов
					</div>
					<div className="grid grid-cols-2 gap-2">
						{selectedAttributes.map((attributeId) => {
							// Use lookup map for O(1) access instead of O(n) find
							const attribute = attributeMap.get(attributeId);
							if (!attribute) return null;

							const isStandardized =
								attribute.valueType === "standardized" ||
								attribute.valueType === "both";
							const standardizedValues: AttributeValue[] =
								allAttributeValues?.[attribute.id] || [];
							const allowMultiple = attribute.allowMultipleValues === true;

							// Optimize selectedIds calculation using a value-to-id map
							const selectedIds =
								isStandardized && standardizedValues.length > 0
									? (() => {
											// Create value-to-id map for O(1) lookup instead of O(n) find
											const valueToIdMap = new Map<string, string>();
											standardizedValues.forEach((sv) => {
												valueToIdMap.set(sv.value, sv.id.toString());
											});

											const currentValue =
												variation.attributeValues[attributeId] || "";
											return currentValue
												.split(",")
												.map((v) => v.trim())
												.filter(Boolean)
												.map((value) => valueToIdMap.get(value))
												.filter(
													(valueId): valueId is string => valueId !== undefined,
												);
										})()
									: [];

							return (
								<div key={attributeId}>
									{isStandardized && standardizedValues.length > 0 ? (
										<div className="space-y-2">
											<label
												htmlFor={`attr-${variation.id}-${attributeId}`}
												className="block font-medium text-foreground text-sm"
											>
												{attribute.name}
											</label>
											<CheckboxList
												items={standardizedValues.map(
													(stdValue: AttributeValue) => ({
														id: stdValue.id.toString(),
														label: stdValue.value,
														isActive: stdValue.isActive,
													}),
												)}
												selectedIds={selectedIds}
												onItemChange={(valueId, checked) => {
													handleStandardizedValueToggle(
														attributeId,
														valueId as string,
														checked,
														allowMultiple,
														standardizedValues,
													);
												}}
												idPrefix={`attr-${variation.id}-${attributeId}-value`}
												showOnlyActive={true}
												scrollable={true}
												maxHeight="200px"
											/>
										</div>
									) : (
										<Input
											id={`attr-${variation.id}-${attributeId}`}
											type="text"
											label={attribute.name}
											value={variation.attributeValues[attributeId] || ""}
											onChange={(e) => {
												e.stopPropagation();
												handleAttributeValueChange(attributeId, e.target.value);
											}}
											onPointerDown={(e) => e.stopPropagation()}
											onClick={(e) => e.stopPropagation()}
											labelBackgroundColor="bg-muted"
											className="text-sm"
										/>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

export default function ProductVariationForm({
	variations,
	productSlug,
	selectedAttributes,
	onChange,
}: ProductVariationFormProps) {
	const { data: attributes } = useProductAttributes();
	const { data: allAttributeValues } = useQuery(
		allAttributeValuesByAttributeQueryOptions(),
	);

	// Create attribute lookup map for O(1) access instead of O(n) find
	const attributeMap = useMemo(() => {
		const map = new Map<string, ProductAttribute>();
		(attributes || []).forEach((attr) => {
			map.set(attr.id.toString(), attr);
		});
		return map;
	}, [attributes]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			onChange((prev) => {
				const oldIndex = prev.findIndex((item) => item.id === active.id);
				const newIndex = prev.findIndex((item) => item.id === over.id);
				return arrayMove(prev, oldIndex, newIndex).map((item, index) => ({
					...item,
					sort: index,
				}));
			});
		}
	};

	const handleAddVariation = () => {
		// Generate initial SKU based on selected attributes
		const attributeArray = selectedAttributes.map((attrId) => ({
			attributeId: attrId,
			value: "", // Empty values initially
		}));

		const newVariation: Variation = {
			id: `temp-${Date.now()}`,
			sku: generateVariationSKU(productSlug, attributeArray, attributes || []),
			price: 0,
			discount: null,
			sort: 0,
			attributeValues: {}, // Empty attribute values initially
		};
		onChange((prev) => [...prev, { ...newVariation, sort: prev.length }]);
	};

	const handleRemoveVariation = (id: string) => {
		onChange((prev) => prev.filter((variation) => variation.id !== id));
	};

	const handleUpdateVariation = (
		id: string,
		field: keyof Variation,
		value: string | number | null | Record<string, string>,
	) => {
		onChange((prev) =>
			prev.map((variation) =>
				variation.id === id ? { ...variation, [field]: value } : variation,
			),
		);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-medium text-foreground text-sm">
						Вариации товара
					</h3>
					<p className="text-muted-foreground text-sm">
						Создайте различные варианты товара с разными значениями атрибутов
					</p>
				</div>
				<Button
					type="button"
					onClick={handleAddVariation}
					size="sm"
					className="shrink-0"
				>
					Добавить вариацию
				</Button>
			</div>

			{variations.length === 0 ? (
				<div className="rounded-md border border-border border-dashed p-8 text-center">
					<p className="text-muted-foreground">
						Нет вариаций. Нажмите "Добавить вариацию" для создания первой
						вариации.
					</p>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={variations.map((v) => v.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-3">
							{variations.map((variation) => (
								<SortableVariationItem
									key={variation.id}
									variation={variation}
									onRemove={handleRemoveVariation}
									onUpdate={handleUpdateVariation}
									selectedAttributes={selectedAttributes}
									productAttributes={attributes || []}
									attributeMap={attributeMap}
									productSlug={productSlug}
									onChange={onChange}
									allAttributeValues={allAttributeValues}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}
		</div>
	);
}
