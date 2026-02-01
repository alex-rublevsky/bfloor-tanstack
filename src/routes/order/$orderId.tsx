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
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
					<p className="text-gray-600">Loading order details...</p>
				</div>
			</div>
		);
	}

	if (isError || !order) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="text-center">
					<h1 className="mb-2 font-bold text-2xl text-gray-900">
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
			<div className="mx-auto max-w-3xl space-y-8">
				{/* Header Section */}
				<div className="text-center">
					<div className="mb-6 flex justify-center">
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
						<p className="mb-2 text-muted-foreground">Order #{order.id}</p>
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
						<ol className="list-inside list-decimal space-y-2 text-secondary-foreground">
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
											className="h-auto w-full rounded-md"
										/>
									</div>
								)}
								<div className="grid flex-grow grid-rows-[auto_1fr] gap-2">
									<h6 className="break-words font-medium">
										{item.product?.name || "Product"}
									</h6>
									{item.productVariationId && (
										<p className="text-muted-foreground text-sm">
											Variation ID: {item.productVariationId}
										</p>
									)}
									<div className="grid grid-cols-[1fr_auto] gap-4">
										<div className="-mt-1 space-y-1">
											<p className="text-muted-foreground text-sm">
												Quantity: {item.quantity}
											</p>
											{item.attributes &&
												Object.keys(item.attributes).length > 0 && (
													<div className="flex flex-wrap gap-x-6 gap-y-0">
														{Object.entries(item.attributes).map(
															([key, value]) => (
																<span
																	key={key}
																	className="text-muted-foreground text-sm"
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
										<div className="self-end text-right">
											{item.discountPercentage ? (
												<>
													<Badge variant="green" className="-mr-1 mb-1">
														-{item.discountPercentage}%
													</Badge>
													<p className="text-muted-foreground line-through">
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
					<div className="flex justify-between">
						<p>Shipping</p>
						<p className="text-muted-foreground">
							{order.shippingAmount
								? `CA$${Math.round(order.shippingAmount)}`
								: "To be determined"}
						</p>
					</div>
					<div className="flex items-baseline justify-between border-t pt-2 text-lg">
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
