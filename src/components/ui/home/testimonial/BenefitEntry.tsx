import type React from "react";

export default function BenefitEntry({
	title,
	description,
	icon,
	className = "",
}: {
	title: string;
	description: string;
	icon: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`flex w-fit min-w-[140px] flex-col items-center gap-2 pt-3 pb-1 text-center sm:min-w-[160px] md:min-w-[180px] md:gap-4 md:pt-6 md:pb-2 lg:w-full lg:flex-1 ${className}`}
		>
			<div className="flex h-16 w-fit items-center justify-center md:h-20 xl:h-24 [&>svg]:h-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:max-w-full">
				{icon}
			</div>
			<div className="flex w-fit min-w-0 max-w-[16ch] flex-col gap-1 md:max-w-[20ch] md:gap-2 lg:max-w-[28ch] xl:max-w-[30ch]">
				<h6 className="text-sm! leading-tight! sm:text-base! lg:text-lg!">
					{title}
				</h6>
				<p className="text-muted-foreground text-xs leading-tight! md:text-sm">
					{description}
				</p>
			</div>
		</div>
	);
}
