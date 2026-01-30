import { Button } from "~/components/ui/shared/Button";
import { Checkbox } from "~/components/ui/shared/Checkbox";
import { Image } from "~/components/ui/shared/Image";
import { Switch } from "~/components/ui/shared/Switch";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { formatDate } from "~/lib/utils";
import { Trash } from "../shared/Icon";

interface OrderItem {
	id: number;
	orderId: number;
	productId: number;
	quantity: number;
	unitAmount: number;
	finalAmount: number;
	discountPercentage: number | null;
	product: {
		name: string;
		images: string | null;
	};
	variation?: {
		id: number;
		sku: string;
	};
	attributes?: Record<string, string>;
}

interface Order {
	id: number;
	status: string;
	subtotalAmount: number;
	discountAmount: number;
	shippingAmount: number;
	totalAmount: number;
	currency: string;
	paymentMethod: string | null;
	paymentStatus: string;
	shippingMethod: string | null;
	notes: string | null;
	createdAt: Date;
	completedAt: Date | null;
	items: OrderItem[];
}

interface OrderCardProps {
	order: Order;
	onStatusToggle: (orderId: number, currentStatus: string) => Promise<void>;
	onDelete?: (orderId: number) => Promise<void>;
	onClick?: (order: Order) => void;
	isSelectionMode?: boolean;
	isSelected?: boolean;
	onSelectionChange?: (orderId: number, selected: boolean) => void;
}

export function OrderCard({
	order,
	onStatusToggle,
	onDelete,
	onClick,
	isSelectionMode = false,
	isSelected = false,
	onSelectionChange,
}: OrderCardProps) {
	const totalItems =
		order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

	return (
		<button
			className={`border rounded-lg p-4 space-y-4 hover:border-primary/50 transition-colors cursor-pointer w-full text-left ${
				isSelectionMode && isSelected ? "ring-2 ring-primary" : ""
			}`}
			onClick={() => {
				if (isSelectionMode) {
					// In selection mode, toggle selection
					onSelectionChange?.(order.id, !isSelected);
				} else {
					// Normal mode, open drawer
					onClick?.(order);
				}
			}}
			type="button"
		>
			{/* Header */}
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0 flex items-center gap-2">
					{isSelectionMode && (
						<Checkbox
							checked={isSelected}
							onCheckedChange={(checked) =>
								onSelectionChange?.(order.id, !!checked)
							}
							onClick={(e) => e.stopPropagation()}
						/>
					)}
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-xs text-foreground">#{order.id}</p>
						<p className="text-xs text-muted-foreground">
							{formatDate(order.createdAt)}
						</p>
						<p className="text-xs text-muted-foreground">
							{totalItems} {totalItems === 1 ? "item" : "items"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{onDelete && (
						<Button
							size="icon"
							variant="ghost"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(order.id);
							}}
							className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
						>
							<Trash size={16} />
						</Button>
					)}
				</div>
			</div>

			{/* All Order Items */}
			{order.items && order.items.length > 0 && (
				<div className="space-y-2">
					{order.items.map((item) => (
						<div key={item.id} className="flex items-center gap-2">
							<div className="relative w-12 h-12 shrink-0 bg-muted rounded overflow-hidden">
								{item.product.images ? (
									<Image
										src={`${ASSETS_BASE_URL}/${item.product.images.split(",").map((img) => img.trim())[0]}`}
										alt={item.product.name}
										className="object-cover"
										sizes="3rem"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
										No image
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-medium truncate">
									{item.product.name}
								</p>
								<p className="text-xs text-muted-foreground">
									Qty: {item.quantity} × ${Math.round(item.unitAmount)}
								</p>
							</div>
							<p className="text-xs font-medium shrink-0">
								${Math.round(item.finalAmount)}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Price and Status Toggle */}
			<div className="flex items-center justify-between pt-2 border-t">
				<div>
					<div className="flex items-baseline gap-0.5">
						<span className="text-xl font-light">
							{Math.round(order.totalAmount || 0)}
						</span>
						<span className="text-xs font-light text-muted-foreground">
							{order.currency}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						checked={order.status === "processed"}
						onChange={(e) => {
							e.stopPropagation();
							onStatusToggle(order.id, order.status);
						}}
					/>
				</div>
			</div>
		</button>
	);
}
