import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/shared/Button";
import {
	Check,
	ChevronLeft,
	Download,
	Phone,
	Telegram,
	Trash,
	WhatsApp,
	X,
} from "~/components/ui/shared/Icon";
import { Input } from "~/components/ui/shared/input";
import { Link } from "~/components/ui/shared/Link";
import { QuantitySelector } from "~/components/ui/shared/QuantitySelector";
import { Textarea } from "~/components/ui/shared/TextArea";
import { ASSETS_BASE_URL } from "~/constants/urls";
import type { EnrichedCartItem } from "~/hooks/useEnrichedCart";
import { useEnrichedCart } from "~/hooks/useEnrichedCart";
import { useCart } from "~/lib/cartContext";
import { createOrder } from "~/server_functions/dashboard/orders/orderCreation";
import { sendOrderEmails } from "~/server_functions/sendOrderEmails";
import type { ProductListItem } from "~/types";
import { parseImages } from "~/utils/productParsing";
import { getStoreProductsFromInfiniteCache } from "~/utils/storeCache";

// Email icon component - defined as const to ensure it's accessible
const EmailIcon = ({
	className = "",
	size = 24,
}: {
	className?: string;
	size?: number;
}) => {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<title>Email</title>
			<rect width="20" height="16" x="2" y="4" rx="2" />
			<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
		</svg>
	);
};

interface CustomerInfo {
	fullName: string;
	phone: string;
	email: string;
	notes?: string;
	contactMethod?: "whatsapp" | "email" | "telegram" | "phone";
	shippingMethod?: string;
}

export const Route = createFileRoute("/store/checkout")({
	component: CheckoutPage,
});

function CheckoutPage() {
	return <CheckoutScreen />;
}

function CheckoutScreen() {
	const navigate = useNavigate();
	const { cart, clearCart, updateQuantity, removeFromCart } = useCart();
	const enrichedItems = useEnrichedCart(cart.items);
	const queryClient = useQueryClient();
	const formRef = React.useRef<HTMLFormElement>(null);
	const notesId = useId();
	const fullNameId = useId();
	const phoneId = useId();
	const emailId = useId();

	const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
		fullName: "",
		phone: "",
		email: "",
		notes: "",
		contactMethod: "whatsapp",
		shippingMethod: "standard",
	});

	// Order creation mutation
	const orderMutation = useMutation({
		mutationFn: async (orderData: {
			customerInfo: CustomerInfo;
			cartItems: EnrichedCartItem[];
			products: ProductListItem[];
		}) => {
			const orderResult = await createOrder({ data: orderData });
			if (!orderResult.success) {
				throw new Error("Failed to create order");
			}

			if (!orderResult.orderId) {
				throw new Error("Order was created but no order ID was returned");
			}

			try {
				const emailResult = await sendOrderEmails({
					data: {
						orderId: orderResult.orderId,
						customerInfo: orderData.customerInfo,
						cartItems: orderData.cartItems,
						orderAmounts: {
							subtotalAmount: subtotal,
							discountAmount: totalDiscount,
						},
						totalAmount: total,
					},
				});

				return {
					orderId: orderResult.orderId,
					emailWarnings: emailResult.emailWarnings,
				};
			} catch (_emailError) {
				return {
					orderId: orderResult.orderId,
					emailWarnings: ["Не удалось отправить письма с подтверждением"],
				};
			}
		},
		onSuccess: ({ orderId, emailWarnings }) => {
			if (emailWarnings && emailWarnings.length > 0) {
				toast.warning(
					`Заказ успешно размещён! ${emailWarnings.join(", ")}. Наша команда свяжется с вами в ближайшее время.`,
					{ duration: 5000 },
				);
			} else {
				toast.success(
					"Заказ размещён и письма с подтверждением отправлены! 🎉",
					{
						duration: 3000,
					},
				);
			}

			const orderData = {
				orderId,
				customerInfo,
				items: enrichedItems.map((item, index) => ({
					id: index,
					productName: item.productName,
					quantity: item.quantity,
					unitAmount: item.price,
					finalAmount: item.discount
						? item.price * (1 - item.discount / 100) * item.quantity
						: item.price * item.quantity,
					discountPercentage: item.discount,
					attributes: item.attributes || {},
					image: item.images,
				})),
				subtotalAmount: subtotal,
				discountAmount: totalDiscount,
				totalAmount: total,
				shippingAmount: 0,
				timestamp: Date.now(),
			};

			sessionStorage.setItem("orderSuccess", JSON.stringify(orderData));

			setTimeout(() => {
				clearCart();
				window.location.href = `/order/${orderId}?new=true`;
			}, 1000);
		},
		onError: (error: Error) => {
			toast.error(
				error.message ||
					"Не удалось разместить заказ. Пожалуйста, попробуйте снова.",
				{
					duration: 5000,
				},
			);
		},
	});

	const isLoading = orderMutation.isPending;

	const handleButtonClick = () => {
		if (cart.items.length === 0) {
			toast.error("Ваша корзина пуста");
		} else {
			const formElement = formRef.current;
			if (formElement) {
				formElement.requestSubmit();
			}
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;
		setCustomerInfo((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (cart.items.length === 0) {
			toast.error("Ваша корзина пуста");
			return;
		}

		const products = getStoreProductsFromInfiniteCache(queryClient);

		orderMutation.mutate({
			customerInfo,
			cartItems: enrichedItems,
			products: products as unknown as ProductListItem[],
		});
	};

	// Calculate cart totals
	const subtotal = enrichedItems.reduce(
		(total, item) => total + item.price * item.quantity,
		0,
	);

	const totalDiscount = enrichedItems.reduce((total, item) => {
		if (item.discount) {
			const itemDiscount = item.price * item.quantity * (item.discount / 100);
			return total + itemDiscount;
		}
		return total;
	}, 0);

	const total = subtotal - totalDiscount;

	const handleSaveToPDF = () => {
		toast.info("Функция сохранения в PDF будет добавлена в ближайшее время");
	};

	const handleClearCart = () => {
		if (confirm("Вы уверены, что хотите очистить корзину?")) {
			clearCart();
		}
	};

	return (
		<div className="min-h-screen w-full">
			<div className="mx-auto max-w-[1400px] px-4 py-8">
				{/* Cart Title Section */}
				<div className="mb-6 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => navigate({ to: "/store" })}
							className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-muted"
							aria-label="Назад"
						>
							<ChevronLeft size={20} />
						</button>
						<h1 className="font-bold text-3xl">
							Корзина {cart.items.length > 0 && `(${cart.items.length})`}
						</h1>
					</div>

					{/* Cart Actions - Moved to header */}
					{cart.items.length > 0 && (
						<div className="flex items-center gap-4">
							<button
								type="button"
								onClick={handleSaveToPDF}
								className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
							>
								<Download size={18} />
								<span>Сохранить в PDF</span>
							</button>
							<button
								type="button"
								onClick={handleClearCart}
								className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
							>
								<Trash size={18} />
								<span>Очистить корзину</span>
							</button>
						</div>
					)}
				</div>

				<div className="mb-6 border-border border-t"></div>

				<div className="flex flex-col gap-8 lg:flex-row">
					{/* Left Side - Cart Items */}
					<div className="flex-1">
						{cart.items.length === 0 ? (
							<div className="py-12 text-center">
								<p className="text-lg text-muted-foreground">
									Ваша корзина пуста
								</p>
								<Button to="/store" variant="default" className="mt-4">
									Перейти в каталог
								</Button>
							</div>
						) : enrichedItems.length === 0 && cart.items.length > 0 ? (
							<div className="py-12 text-center">
								<p className="text-lg text-muted-foreground">
									Загрузка товаров...
								</p>
							</div>
						) : (
							<>
								{/* Cart Items */}
								<div className="space-y-6">
									{enrichedItems.map((item) => {
										const imageArray = parseImages(item.images);
										const itemTotal = item.discount
											? item.price * (1 - item.discount / 100) * item.quantity
											: item.price * item.quantity;
										const itemArea = item.quantity * 2.159; // Placeholder - adjust based on your data

										return (
											<div
												key={`${item.productId}-${item.variationId || "default"}`}
												className="flex items-start gap-4 rounded-lg border border-border bg-background p-4"
											>
												{/* Product Image */}
												<div className="h-24 w-24 shrink-0 overflow-hidden rounded bg-muted">
													{imageArray.length > 0 ? (
														<img
															src={`${ASSETS_BASE_URL}/${imageArray[0]}`}
															alt={item.productName}
															className="h-full w-full object-cover"
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
															Нет изображения
														</div>
													)}
												</div>

												{/* Product Details */}
												<div className="flex flex-1 flex-col gap-2">
													<div>
														<p className="text-muted-foreground text-sm">
															{item.price.toFixed(0)} | м²
														</p>
														<Link
															href={`/product/${item.productSlug}`}
															className="font-medium text-base hover:underline"
														>
															{item.productName}
														</Link>
													</div>

													{/* Quantity Selector */}
													<div className="flex items-center gap-2">
														<QuantitySelector
															quantity={item.quantity}
															onIncrement={() =>
																updateQuantity(
																	item.productId,
																	item.quantity + 1,
																	item.variationId,
																)
															}
															onDecrement={() =>
																item.quantity > 1
																	? updateQuantity(
																			item.productId,
																			item.quantity - 1,
																			item.variationId,
																		)
																	: removeFromCart(
																			item.productId,
																			item.variationId,
																		)
															}
															size="compact"
														/>
														<span className="text-muted-foreground text-sm">
															уп
														</span>
													</div>
												</div>

												{/* Price and Area */}
												<div className="text-right">
													<p className="font-bold text-xl">
														{itemTotal.toFixed(0)} р
													</p>
													<p className="text-muted-foreground text-sm">
														{itemArea.toFixed(3)} м²
													</p>
												</div>

												{/* Remove Button */}
												<button
													type="button"
													onClick={() =>
														removeFromCart(item.productId, item.variationId)
													}
													className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-muted"
													aria-label="Удалить из корзины"
												>
													<X size={18} />
												</button>
											</div>
										);
									})}
								</div>
							</>
						)}
					</div>

					{/* Right Side - Order Summary and Form */}
					<div className="lg:sticky lg:top-4 lg:w-[400px] lg:self-start">
						{/* Order Summary Box */}
						<div className="mb-6 rounded-lg border-2 border-primary bg-background p-6">
							<p className="mb-2 text-sm">Итого</p>
							<p className="mb-4 font-bold text-3xl text-primary">
								{total.toFixed(0)} р
							</p>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Позиций</span>
								<span className="font-medium">{enrichedItems.length}</span>
							</div>
						</div>

						{/* Contact Form */}
						<form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
							<Input
								id={fullNameId}
								name="fullName"
								label="Фамилия Имя Отчество"
								value={customerInfo.fullName}
								onChange={handleInputChange}
							/>

							<Input
								id={phoneId}
								name="phone"
								type="tel"
								label="Телефон"
								value={customerInfo.phone}
								onChange={handleInputChange}
							/>

							<Input
								id={emailId}
								name="email"
								type="email"
								label="Электронная почта"
								value={customerInfo.email}
								onChange={handleInputChange}
							/>

							<div>
								<Textarea
									id={notesId}
									name="notes"
									label="Комментарий"
									value={customerInfo.notes}
									onChange={handleInputChange}
									rows={4}
								/>
							</div>

							{/* Contact Method Selection */}
							<div>
								<p className="mb-3 block text-muted-foreground text-sm">
									Связаться со мной через
								</p>
								<div className="flex gap-3">
									{[
										{ value: "whatsapp", icon: WhatsApp, label: "WhatsApp" },
										{ value: "email", icon: EmailIcon, label: "Email" },
										{ value: "telegram", icon: Telegram, label: "Telegram" },
										{ value: "phone", icon: Phone, label: "Телефон" },
									].map(({ value, icon: Icon, label }) => (
										<button
											key={value}
											type="button"
											onClick={() =>
												setCustomerInfo((prev) => ({
													...prev,
													contactMethod: value as CustomerInfo["contactMethod"],
												}))
											}
											className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 transition-colors ${
												customerInfo.contactMethod === value
													? "border-primary bg-primary/10"
													: "border-border hover:border-primary/50"
											}`}
											aria-label={label}
										>
											<Icon
												size={20}
												className={
													customerInfo.contactMethod === value
														? "text-primary"
														: "text-muted-foreground"
												}
											/>
										</button>
									))}
								</div>
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								onClick={handleButtonClick}
								disabled={isLoading || cart.items.length === 0}
								variant="default"
								className="h-12 w-full font-medium text-base"
							>
								{isLoading ? (
									<span className="flex items-center gap-2">
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
										Оформление заказа...
									</span>
								) : (
									"Оформить заявку"
								)}
							</Button>

							{/* Security Message */}
							<div className="flex items-center gap-2 pt-2 text-muted-foreground text-xs">
								<Check size={16} className="text-green-600" />
								<span>
									Данные в безопасности, надёжно защищены и не передаются
									третьим лицам
								</span>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
