import { DrawerSection } from "~/components/ui/dashboard/DrawerSection";
import { Button } from "~/components/ui/shared/Button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "~/components/ui/shared/Drawer";
import { Image } from "~/components/ui/shared/Image";
import { formatDate } from "~/lib/utils";
import { X } from "../shared/Icon";

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

interface OrderDrawerProps {
	order: Order | null;
	isOpen: boolean;
	onClose: () => void;
}

export function OrderDrawer({ order, isOpen, onClose }: OrderDrawerProps) {
	if (!order) return null;

	return (
		<Drawer open={isOpen} onOpenChange={onClose}>
			<DrawerContent width="full">
				<DrawerHeader className="px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<DrawerTitle>Order #{order.id}</DrawerTitle>
						<Button size="icon" onClick={onClose}>
							<X className="h-5 w-5" />
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						Placed on {formatDate(order.createdAt)}
					</p>
				</DrawerHeader>

				<DrawerBody className="w-full p-0">
					<div className="space-y-6">
						{/* Payment Details */}
						<DrawerSection title="Детали оплаты">
							<div className="space-y-2">
								<p className="text-sm">
									<span className="font-medium">Subtotal:</span>{" "}
									{order.currency} {Math.round(order.subtotalAmount)}
								</p>
								{order.discountAmount > 0 && (
									<p className="text-sm">
										<span className="font-medium">Discount:</span> -
										{order.currency} {Math.round(order.discountAmount)}
									</p>
								)}
								{order.shippingAmount > 0 && (
									<p className="text-sm">
										<span className="font-medium">Shipping:</span>{" "}
										{order.currency} {Math.round(order.shippingAmount)}
									</p>
								)}
								<p className="text-sm font-semibold">
									<span className="font-medium">Total:</span> {order.currency}{" "}
									{Math.round(order.totalAmount)}
								</p>
								<p className="text-sm">
									<span className="font-medium">Status:</span>{" "}
									{order.paymentStatus}
								</p>
								{order.paymentMethod && (
									<p className="text-sm">
										<span className="font-medium">Method:</span>{" "}
										{order.paymentMethod}
									</p>
								)}
							</div>
						</DrawerSection>

						{/* Shipping Details */}
						<DrawerSection title="Доставка">
							<div className="space-y-2">
								<p className="text-sm">
									<span className="font-medium">Status:</span> {order.status}
								</p>
								{order.shippingMethod && (
									<p className="text-sm">
										<span className="font-medium">Method:</span>{" "}
										{order.shippingMethod}
									</p>
								)}
								{order.notes && (
									<p className="text-sm">
										<span className="font-medium">Notes:</span> {order.notes}
									</p>
								)}
							</div>
						</DrawerSection>

						{/* Order Items */}
						{order.items && order.items.length > 0 && (
							<DrawerSection title="Товары">
								<div className="space-y-4">
									{order.items.map((item) => (
										<div key={item.id} className="flex items-center gap-4">
											<div className="relative w-16 h-16 shrink-0 bg-muted rounded overflow-hidden">
												{item.product.images ? (
													<Image
														src={`https://assets.rublevsky.studio/${item.product.images.split(",").map((img) => img.trim())[0]}`}
														alt={item.product.name}
														className="object-cover"
														sizes="4rem"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
														No image
													</div>
												)}
											</div>
											<div className="flex-1">
												<p className="font-medium">{item.product.name}</p>
												{item.variation?.sku && (
													<p className="text-sm text-muted-foreground">
														SKU: {item.variation.sku}
													</p>
												)}
												{item.attributes &&
													Object.keys(item.attributes).length > 0 && (
														<p className="text-sm text-muted-foreground">
															{Object.entries(item.attributes)
																.map(([key, value]) => `${key}: ${value}`)
																.join(", ")}
														</p>
													)}
												<p className="text-sm text-muted-foreground">
													Qty: {item.quantity} × ${Math.round(item.unitAmount)}
												</p>
											</div>
											<p className="font-semibold">
												${Math.round(item.finalAmount)}
											</p>
										</div>
									))}
								</div>
							</DrawerSection>
						)}
					</div>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
