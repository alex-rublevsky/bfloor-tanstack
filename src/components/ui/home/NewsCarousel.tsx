import { useSuspenseQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";

import { Image } from "~/components/ui/shared/Image";
import { Link } from "~/components/ui/shared/Link";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { publishedNewsQueryOptions } from "~/lib/queryOptions";
import "../home/testimonial/testimonial.css";
import { EmblaArrowButtons } from "../shared/EmblaArrowButtons";
import "../shared/image-gallery.css";
import { ProgressDots } from "../shared/ProgressDots";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const AUTOPLAY_DELAY = 5000; // ms per slide

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatDate = (date: Date | null): string => {
	if (!date) return "";
	return new Intl.DateTimeFormat("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(date));
};

const getPlainTextPreview = (
	markdown: string | null,
	maxLength = 150,
): string => {
	if (!markdown) return "";
	const plain = markdown
		.replace(/#{1,6}\s/g, "")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\*(.+?)\*/g, "$1")
		.replace(/\[(.+?)\]\(.+?\)/g, "$1")
		.replace(/!\[.*?\]\(.+?\)/g, "")
		.replace(/`(.+?)`/g, "$1")
		.replace(/\n/g, " ")
		.trim();
	return plain.length > maxLength ? `${plain.slice(0, maxLength)}...` : plain;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewsCarousel() {
	const { data: newsArticles } = useSuspenseQuery(publishedNewsQueryOptions());

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{ loop: true, align: "start" },
		[Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: false })],
	);

	// Don't render if no news
	if (!newsArticles || newsArticles.length === 0) return null;

	const showControls = newsArticles.length > 1;

	return (
		<section className="embla news-carousel no-padding">
			{/* Header — title + arrows */}
			<div className="testimonial-slider__header">
				<div className="testimonial-slider__header-content">
					<h2>Новости</h2>
				</div>
				{showControls && (
					<div className="testimonial-slider__controls">
						<EmblaArrowButtons emblaApi={emblaApi} />
					</div>
				)}
			</div>

			{/* Slides */}
			<div
				className="embla__viewport overflow-x-hidden overflow-y-visible pb-6"
				ref={emblaRef}
			>
				<div className="embla__container">
					{newsArticles.map((article) => (
						<div className="embla__slide" key={article.id}>
							<div className="m-3">
								<Link
									href={`/news/${article.slug}`}
									className="testimonial-card overflow-hidden p-0!"
								>
									{/* Cover image — fully visible, not cropped */}
									{article.image && (
										<div className="bg-muted/30">
											<Image
												src={`${ASSETS_BASE_URL}/${article.image}`}
												alt={article.name}
												className="center h-25 w-full object-contain"
											/>
										</div>
									)}

									<div className="p-5">
										<span className="mb-2 inline-block text-muted-foreground text-xs">
											{formatDate(article.publishedAt)}
										</span>
										<h5 className="mb-2 line-clamp-2 leading-tight!">
											{article.name}
										</h5>
										<p className="line-clamp-3 text-muted-foreground text-sm">
											{getPlainTextPreview(article.body, 150)}
										</p>
										<span className="mt-3 inline-block font-medium text-primary text-sm">
											Читать далее →
										</span>
									</div>
								</Link>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Progress dot indicators */}
			{showControls && (
				<ProgressDots
					emblaApi={emblaApi}
					autoplayDelay={AUTOPLAY_DELAY}
					itemKey={(index) => newsArticles[index]?.id ?? index}
				/>
			)}
		</section>
	);
}
