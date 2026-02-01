import {
	Drawer,
	DrawerContent,
	DrawerTrigger,
} from "~/components/ui/shared/Drawer";
import { useCart } from "~/lib/cartContext";
import { CartDrawerContent } from "./CartDrawerContent";

export function CartNav() {
	const { cartOpen, setCartOpen, itemCount } = useCart();

	return (
		<div className="fixed right-3 bottom-3 z-50">
			<Drawer open={cartOpen} onOpenChange={setCartOpen}>
				<DrawerTrigger asChild>
					<button
						type="button"
						onClick={() => setCartOpen(true)}
						className="relative flex h-[2.6rem] w-[2.6rem] items-center justify-center rounded-full border border-black bg-background transition-all duration-500 hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground md:h-[3.2rem] md:w-[3.2rem]"
					>
						{/* Cart SVG Icon */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 md:h-6 md:w-6"
							fill="none"
							viewBox="0 0 33 30"
							aria-label="Корзина"
							role="img"
						>
							<title>Корзина</title>
							<path
								d="M1.94531 1.80127H7.27113L11.9244 18.602C12.2844 19.9016 13.4671 20.8013 14.8156 20.8013H25.6376C26.9423 20.8013 28.0974 19.958 28.495 18.7154L31.9453 7.9303H19.0041"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<circle cx="13.4453" cy="27.3013" r="2.5" fill="currentColor" />
							<circle cx="26.4453" cy="27.3013" r="2.5" fill="currentColor" />
						</svg>

						{/* Cart Counter Badge */}
						{itemCount > 0 && (
							<span className="-top-1 -right-1 absolute flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm md:h-5 md:w-5">
								{itemCount}
							</span>
						)}
					</button>
				</DrawerTrigger>
				<DrawerContent>
					<CartDrawerContent />
				</DrawerContent>
			</Drawer>
		</div>
	);
}
