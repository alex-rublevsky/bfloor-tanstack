import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { popularProductsQueryOptions } from "~/lib/queryOptions";
import type { ProductListItem } from "~/types";
import { Button } from "../shared/Button";
import ProductCard from "../store/ProductCard";
import "./popular-products.css";

/**
 * Number of products visible per row at each breakpoint:
 * - Mobile  (<640px):  2 columns
 * - Tablet  (640px+):  3 columns
 * - Desktop (1024px+): 6 columns
 *
 * We always show 2 rows, so the initial visible count on mobile is 4.
 * "Show more" on mobile reveals the remaining products.
 */
const MOBILE_VISIBLE = 4; // 2 cols × 2 rows

export default function PopularProducts() {
	const { data, isLoading } = useQuery(popularProductsQueryOptions());
	const [expanded, setExpanded] = useState(false);

	const products = useMemo(
		() => (data?.products as ProductListItem[] | undefined) ?? [],
		[data],
	);

	const handleExpand = useCallback(() => setExpanded(true), []);

	// Don't render if no products
	if (!isLoading && products.length === 0) {
		return null;
	}

	const hasMoreOnMobile = products.length > MOBILE_VISIBLE;

	return (
		<section className="popular-products-section">
			<div className="popular-products__header">
				<h2>Популярные товары</h2>
			</div>

			{isLoading ? (
				<div className="popular-products__loading">
					<p className="text-muted-foreground">Загрузка товаров...</p>
				</div>
			) : (
				<>
					<div
						className={`popular-products__grid ${!expanded ? "popular-products__grid--collapsed" : ""}`}
					>
						{products.map((product: ProductListItem) => (
							<div className="popular-products__item" key={product.id}>
								<ProductCard product={product} />
							</div>
						))}
					</div>

					{/* Show more button — only on mobile when collapsed */}
					{hasMoreOnMobile && !expanded && (
						<div className="popular-products__show-more">
							<Button type="button" variant="secondary" onClick={handleExpand}>
								Показать ещё
							</Button>
						</div>
					)}
				</>
			)}
		</section>
	);
}
