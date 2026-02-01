import { Switch } from "~/components/ui/shared/Switch";
import { useProductAttributes } from "~/hooks/useProductAttributes";

interface ProductVariationAttributesSelectorProps {
	selectedAttributes: string[]; // Array of attribute IDs that are selected
	onChange: (selectedAttributes: string[]) => void;
}

export default function ProductVariationAttributesSelector({
	selectedAttributes,
	onChange,
}: ProductVariationAttributesSelectorProps) {
	const { data: availableAttributes } = useProductAttributes();

	const handleAttributeToggle = (attributeId: string) => {
		if (selectedAttributes.includes(attributeId)) {
			// Remove attribute
			onChange(selectedAttributes.filter((id) => id !== attributeId));
		} else {
			// Add attribute
			onChange([...selectedAttributes, attributeId]);
		}
	};

	if (!availableAttributes || availableAttributes.length === 0) {
		return (
			<div className="rounded-md border border-border border-dashed p-4 text-center text-muted-foreground">
				<p>Нет доступных атрибутов для вариаций</p>
				<p className="mt-1 text-sm">Создайте атрибуты в разделе "Атрибуты"</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div>
				<h3 className="mb-3 font-medium text-foreground text-sm">
					Выберите атрибуты для вариаций
				</h3>
				<p className="mb-4 text-muted-foreground text-sm">
					Выбранные атрибуты будут использоваться для всех вариаций товара
				</p>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				{availableAttributes.map((attribute) => {
					const attributeIdStr = attribute.id.toString();
					const isSelected = selectedAttributes.includes(attributeIdStr);

					return (
						<div
							key={attribute.id}
							className="flex items-center space-x-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/50"
						>
							<Switch
								id={`attr-${attribute.id}`}
								checked={isSelected}
								onChange={() => handleAttributeToggle(attributeIdStr)}
							/>
							<label
								htmlFor={`attr-${attribute.id}`}
								className="flex-1 cursor-pointer font-medium text-sm"
							>
								{attribute.name}
							</label>
						</div>
					);
				})}
			</div>

			{selectedAttributes.length > 0 && (
				<div className="mt-4 rounded-md bg-muted/30 p-3">
					<p className="text-muted-foreground text-sm">
						Выбрано атрибутов:{" "}
						<span className="font-medium text-foreground">
							{selectedAttributes.length}
						</span>
					</p>
				</div>
			)}
		</div>
	);
}
