import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import LogoLoop from "~/components/LogoLoop";
//import { usePrefetch } from "~/hooks/usePrefetch";
import { Banner } from "~/components/ui/Banner";
import AboutSection from "~/components/ui/home/AboutSection";
import BenefitsSection from "~/components/ui/home/BenefitsSection";
import NewsCarousel from "~/components/ui/home/NewsCarousel";
import PopularProducts from "~/components/ui/home/PopularProducts";
import TestimonialSliderSection from "~/components/ui/home/testimonial/TestimonialSection";
import { Logo } from "~/components/ui/shared/Logo";
import ProductSlider from "~/components/ui/shared/ProductSlider";
import { PRODUCT_TAGS } from "~/constants/units";
import {
	categoriesQueryOptions,
	discountedProductsInfiniteQueryOptions,
	popularProductsQueryOptions,
	productsByTagInfiniteQueryOptions,
	publishedNewsQueryOptions,
	userDataQueryOptions,
} from "~/lib/queryOptions";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/")({
	component: App,
	head: () => ({
		meta: [
			...seo({
				title: "BeautyFloor",
				description: "Напольные покрытия во Владивостоке",
			}),
		],
	}),

	// Loader prefetches categories and counts before component renders
	// This ensures the catalog dropdown shows counts immediately on page load
	// Also prefetches product carousels for instant display
	loader: async ({ context: { queryClient } }) => {
		// Prefetch categories and counts to ensure consistent server/client rendering
		// Prefetch first tag products (default for tabs carousel), discounted and popular products
		await Promise.all([
			queryClient.ensureQueryData(categoriesQueryOptions()),
			queryClient.ensureQueryData(publishedNewsQueryOptions()),
			queryClient.ensureQueryData(popularProductsQueryOptions()),
			queryClient.prefetchInfiniteQuery(
				productsByTagInfiniteQueryOptions(PRODUCT_TAGS[0]),
			),
			queryClient.prefetchInfiniteQuery(
				discountedProductsInfiniteQueryOptions(),
			),
		]);
	},
});

function App() {
	//const { prefetchBlog, prefetchStore } = usePrefetch();

	// Fetch userData using TanStack Query (same pattern as NavBar)
	const { data: userData } = useQuery({
		...userDataQueryOptions(),
	});

	// Check if user is admin - memoized to prevent unnecessary re-renders
	const isAdmin = useMemo(
		() => userData?.isAdmin ?? false,
		[userData?.isAdmin],
	);

	return (
		<>
			{/* Mobile logo — hidden on md+ where the navbar already shows the logo */}
			<div className="flex items-center justify-center py-8 md:hidden">
				<div data-navbar-logo>
					<Logo className="h-8 w-auto" />
				</div>
			</div>
			<Banner />
			{/* News section — only visible to admins */}
			{isAdmin && <NewsCarousel />}
			<PopularProducts />
			{/* <ProductSlider mode="tabs" title="Товары по категориям" /> */}
			<ProductSlider mode="simple" title="Скидки" />
			<LogoLoop fetchBrands={true} />
			<BenefitsSection />
			<TestimonialSliderSection />
			<AboutSection />
		</>
	);
}
