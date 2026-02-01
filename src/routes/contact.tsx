import { createFileRoute } from "@tanstack/react-router";
import { Link } from "~/components/ui/shared/Link";
import { storeLocationsQueryOptions } from "~/lib/queryOptions";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/contact")({
	component: ContactPage,
	// Loader ensures store locations are loaded before component renders
	// Uses ensureQueryData for caching (7 days staleTime, 14 days gcTime)
	// - If cached → returns instantly
	// - If stale → returns cached, refetches in background
	loader: async ({ context: { queryClient } }) => {
		const storeLocations = await queryClient.ensureQueryData(
			storeLocationsQueryOptions(),
		);
		return { storeLocations };
	},
	head: () => ({
		meta: [
			...seo({
				title: "Контакты - BeautyFloor",
				description: "Поможем подобрать напольные покрытия для вашего проекта",
			}),
		],
	}),
});

function ContactPage() {
	const { storeLocations } = Route.useLoaderData();

	return (
		<section>
			<h1 className="mb-8 font-bold text-3xl">Контакты и Адреса</h1>

			<div className="flex flex-wrap gap-6">
				<div className="w-fit rounded-lg border bg-card p-6">
					<div className="space-y-1">
						<Link
							href="tel:+79084466740"
							variant="large"
							className="block text-muted-foreground hover:text-foreground"
						>
							8 908 446 6740
						</Link>
						<Link
							href="tel:+79025559405"
							variant="large"
							className="block text-muted-foreground hover:text-foreground"
						>
							8 902 555 9405
						</Link>
						<Link
							href="tel:+79084486785"
							variant="large"
							className="block text-muted-foreground hover:text-foreground"
						>
							8 908 448 6785
						</Link>

						<Link
							href="mailto:info@beautyfloor.ru"
							variant="large"
							className="text-muted-foreground hover:text-foreground"
						>
							info@beautyfloor.ru
						</Link>
					</div>
				</div>

				{storeLocations.map((location) => (
					<div key={location.id} className="rounded-lg border bg-card p-6">
						<div className="space-y-3">
							<div>
								<Link
									href={`https://yandex.ru/maps/?text=${encodeURIComponent(`Владивосток, ${location.address}`)}`}
									target="_blank"
									rel="noopener noreferrer"
									variant="large"
								>
									Владивосток, {location.address}
								</Link>
								{location.description && (
									<p className="mt-1 text-muted-foreground text-sm">
										{location.description}
									</p>
								)}
							</div>
							<div>
								<h6>Часы работы:</h6>
								<div className="whitespace-pre-line text-muted-foreground">
									{location.openingHours}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
