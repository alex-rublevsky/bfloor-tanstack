import { useEffect, useRef, useState } from "react";
import { Image } from "~/components/ui/shared/Image";
import { getProductsForSelector } from "~/server_functions/dashboard/store/getProductsForSelector";

interface Product {
	id: number;
	name: string;
	slug: string;
	images: string | null;
}

interface ProductSelectorProps {
	selectedProductSlug: string;
	onProductSelect: (productSlug: string) => void;
}

// Placeholder component for products without images
const ImagePlaceholder = ({ className }: { className?: string }) => (
	<div className={`flex items-center justify-center bg-muted ${className}`}>
		<svg
			className="h-4 w-4 text-muted-foreground"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<title>Image placeholder</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
	</div>
);

export default function ProductSelector({
	selectedProductSlug,
	onProductSelect,
}: ProductSelectorProps) {
	const [products, setProducts] = useState<Product[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const componentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Find the selected product when products are loaded or selectedProductSlug changes
		if (products.length > 0 && selectedProductSlug) {
			const product = products.find((p) => p.slug === selectedProductSlug);
			setSelectedProduct(product || null);
		} else {
			setSelectedProduct(null);
		}
	}, [products, selectedProductSlug]);

	// Single function to handle opening dropdown and fetching products
	const openDropdown = async () => {
		setShowDropdown(true);
		searchInputRef.current?.focus();

		// Only fetch if we don't have products yet and aren't already loading
		if (products.length === 0 && !isLoading) {
			try {
				setIsLoading(true);
				const data = await getProductsForSelector();
				setProducts(data.products || []);
			} catch (error) {
				console.error("Error fetching products:", error);
				setProducts([]);
			} finally {
				setIsLoading(false);
			}
		}
	};

	// Add click outside handler
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				componentRef.current &&
				!componentRef.current.contains(event.target as Node)
			) {
				setShowDropdown(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleProductSelect = (product: Product) => {
		setSelectedProduct(product);
		onProductSelect(product.slug);
		setShowDropdown(false);
		setSearchTerm("");
	};

	const handleClearSelection = () => {
		setSelectedProduct(null);
		onProductSelect("");
		openDropdown();
	};

	const toggleDropdown = () => {
		if (showDropdown) {
			setShowDropdown(false);
		} else {
			openDropdown();
		}
	};

	const filteredProducts = products.filter((product) =>
		product.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Parse images for the selected product
	const getProductImage = (product: Product): string | null => {
		try {
			if (!product.images) return null;

			// Split comma-separated string into array and add leading slash
			const imageArray = product.images
				.split(",")
				.map((img) => `/${img.trim()}`);

			// Return the first image or null
			return imageArray.length > 0 ? imageArray[0] : null;
		} catch (error) {
			console.error("Error parsing product images:", error);
			return null;
		}
	};

	return (
		<div className="relative" ref={componentRef}>
			{selectedProduct ? (
				<div className="flex items-center space-x-2 rounded border border-input bg-card p-2 transition-colors duration-200 hover:border-primary">
					<div className="relative h-10 w-10 shrink-0">
						{(() => {
							const productImage = getProductImage(selectedProduct);
							return productImage ? (
								<Image
									src={productImage}
									alt={selectedProduct.name}
									className="rounded object-cover"
								/>
							) : (
								<ImagePlaceholder className="h-full w-full rounded" />
							);
						})()}
					</div>
					<div className="grow">
						<p className="font-medium">{selectedProduct.name}</p>
						<p className="text-muted-foreground text-sm">
							{selectedProduct.slug}
						</p>
					</div>
					<button
						type="button"
						onClick={handleClearSelection}
						className="text-destructive hover:text-destructive/80 active:text-destructive/80"
					>
						✕
					</button>
				</div>
			) : (
				<div className="relative">
					<input
						type="text"
						placeholder="Search for a product..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						onFocus={openDropdown}
						className="w-full rounded border border-input bg-muted px-3 py-2 transition-colors duration-200 hover:border-primary focus:border-primary"
						ref={searchInputRef}
					/>
					<button
						type="button"
						onClick={toggleDropdown}
						className="-translate-y-1/2 absolute top-1/2 right-2 transform text-muted-foreground"
					>
						{showDropdown ? "▲" : "▼"}
					</button>
				</div>
			)}

			{showDropdown && (
				<div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border border-input bg-background shadow-lg">
					{isLoading ? (
						<div className="p-2 text-center text-muted-foreground">
							Loading products...
						</div>
					) : filteredProducts.length === 0 ? (
						<div className="p-2 text-center text-muted-foreground">
							No products found
						</div>
					) : (
						filteredProducts.map((product) => (
							<button
								type="button"
								key={product.id}
								onClick={() => handleProductSelect(product)}
								className="flex w-full cursor-pointer items-center p-2 text-left hover:bg-muted active:bg-muted"
							>
								<div className="relative mr-2 h-8 w-8 shrink-0">
									{(() => {
										const productImage = getProductImage(product);
										return productImage ? (
											<Image
												src={productImage}
												alt={product.name}
												className="rounded object-cover"
											/>
										) : (
											<ImagePlaceholder className="h-full w-full rounded" />
										);
									})()}
								</div>
								<div>
									<p className="font-medium">{product.name}</p>
									<p className="text-muted-foreground text-xs">
										{product.slug}
									</p>
								</div>
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}
