import { Button } from "~/components/ui/shared/Button";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { Image } from "../shared/Image";

function AboutSection() {
	return (
		<section className="gap-4 md:grid md:grid-cols-2">
			<div className="md:flex md:justify-end">
				<Image
					src={`${ASSETS_BASE_URL}/banners/bubisha.webp`}
					alt="О компании"
					className="vt-image h-full max-h-[30rem] rounded-lg"
					style={{ viewTransitionName: "about-image" }}
				/>
			</div>
			<div className="flex max-w-[59ch] flex-col gap-2 pt-4">
				<h2 style={{ viewTransitionName: "about-title" }}>О компании</h2>
				<p>
					У нас большой выбор напольных покрытий, для домов, офисов, спортивных
					площадок и других мест отдыха. Мы предоставляем не только
					высококачественную продукцию, но и необходимые инструменты для укладки
					и ухода. Наши специалисты квалифицированно установят напольное
					покрытие и дадут рекомендации.
				</p>
				<p>
					Компания ГРАФИК была основана в 2009 году, и с момента своего
					основания основным видом деятельности является продажа качественных
					напольных покрытий и комплектующих к ним.
				</p>
				<Button variant="secondary" className="self-start" to="/about">
					Подробнее
				</Button>
			</div>
		</section>
	);
}

export default AboutSection;
