import useEmblaCarousel from "embla-carousel-react";
import { Image } from "~/components/ui/shared/Image";
import { EmblaArrowButtons } from "../../shared/EmblaArrowButtons";
import { EmblaDotButtons } from "../../shared/EmblaDotButtons";
import { ExternalLink, Google, TwoGis, Yandex } from "../../shared/Icon";
import "../../shared/image-gallery.css";
import "./testimonial.css";

type TestimonialSource = "Google" | "Yandex" | "2GIS";

interface Testimonial {
	id: number;
	name: string;
	content: string;
	avatar: string;
	rating: number;
	date: string;
	source: TestimonialSource;
	link: string;
}

const testimonials: Testimonial[] = [
	{
		id: 1,
		name: "Степанова Алёна",
		content:
			"В поисках качественного напольного покрытия обратилась в магазин Beauty Floor — требовался красивый, крепкий, нешумный и теплый пол для квартиры в новостройке. Приходила в салон несколько раз — смотрела, выбирала, советовалась. Выбрала пробковый пол Egger с подходящим соотношением цены и качества. Спасибо сотрудникам салона — дали поцарапать ногтем, походить, попрыгать и вообще всячески повоздействовать на образцы)) Идеальное знание своего продукта, очень вежливое и приветливое отношение к клиентам — это редко и очень приятно) Доставка покрытия со склада в другом городе в течение трех недель, а дальнейшее хранение на складе во Владивостоке бесплатно, не нужно думать над тем, куда все эти коробки сложить, чтобы не испортить пол. В салоне огромное количество различных настенных и напольных покрытий и аксессуаров к ним — порогов, плинтусов, подложек. Я очень благодарна ребятам из Beauty Floor за помощь в подборе паркета, за дружеское отношение и отличный сервис!)",
		avatar: "/testimonial-avatars/stepanova-alena.webp",
		rating: 5,
		date: "2019-08-18",
		source: "Google",
		link: "https://www.google.ru/maps/place/Beauty+Floor/@43.1688399,131.9257411,17z/data=!4m18!1m9!3m8!1s0x5fb39183a2c24f9f:0x50ad4f6d76b05a03!2sBeauty+Floor!8m2!3d43.168836!4d131.928316!9m1!1b1!16s%2Fg%2F11rqx6015!3m7!1s0x5fb39183a2c24f9f:0x50ad4f6d76b05a03!8m2!3d43.168836!4d131.928316!9m1!1b1!16s%2Fg%2F11rqx6015?entry=ttu",
	},
	{
		id: 2,
		name: "Гера К",
		content:
			"Покупали пробковый пол, впервые решили попробовать такое покрытие. В магазине нам рассказали все преимущества такого пола, окончательно убедив нас в правильности выбора — говорят, что со временем мы ощутим преимущества этого пола над обычным ламинатом, особенно полезно для людей в возрасте и детей. Заказ пришёл в срок, как нам и обещали👍 Ещё и оказалось, что укладка пола бесплатно осуществляется представителями магазина! В общем советуем этот магазин однозначно👍",
		avatar: "/testimonial-avatars/gera-k.webp",
		link: "https://yandex.ru/maps/org/beauty_floor/109013944306/reviews/?ll=131.925211%2C43.169177&source=serp_navig&z=18.11",
		rating: 5,
		date: "2019-08-18",
		source: "Yandex",
	},
	{
		id: 3,
		name: "Maria Rayer",
		content:
			"В августе 2020 года покупали здесь ламинат, подложку, плинтусы. Все очень понравилось: от ассортимента и ценовой составляющей до работы сотрудников. Из всех упаковок ламината не было ни одной бракованной планки. Делали самовывоз, так сотрудник (замечательный специалист, очень хорошо, со знанием дела, терпеливо консультировал таких дотошных зануд, как мы с мужем) помог все погрузить в машину. В самом зале есть небольшой, но спасительный детский уголок, где наш непоседа провел достаточно времени, пока мы выбирали покрытие. В итоге, сумма затрат соответствует качеству, пол сделан и радует меня каждый день) всем советую)",
		avatar: "/testimonial-avatars/maria-ryayer.webp",
		link: "https://2gis.ru/vladivostok/firm/70000001043762992/tab/reviews",
		rating: 5,
		date: "2022-05-13",
		source: "2GIS",
	},
	{
		id: 4,
		name: "Павел Авхуцкий",
		content:
			"Уютно, много чего представлено, девушка-консультант вообще молодец, знает о чем говорит.",
		avatar: "/testimonial-avatars/pavel-avhutskiy.webp",
		link: "https://2gis.ru/vladivostok/firm/70000001043762992/tab/reviews",
		rating: 5,
		date: "2023-12-27",
		source: "2GIS",
	},
	{
		id: 5,
		name: "Olga Kuznetsova",
		content:
			"Мне очень понравился магазин, ВСЁ компактно, до этого посетила многие магазины по продаже напольных покрытий, постм везде не чувствуется заинтересованности продавцов в продаже, а тут в магазине на Русской, 78, продавец Елена подошла сразу, я скащала ,что мне нудна спокойная расцветка ламината, она предложила германский ламинат дуб кофейный со скидкой , мне он понравился, покупкой очень довольна и особенно приятно, что доставка была в течение 3 часов.Огромное спасибо Елене, что помогла с выбором, приятный, вежливый продавец, желаю хороших продаж и здоровья",
		avatar: "/testimonial-avatars/olga-kuznetsova.webp",
		link: "https://www.google.ru/maps/place/Beauty+Floor/@43.1688399,131.9257411,17z/data=!4m18!1m9!3m8!1s0x5fb39183a2c24f9f:0x50ad4f6d76b05a03!2sBeauty+Floor!8m2!3d43.168836!4d131.928316!9m1!1b1!16s%2Fg%2F11rqx6015!3m7!1s0x5fb39183a2c24f9f:0x50ad4f6d76b05a03!8m2!3d43.168836!4d131.928316!9m1!1b1!16s%2Fg%2F11rqx6015?entry=ttu",
		rating: 5,
		date: "2021-05-15",
		source: "Google",
	},
];

export default function TestimonialSliderSection() {
	const [emblaRef, emblaApi] = useEmblaCarousel({
		loop: true,
	});

	// Navigation handled by EmblaArrowButtons and EmblaDotButtons components

	const renderSourceIcon = (source: TestimonialSource) => {
		switch (source) {
			case "Yandex":
				return <Yandex size={24} className="flex-shrink-0" />;
			case "2GIS":
				return <TwoGis size={24} className="flex-shrink-0" />;
			default:
				return <Google size={24} className="flex-shrink-0" />;
		}
	};

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("ru-RU", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}).format(date);
	};

	return (
		<section className="embla no-padding">
			{/* Header Row - Title and Arrows */}
			<div className="testimonial-slider__header">
				<div className="testimonial-slider__header-content">
					<h2>Отзывы</h2>
				</div>
				{/* Carousel Controls */}
				<div className="testimonial-slider__controls">
					<EmblaArrowButtons emblaApi={emblaApi} />
				</div>
			</div>

			<div
				className="embla__viewport overflow-x-hidden overflow-y-visible pb-6"
				ref={emblaRef}
			>
				<div className="embla__container">
					{testimonials.map((testimonial) => (
						<div className="embla__slide" key={testimonial.id}>
							<div className="m-3">
								<a
									href={testimonial.link}
									target="_blank"
									rel="noopener noreferrer"
									className="testimonial-card"
								>
									<div className="testimonial-card__external-link">
										<ExternalLink size={20} />
									</div>
									<p className="mb-6 line-clamp-[10]">{testimonial.content}</p>
									<div className="flex items-center">
										<div className="relative mr-4 h-12 w-12 overflow-hidden rounded-full">
											<Image
												src={testimonial.avatar}
												alt={testimonial.name}
												//fill
												className="object-cover"
												loading="eager"
											/>
										</div>
										<div className="flex flex-col">
											<div className="flex items-center gap-3">
												<p className="font-medium">{testimonial.name}</p>
												{testimonial.source &&
													renderSourceIcon(testimonial.source)}
											</div>
											{testimonial.date && (
												<p className="mt-1 text-muted-foreground text-sm">
													{formatDate(testimonial.date)}
												</p>
											)}
										</div>
									</div>
								</a>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Dot indicators positioned below the carousel */}
			<div className="embla__dots-container">
				<EmblaDotButtons
					emblaApi={emblaApi}
					containerClassName="embla__dots"
					itemKey={(index) => testimonials[index].id}
				/>
			</div>
		</section>
	);
}
