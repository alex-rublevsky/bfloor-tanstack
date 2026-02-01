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
import { Button } from "~/components/ui/shared/Button";
import { Input } from "~/components/ui/shared/input";
import {
	generateVariationSKU,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
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
	onChange: (variations: Variation[]) => void;
}

// Sortable variation item component
function SortableVariationItem({
	variation,
	onRemove,
	onUpdate,
	selectedAttributes,
	productAttributes,
}: {
	variation: Variation;
	onRemove: (id: string) => void;
	onUpdate: (
		id: string,
		field: keyof Variation,
		value: string | number | null,
	) => void;
	selectedAttributes: string[];
	productAttributes: ProductAttribute[];
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

	const handleAttributeValueChange = (attributeId: string, value: string) => {
		const newAttributeValues = {
			...variation.attributeValues,
			[attributeId]: value,
		};

		// Generate new SKU based on updated attribute values
		const attributeArray = selectedAttributes.map((attrId) => ({
			attributeId: attrId,
			value: newAttributeValues[attrId] || "",
		}));

		const newSKU = generateVariationSKU(
			productSlug,
			attributeArray,
			productAttributes,
		);

		onUpdate(variation.id, "attributeValues", newAttributeValues);
		onUpdate(variation.id, "sku", newSKU);
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={`relative cursor-grab space-y-3 rounded-md border border-border bg-background p-3 active:cursor-grabbing ${
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
					className="shrink-0 bg-destructive/20 hover:bg-destructive/90"
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
						placeholder="0"
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
						placeholder="0"
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
							const attribute = productAttributes.find(
								(attr) => attr.id.toString() === attributeId,
							);
							if (!attribute) return null;

							return (
								<div key={attributeId}>
									<Input
										id={`attr-${variation.id}-${attributeId}`}
										type="text"
										label={attribute.name}
										value={variation.attributeValues[attributeId] || ""}
										onChange={(e) =>
											handleAttributeValueChange(attributeId, e.target.value)
										}
										onPointerDown={(e) => e.stopPropagation()}
										placeholder="Значение"
										className="text-sm"
									/>
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

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = variations.findIndex((item) => item.id === active.id);
			const newIndex = variations.findIndex((item) => item.id === over.id);

			const newVariations = arrayMove(variations, oldIndex, newIndex).map(
				(item, index) => ({
					...item,
					sort: index,
				}),
			);

			onChange(newVariations);
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
			sort: variations.length,
			attributeValues: {}, // Empty attribute values initially
		};
		onChange([...variations, newVariation]);
	};

	const handleRemoveVariation = (id: string) => {
		onChange(variations.filter((variation) => variation.id !== id));
	};

	const handleUpdateVariation = (
		id: string,
		field: keyof Variation,
		value: string | number | null,
	) => {
		onChange(
			variations.map((variation) =>
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
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}
		</div>
	);
}
