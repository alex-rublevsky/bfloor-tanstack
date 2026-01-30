import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "~/components/ui/shared/Badge";
import { Button } from "~/components/ui/shared/Button";
import { CheckCircle, Clock } from "~/components/ui/shared/Icon";
import { Image } from "~/components/ui/shared/Image";
import {
	getAttributeDisplayName,
	useProductAttributes,
} from "~/hooks/useProductAttributes";
import { formatDate } from "~/lib/utils";
import { getOrderBySlug } from "~/server_functions/dashboard/orders/getOrderBySlug";

// Helper function to get first image from comma-separated string
function getFirstImage(images: string | null): string | null {
	if (!images) return null;
	const imageArray = images
		.split(",")
		.map((img) => img.trim())
		.filter((img) => img !== "");
	return imageArray.length > 0 ? imageArray[0] : null;
}

export const Route = createFileRoute("/order/$orderId")({
	component: OrderPage,
	validateSearch: (search: Record<string, unknown>) => ({
		new: search.new === "true" || search.new === true,
	}),
});

function OrderPage() {
	const { orderId } = Route.useParams();
	const search = Route.useSearch();
	const { data: attributes } = useProductAttributes();

	const {
		isPending,
		data: order,
		isError,
	} = useQuery({
		queryKey: ["bfloorOrder", orderId],
		queryFn: async () => {
			try {
				return await getOrderBySlug({ data: { orderId } });
			} catch (error) {
				if (error instanceof Error && error.message === "Order not found") {
					throw notFound();
				}
				throw error;
			}
		},
	});

	//TODO: update this to use a skeleton
	if (isPending) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-600">Loading order details...</p>
				</div>
			</div>
		);
	}

	if (isError || !order) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Order Not Found
					</h1>
					<p className="text-gray-600">
						The order you're looking for doesn't exist.
					</p>
				</div>
			</div>
		);
	}

	const isNewOrder = search.new === true;

	return (
		<section className="py-16">
			<div className="max-w-3xl mx-auto space-y-8">
				{/* Header Section */}
				<div className="text-center">
					<div className="flex justify-center mb-6">
						{isNewOrder ? (
							<CheckCircle className="h-16 w-16 text-green-500" />
						) : (
							<Clock className="h-16 w-16 text-muted" />
						)}
					</div>

					<h3 className="mb-3 text-muted-foreground">
						{isNewOrder ? "Thank You for Your Order!" : "Order Details"}
					</h3>

					<div className="flex justify-center gap-8">
						<p className="text-muted-foreground mb-2">Order #{order.id}</p>
						<p className="text-muted-foreground">
							Placed on {formatDate(order.createdAt)}
						</p>
					</div>

					{/* Order Status Badge */}
					<div className="mt-4">
						<Badge
							variant={
								order.status === "processed"
									? "default"
									: order.status === "pending"
										? "secondary"
										: "outline"
							}
						>
							{order.status}
						</Badge>
					</div>
				</div>

				{/* What Happens Next Section - Only shown for new orders */}
				{isNewOrder && (
					<>
						<h5 className="text-muted-foreground">What happens next?</h5>
						<ol className="list-decimal list-inside space-y-2 text-secondary-foreground">
							<li>You will receive an order confirmation email shortly.</li>
							<li>
								Our team will review your order and contact you to discuss
								shipping options and costs.
							</li>
							<li>
								Once shipping is arranged, we will send you payment details.
							</li>
							<li>
								After payment is confirmed, your order will be prepared for
								shipping.
							</li>
						</ol>
					</>
				)}

				{/* Order Items Section */}
				<div className="space-y-4">
					<div className="space-y-4">
						{order.items?.map((item) => (
							<>
								{item.product?.images && (
									<div className="w-20 flex-shrink-0">
										<Image
											src={`https://assets.rublevsky.studio/${getFirstImage(item.product.images)}`}
											alt={item.product.name}
											width={80}
											height={80}
											className="rounded-md w-full h-auto"
										/>
									</div>
								)}
								<div className="grid flex-grow grid-rows-[auto_1fr] gap-2">
									<h6 className="font-medium break-words">
										{item.product?.name || "Product"}
									</h6>
									{item.productVariationId && (
										<p className="text-sm text-muted-foreground">
											Variation ID: {item.productVariationId}
										</p>
									)}
									<div className="grid grid-cols-[1fr_auto] gap-4">
										<div className="space-y-1 -mt-1">
											<p className="text-sm text-muted-foreground">
												Quantity: {item.quantity}
											</p>
											{item.attributes &&
												Object.keys(item.attributes).length > 0 && (
													<div className="flex flex-wrap gap-x-6 gap-y-0">
														{Object.entries(item.attributes).map(
															([key, value]) => (
																<span
																	key={key}
																	className="text-sm text-muted-foreground"
																>
																	{getAttributeDisplayName(
																		key,
																		attributes || [],
																	)}
																	: {String(value)}
																</span>
															),
														)}
													</div>
												)}
										</div>
										<div className="text-right self-end">
											{item.discountPercentage ? (
												<>
													<Badge variant="green" className="mb-1 -mr-1">
														-{item.discountPercentage}%
													</Badge>
													<p className="line-through text-muted-foreground">
														CA${Math.round(item.unitAmount * item.quantity)}
													</p>
												</>
											) : null}
											<h6 className="">CA${Math.round(item.finalAmount)}</h6>
										</div>
									</div>
								</div>
							</>
						))}
					</div>
				</div>

				{/* Order Summary Section */}
				<div className="space-y-2">
					<div className="flex justify-between">
						<p>Subtotal</p>
						<p>CA${Math.round(order.subtotalAmount)}</p>
					</div>
					{order.discountAmount > 0 && (
						<div className="flex justify-between text-green-600">
							<p>Discount</p>
							<Badge variant="green" className="self-end">
								-CA${Math.round(order.discountAmount)}
							</Badge>
						</div>
					)}
					<div className="flex justify-between ">
						<p>Shipping</p>
						<p className="text-muted-foreground">
							{order.shippingAmount
								? `CA$${Math.round(order.shippingAmount)}`
								: "To be determined"}
						</p>
					</div>
					<div className="flex justify-between items-baseline text-lg pt-2 border-t">
						<h5>Total</h5>
						<h3>CA${Math.round(order.totalAmount)}</h3>
					</div>
				</div>

				{/* Actions Section */}
				<div className="flex justify-center gap-4">
					<Button asChild variant="outline">
						<Link to="/store">Continue Shopping</Link>
					</Button>
					{!isNewOrder && (
						<Button asChild variant="outline">
							<a href="mailto:support@rublevsky.studio">Contact Support</a>
						</Button>
					)}
				</div>
			</div>
		</section>
	);
}
