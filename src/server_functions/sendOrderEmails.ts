import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";
import { env } from "~/utils/env";

interface CartItem {
	productId: number;
	productName: string;
	productSlug: string;
	variationId?: number;
	quantity: number;
	price: number;
	discount?: number | null;
	image?: string;
	attributes?: Record<string, string>;
	squareMetersPerPack?: number | null;
}

interface Address {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	streetAddress: string;
	city: string;
	state: string;
	country: string;
	zipCode: string;
}

interface CustomerInfo {
	shippingAddress?: Address;
	billingAddress?: Address;
	notes?: string;
	shippingMethod?: string;
}

interface EmailData {
	orderId: number;
	customerInfo: CustomerInfo;
	cartItems: CartItem[];
	orderAmounts: { subtotalAmount: number; discountAmount: number };
	totalAmount: number;
}

// HTML Email Templates (replacing React Email components for server function compatibility)
function generateClientEmailHtml(data: {
	Name?: string;
	LastName?: string;
	email?: string;
	orderId: string;
	orderDate: string;
	subtotal: string;
	totalDiscount?: string;
	orderTotal: string;
	orderStatus: string;
	orderItems: Array<{
		name: string;
		quantity: number;
		price: string;
		originalPrice: string;
		discount?: number;
		image?: string;
	}>;
}): string {
	const orderItemsHtml = data.orderItems
		.map(
			(item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; width: 80px;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />` : ""}
      </td>
      <td style="padding: 12px 16px; text-align: left;">
        <p style="margin: 0; font-weight: 500;">${item.name}</p>
      </td>
      <td style="padding: 12px 0; text-align: right;">
        ${
					item.discount
						? `
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px;">
              <span style="color: #dc2626; font-weight: 500;">-${item.discount}%</span>
              <span style="text-decoration: line-through; color: #6b7280; margin-left: 8px;">${item.originalPrice}</span>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 18px; color: #000;">${item.price}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Quantity: ${item.quantity}</p>
          </div>
        `
						: `
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 18px; color: #000;">${item.price}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Quantity: ${item.quantity}</p>
          </div>
        `
				}
      </td>
    </tr>
  `,
		)
		.join("");

	return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Order Confirmation from Rublevsky Studio</title>
      </head>
      <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff;">
        <div style="max-width: 465px; margin: 40px auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
          
          <!-- Logo -->
          <div style="text-align: center; margin: 32px 0;">
            <img src="https://assets.rublevsky.studio/logos/rublevsky-studio.svg" width="40" height="37" alt="Rublevsky Studio" />
          </div>
          
          <!-- Heading -->
          <h1 style="color: #000; font-size: 24px; font-weight: normal; text-align: center; margin: 30px 0;">
            Your order has been placed successfully!
          </h1>
          
          <!-- Greeting -->
          <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0 0 8px 0;">
            Greetings${data.Name && data.LastName ? `, ${data.Name} ${data.LastName}` : ""}!
          </p>
          <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0 0 24px 0;">
            You will be contacted shortly regarding delivery and payment.
          </p>
          
          <!-- Order Items -->
          <div style="text-align: center; margin: 24px 0;">
            <table style="width: 100%; margin-bottom: 16px;">
              ${orderItemsHtml}
            </table>
            
            <!-- Totals -->
            <div style="text-align: right; padding: 0 12px;">
              <p style="margin: 8px 0; color: #6b7280;">Subtotal: ${data.subtotal}</p>
              ${Number(data.totalDiscount || 0) > 0 ? `<p style="margin: 8px 0; color: #dc2626;">Discount: -${data.totalDiscount}</p>` : ""}
              <p style="margin: 16px 0 24px 0; font-weight: 600; font-size: 18px;">Total: ${data.orderTotal}</p>
            </div>
            
            <!-- View Order Button -->
            <div style="text-align: center;">
              <a href="https://www.rublevsky.studio/order/${data.orderId}" 
                 style="display: inline-block; width: 100%; max-width: 200px; background-color: #000; color: #fff; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 500; text-align: center;">
                View Order
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
            or copy and paste this URL into your browser: 
            <a href="https://www.rublevsky.studio/order/${data.orderId}" style="color: #60a5fa; text-decoration: none;">
              https://www.rublevsky.studio/order/${data.orderId}
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 26px 0;" />
          
          <p style="color: #6b7280; font-size: 12px; line-height: 1.8; margin: 0;">
            ${data.Name ? `This order confirmation was intended for <strong>${data.Name}</strong>.` : "This order confirmation was sent to the provided email address."} 
            This email was sent from <strong>Rublevsky Studio</strong> located in <strong>Ontario, Canada</strong>. 
            If you were not expecting this order confirmation, you can ignore this email. 
            If you are concerned about your account's safety, please reply to this email to get in touch with us.
          </p>
        </div>
      </body>
    </html>
  `;
}

function generateAdminEmailHtml(data: {
	Name?: string;
	LastName?: string;
	email?: string;
	orderId: string;
	orderDate: string;
	subtotal: string;
	totalDiscount?: string;
	orderTotal: string;
	orderStatus: string;
	shippingMethod?: string;
	shippingAddress?: Address;
	billingAddress?: Address;
	orderItems: Array<{
		name: string;
		quantity: number;
		price: string;
		originalPrice: string;
		discount?: number;
		image?: string;
	}>;
}): string {
	const orderItemsHtml = data.orderItems
		.map(
			(item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; width: 80px;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />` : ""}
      </td>
      <td style="padding: 12px 16px; text-align: left;">
        <p style="margin: 0; font-weight: 500;">${item.name}</p>
      </td>
      <td style="padding: 12px 0; text-align: right;">
        ${
					item.discount
						? `
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 14px;">
              <span style="color: #dc2626; font-weight: 500;">-${item.discount}%</span>
              <span style="text-decoration: line-through; color: #6b7280; margin-left: 8px;">${item.originalPrice}</span>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 18px; color: #000;">${item.price}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Quantity: ${item.quantity}</p>
          </div>
        `
						: `
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 18px; color: #000;">${item.price}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Quantity: ${item.quantity}</p>
          </div>
        `
				}
      </td>
    </tr>
  `,
		)
		.join("");

	return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>New Order Received - Rublevsky Studio</title>
      </head>
      <body style="margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff;">
        <div style="max-width: 465px; margin: 40px auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
          
          <!-- Logo -->
          <div style="text-align: center; margin: 32px 0;">
            <img src="https://assets.rublevsky.studio/logos/rublevsky-studio.svg" width="40" height="37" alt="Rublevsky Studio" />
          </div>
          
          <!-- Heading -->
          <h1 style="color: #000; font-size: 24px; font-weight: normal; text-align: center; margin: 30px 0;">
            New Order Received!
          </h1>
          
          <!-- Order Info -->
          <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0 0 8px 0;">
            Order #${data.orderId} has been placed${data.Name && data.LastName ? ` by ${data.Name} ${data.LastName}` : ""}.
          </p>
          <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0 0 16px 0;">
            ${data.email ? `Customer Email: ${data.email}` : "Customer email not provided"}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 16px 0;" />
          
          <!-- Shipping Details -->
          <h3 style="color: #000; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0;">Shipping Details</h3>
          <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0 0 8px 0;">
            Method: ${data.shippingMethod || "Not specified"}
          </p>
          <div style="margin-bottom: 16px;">
            <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0;">
              ${
								data.shippingAddress
									? `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}<br/>
                ${data.shippingAddress.streetAddress}<br/>
                ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}<br/>
                ${data.shippingAddress.country}<br/>
                Phone: ${data.shippingAddress.phone}`
									: "Shipping address to be provided by customer"
							}
            </p>
          </div>
          
          ${
						data.billingAddress && data.billingAddress !== data.shippingAddress
							? `
          <!-- Billing Details -->
          <h3 style="color: #000; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0;">Billing Details</h3>
          <div style="margin-bottom: 16px;">
            <p style="color: #000; font-size: 14px; line-height: 1.4; margin: 0;">
              ${data.billingAddress.firstName} ${data.billingAddress.lastName}<br/>
              ${data.billingAddress.streetAddress}<br/>
              ${data.billingAddress.city}, ${data.billingAddress.state} ${data.billingAddress.zipCode}<br/>
              ${data.billingAddress.country}<br/>
              Phone: ${data.billingAddress.phone}
            </p>
          </div>
          `
							: ""
					}
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 16px 0;" />
          
          <!-- Order Items -->
          <div style="text-align: center; margin: 24px 0;">
            <table style="width: 100%; margin-bottom: 16px;">
              ${orderItemsHtml}
            </table>
            
            <!-- Totals -->
            <div style="text-align: right; padding: 0 12px;">
              <p style="margin: 8px 0; color: #6b7280;">Subtotal: ${data.subtotal}</p>
              ${Number(data.totalDiscount || 0) > 0 ? `<p style="margin: 8px 0; color: #dc2626;">Discount: -${data.totalDiscount}</p>` : ""}
              <p style="margin: 16px 0 24px 0; font-weight: 600; font-size: 18px;">Total: ${data.orderTotal}</p>
            </div>
            
            <!-- View Order Button -->
            <div style="text-align: center;">
              <a href="https://www.rublevsky.studio/admin/orders/${data.orderId}" 
                 style="display: inline-block; width: 100%; max-width: 200px; background-color: #000; color: #fff; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 500; text-align: center;">
                View Order Details
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
            or copy and paste this URL into your browser: 
            <a href="https://www.rublevsky.studio/admin/orders/${data.orderId}" style="color: #60a5fa; text-decoration: none;">
              https://www.rublevsky.studio/admin/orders/${data.orderId}
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 26px 0;" />
          
          <p style="color: #6b7280; font-size: 12px; line-height: 1.8; margin: 0;">
            This is an automated admin notification from <strong>Rublevsky Studio</strong>. 
            If you received this email by mistake, please contact the system administrator.
          </p>
        </div>
      </body>
    </html>
  `;
}

export const sendOrderEmails = createServerFn({ method: "POST" })
	.inputValidator((data: EmailData) => {
		// Validate required fields
		if (!data.orderId) {
			throw new Error("Order ID is required");
		}
		if (!data.customerInfo?.shippingAddress?.email) {
			throw new Error("Customer email is required");
		}
		if (!data.cartItems || data.cartItems.length === 0) {
			throw new Error("Cart items are required");
		}
		return data;
	})
	.handler(async ({ data }) => {
		try {
			// Get the API key from environment variables
			const resendApiKey = env.RESEND_API_KEY;

			if (!resendApiKey) {
				console.error("RESEND_API_KEY not found or empty");
				throw new Error(
					"Email service configuration error - API key not found",
				);
			}

			const resend = new Resend(resendApiKey);

			// Format order date
			const orderDate = new Date().toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			// Prepare email data for templates
			const emailTemplateData = {
				Name: data.customerInfo.shippingAddress?.firstName,
				LastName: data.customerInfo.shippingAddress?.lastName,
				email: data.customerInfo.shippingAddress?.email,
				orderId: data.orderId.toString(),
				orderDate: orderDate,
				subtotal: `CA$${Math.round(data.orderAmounts.subtotalAmount)}`,
				totalDiscount:
					data.orderAmounts.discountAmount > 0
						? `CA$${Math.round(data.orderAmounts.discountAmount)}`
						: undefined,
				orderTotal: `CA$${Math.round(data.totalAmount)}`,
				orderStatus: "Pending",
				shippingMethod: data.customerInfo.shippingMethod || "Standard",
				shippingAddress: data.customerInfo.shippingAddress,
				billingAddress: data.customerInfo.billingAddress,
				orderItems: data.cartItems.map((item) => {
					const unitPrice = item.squareMetersPerPack
						? item.price * item.squareMetersPerPack
						: item.price;
					return {
						name: item.productName,
						quantity: item.quantity,
						price: item.discount
							? `CA$${Math.round(unitPrice * (1 - item.discount / 100) * item.quantity)}`
							: `CA$${Math.round(unitPrice * item.quantity)}`,
						originalPrice: `CA$${Math.round(unitPrice * item.quantity)}`,
						discount: item.discount ?? undefined,
						image:
							item.image && typeof item.image === "string"
								? `https://assets.rublevsky.studio/${item.image}`
								: undefined,
					};
				}),
			};

			// Generate and send client confirmation email
			// Only send client email if we have a valid email address
			let clientEmailResponse = null;
			if (data.customerInfo.shippingAddress?.email) {
				const clientEmailHtml = generateClientEmailHtml(emailTemplateData);
				clientEmailResponse = await resend.emails.send({
					from: "store@rublevsky.studio",
					to: data.customerInfo.shippingAddress.email,
					subject: `Order Confirmation #${data.orderId} - Rublevsky Studio`,
					html: clientEmailHtml,
				});
			}

			// Generate and send admin notification email
			const adminEmailHtml = generateAdminEmailHtml(emailTemplateData);
			const adminEmailResponse = await resend.emails.send({
				from: "store@rublevsky.studio",
				to: "alexander@rublevsky.studio",
				subject: `New Order #${data.orderId} Received - Rublevsky Studio`,
				html: adminEmailHtml,
			});

			// Check results and prepare response
			const emailWarnings: string[] = [];

			if (clientEmailResponse?.error) {
				console.error("Client email error:", clientEmailResponse.error);
				emailWarnings.push("Failed to send customer confirmation email");
			} else if (!data.customerInfo.shippingAddress?.email) {
				emailWarnings.push(
					"Customer email not provided - confirmation email not sent",
				);
			}

			if (adminEmailResponse.error) {
				console.error("Admin email error:", adminEmailResponse.error);
				emailWarnings.push("Failed to send admin notification email");
			}

			return {
				success: true,
				emailWarnings: emailWarnings.length > 0 ? emailWarnings : undefined,
				clientEmailId: clientEmailResponse?.data?.id,
				adminEmailId: adminEmailResponse.data?.id,
			};
		} catch (error) {
			console.error("Email sending failed:", error);

			return {
				success: false,
				emailWarnings: ["Failed to send confirmation emails"],
				error: error instanceof Error ? error.message : "Unknown email error",
			};
		}
	});
