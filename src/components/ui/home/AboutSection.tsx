import { Button } from "~/components/ui/shared/Button";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { Image } from "../shared/Image";

function AboutSection() {
	return (
		<section className="md:grid md:grid-cols-2 gap-4 ">
			<div className="md:flex md:justify-end">
				<Image
					src={`${ASSETS_BASE_URL}/banners/bubisha.webp`}
					alt="О компании"
					className="rounded-lg max-h-[30rem] h-full"
				/>
			</div>
			<div className="pt-4 gap-2 flex flex-col max-w-[59ch]">
				<h2>Магазин напольных покрытий</h2>
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
