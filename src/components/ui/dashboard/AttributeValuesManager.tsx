import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/shared/Button";
import { Input } from "~/components/ui/shared/input";
import { attributeValuesQueryOptions } from "~/lib/queryOptions";
import { createAttributeValue } from "~/server_functions/dashboard/attributes/createAttributeValue";
import { deleteAttributeValue } from "~/server_functions/dashboard/attributes/deleteAttributeValue";
import type { AttributeValue } from "~/server_functions/dashboard/attributes/getAttributeValues";
import { updateAttributeValue } from "~/server_functions/dashboard/attributes/updateAttributeValue";
import { Edit, Loader2, Trash } from "../shared/Icon";

interface AttributeValuesManagerProps {
	attributeId: number;
}

export default function AttributeValuesManager({
	attributeId,
}: AttributeValuesManagerProps) {
	const queryClient = useQueryClient();
	const [newValue, setNewValue] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	// Fetch attribute values for this attribute
	const {
		data: values,
		isLoading,
		error,
	} = useQuery(attributeValuesQueryOptions(attributeId));

	const handleCreateValue = async () => {
		if (!newValue.trim()) {
			toast.error("Значение не может быть пустым");
			return;
		}

		setIsCreating(true);
		try {
			await createAttributeValue({
				data: {
					attributeId,
					value: newValue.trim(),
					slug: null, // Auto-generate slug if needed
				},
			});

			// Invalidate and refetch
			queryClient.invalidateQueries({
				queryKey: ["attributeValues", attributeId],
			});
			queryClient.invalidateQueries({
				queryKey: ["attributeValuesByAttribute"],
			});

			setNewValue("");
			toast.success("Значение добавлено");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Ошибка при добавлении значения",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteValue = async (valueId: number) => {
		if (
			!confirm(
				"Удалить это значение? Оно будет удалено из всех товаров, которые его используют.",
			)
		)
			return;

		try {
			const result = await deleteAttributeValue({ data: { id: valueId } });

			// Invalidate and refetch
			queryClient.invalidateQueries({
				queryKey: ["attributeValues", attributeId],
			});
			queryClient.invalidateQueries({
				queryKey: ["attributeValuesByAttribute"],
			});
			// Also invalidate products to refresh attribute displays
			queryClient.invalidateQueries({
				queryKey: ["products"],
			});

			// Show message with cleanup info
			if (result.updatedProducts > 0) {
				toast.success(
					`Значение удалено. Обновлено товаров: ${result.updatedProducts}`,
				);
			} else {
				toast.success("Значение удалено");
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Ошибка при удалении значения",
			);
		}
	};

	const handleUpdateValue = async (valueId: number, newValueText: string) => {
		if (!newValueText.trim()) {
			toast.error("Значение не может быть пустым");
			return;
		}

		try {
			await updateAttributeValue({
				data: {
					id: valueId,
					data: { value: newValueText.trim() },
				},
			});

			// Invalidate and refetch
			queryClient.invalidateQueries({
				queryKey: ["attributeValues", attributeId],
			});
			queryClient.invalidateQueries({
				queryKey: ["attributeValuesByAttribute"],
			});

			toast.success("Значение обновлено");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Ошибка при обновлении значения",
			);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-4">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-center text-destructive text-sm">
				Ошибка загрузки значений
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="font-medium text-foreground text-sm">
				Стандартизированные значения
			</div>

			{/* Existing values list */}
			{values && values.length > 0 ? (
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
					{values.map((value) => (
						<ValueItem
							key={value.id}
							value={value}
							onUpdate={(newText) => handleUpdateValue(value.id, newText)}
							onDelete={() => handleDeleteValue(value.id)}
						/>
					))}
				</div>
			) : (
				<div className="py-2 text-muted-foreground text-xs">
					Нет стандартизированных значений
				</div>
			)}

			{/* Add new value */}
			<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
				<div className="flex items-center gap-2 rounded-md border border-border bg-card p-2 transition-colors hover:bg-muted">
					<Input
						value={newValue}
						onChange={(e) => setNewValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleCreateValue();
							}
						}}
						placeholder="Введите новое значение..."
						className="h-8 flex-1 text-sm"
						disabled={isCreating}
					/>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={handleCreateValue}
						disabled={isCreating || !newValue.trim()}
						className="h-8 px-2"
					>
						{isCreating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Создать"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

// Component for individual value item with inline editing
function ValueItem({
	value,
	onUpdate,
	onDelete,
}: {
	value: AttributeValue;
	onUpdate: (newValue: string) => void;
	onDelete: () => void;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState(value.value);

	const handleSave = () => {
		if (editValue.trim() !== value.value) {
			onUpdate(editValue.trim());
		}
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditValue(value.value);
		setIsEditing(false);
	};

	return (
		<div className="flex items-center gap-2 rounded-md border border-border bg-card p-2 transition-colors hover:bg-muted">
			{isEditing ? (
				<>
					<Input
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleSave();
							} else if (e.key === "Escape") {
								handleCancel();
							}
						}}
						className="h-8 flex-1 text-sm"
						autoFocus
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleSave}
						className="h-8 px-2"
					>
						Сохранить
					</Button>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={handleCancel}
						className="h-8 px-2"
					>
						Отмена
					</Button>
				</>
			) : (
				<>
					<button
						type="button"
						className="flex-1 cursor-pointer text-left text-sm"
						onClick={() => setIsEditing(true)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								setIsEditing(true);
							}
						}}
						title="Нажмите для редактирования"
					>
						{value.value}
					</button>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => setIsEditing(true)}
						className="h-8 px-2"
					>
						<Edit className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={onDelete}
						className="h-8 px-2"
					>
						<Trash size={16} />
					</Button>
				</>
			)}
		</div>
	);
}
