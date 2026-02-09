import { Link } from "./Link";

export function Footer() {
	return (
		<footer className="flex flex-col items-center justify-center pt-16 pb-38 md:pb-16">
			{/* TODO: set the year to a reactive value */}
			<div className="flex flex-wrap items-center justify-center gap-2">
				<p className="text-center">
					{" "}
					© Все права защищены ООО "BeautyFloor" 2025
				</p>
				{/* TODO: add link www.rublevsky.studio */}
				<p className="text-center">
					Понравился сайт?{" "}
					<Link
						href="https://t.me/alexrublevsky"
						target="_blank"
						rel="noopener noreferrer"
						className="text-accent!"
					>
						Написать разработчику{" "}
					</Link>
				</p>
			</div>
		</footer>
	);
}
