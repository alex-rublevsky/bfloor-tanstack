import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Reorder } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { updateCategoryOrder } from "~/server_functions/dashboard/categories/updateCategoryOrder";
import type { Category } from "~/types";
import { cn } from "~/utils/utils";
import { Button } from "../shared/Button";
import { Check, GripVertical, X } from "../shared/Icon";

interface CategoryWithCount extends Category {
	productCount: number | null;
}

interface CategoryReorderProps {
	categories: CategoryWithCount[];
	isReorderMode: boolean;
	onExitReorderMode: () => void;
}

export function CategoryReorder({
	categories: initialCategories,
	isReorderMode,
	onExitReorderMode,
}: CategoryReorderProps) {
	// Sort categories by current order
	const [categories, setCategories] = useState(() =>
		[...initialCategories].sort((a, b) => a.order - b.order),
	);
	const [hasChanges, setHasChanges] = useState(false);

	// Sync with prop changes when entering reorder mode
	useEffect(() => {
		if (isReorderMode) {
			setCategories([...initialCategories].sort((a, b) => a.order - b.order));
			setHasChanges(false);
		}
	}, [isReorderMode, initialCategories]);

	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (orderedCategories: CategoryWithCount[]) => {
			const updates = orderedCategories.map((cat, index) => ({
				id: cat.id,
				order: index,
			}));
			return updateCategoryOrder({ data: { updates } });
		},
		onSuccess: () => {
			// Invalidate categories query to refetch with new order
			queryClient.invalidateQueries({ queryKey: ["bfloorCategories"] });
			setHasChanges(false);
			onExitReorderMode();
		},
	});

	const handleReorder = useCallback((newOrder: CategoryWithCount[]) => {
		setCategories(newOrder);
		setHasChanges(true);
	}, []);

	const handleSave = useCallback(() => {
		mutation.mutate(categories);
	}, [categories, mutation]);

	const handleCancel = useCallback(() => {
		// Reset to original order
		setCategories([...initialCategories].sort((a, b) => a.order - b.order));
		setHasChanges(false);
		onExitReorderMode();
	}, [initialCategories, onExitReorderMode]);

	return (
		<div className="flex flex-col gap-4">
			{/* Header with actions - only show in reorder mode */}
			{isReorderMode && (
				<div className="flex items-center justify-between gap-4">
					<p className="text-muted-foreground text-sm">
						Перетащите для изменения порядка
					</p>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={handleCancel}
							disabled={mutation.isPending}
						>
							<X className="mr-1 h-4 w-4" />
							Отмена
						</Button>
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={handleSave}
							disabled={!hasChanges || mutation.isPending}
						>
							<Check className="mr-1 h-4 w-4" />
							{mutation.isPending ? "Сохранение..." : "Сохранить"}
						</Button>
					</div>
				</div>
			)}

			{/* Reorderable list - compact vertical layout with max-width */}
			<div className="max-w-md rounded-lg border border-border p-3">
				<Reorder.Group
					axis="y"
					values={categories}
					onReorder={handleReorder}
					className="flex flex-col gap-1"
				>
					{categories.map((category, index) => (
						<Reorder.Item
							key={category.id}
							value={category}
							layout
							transition={{ duration: 0.15 }}
							className={cn(
								"flex cursor-grab items-center gap-2 rounded border border-transparent bg-background px-2 py-1",
								"touch-none select-none",
								"hover:border-border hover:bg-muted",
								"active:cursor-grabbing active:border-primary active:bg-primary/5",
							)}
						>
							{/* Drag handle */}
							<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

							{/* Order number */}
							<span className="w-5 shrink-0 text-center font-mono text-muted-foreground text-xs">
								{index + 1}
							</span>

							{/* Category name */}
							<span className="min-w-0 flex-1 truncate text-sm">
								{category.name}
							</span>

							{/* Product count */}
							{category.productCount !== null && (
								<span className="shrink-0 text-muted-foreground text-xs">
									{category.productCount}
								</span>
							)}
						</Reorder.Item>
					))}
				</Reorder.Group>
			</div>

			{/* Error message */}
			{mutation.isError && (
				<p className="text-destructive text-sm">
					Ошибка сохранения. Попробуйте ещё раз.
				</p>
			)}
		</div>
	);
}
