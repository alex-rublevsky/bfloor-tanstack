import { Button } from "./Button";
import { Plus, Search } from "./Icon";

interface EmptyStateProps {
	/** The type of entity that is empty (e.g., "brands", "collections", "products") */
	entityType: string;
	/** Whether this is a search result (shows different message) */
	isSearchResult?: boolean;
	/** Optional action button */
	actionButton?: {
		text: string;
		onClick: () => void;
	};
	/** Custom icon to display */
	icon?: React.ReactNode;
}

const entityTranslations: Record<
	string,
	{ singular: string; plural: string; genitive: string }
> = {
	brands: { singular: "бренд", plural: "бренды", genitive: "брендов" },
	collections: {
		singular: "коллекция",
		plural: "коллекции",
		genitive: "коллекций",
	},
	categories: {
		singular: "категория",
		plural: "категории",
		genitive: "категорий",
	},
	products: { singular: "товар", plural: "товары", genitive: "товаров" },
	orders: { singular: "заказ", plural: "заказы", genitive: "заказов" },
	attributes: {
		singular: "атрибут",
		plural: "атрибуты",
		genitive: "атрибутов",
	},
};

export function EmptyState({
	entityType,
	isSearchResult = false,
	actionButton,
	icon,
}: EmptyStateProps) {
	const entity = entityTranslations[entityType] || {
		singular: entityType,
		plural: entityType,
		genitive: entityType,
	};

	const defaultIcon = isSearchResult ? (
		<Search className="h-12 w-12 text-muted-foreground" />
	) : (
		<Plus className="h-12 w-12 text-muted-foreground" />
	);

	const title = isSearchResult
		? `Не найдено ${entity.genitive}`
		: `Пока нет ${entity.genitive}`;

	return (
		<div className="flex flex-col items-center justify-center px-4 py-16 text-center">
			{/* Icon */}
			<div className="mb-6">
				<div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-muted/30">
					{icon || defaultIcon}
				</div>
			</div>

			{/* Title */}
			<h3 className="mb-6 font-semibold text-foreground text-xl">{title}</h3>

			{/* Action Button */}
			{actionButton && (
				<Button onClick={actionButton.onClick} className="gap-2">
					<Plus className="h-4 w-4" />
					{actionButton.text}
				</Button>
			)}
		</div>
	);
}
