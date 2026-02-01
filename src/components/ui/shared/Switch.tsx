import * as React from "react";
import { cn } from "~/lib/utils";

const Switch = React.forwardRef<
	HTMLInputElement,
	React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
	return (
		<input
			type="checkbox"
			ref={ref}
			className={cn(
				"ease before:ease relative h-6 w-12 appearance-none rounded-full bg-stone-300",
				"transition duration-300",
				"before:absolute before:top-[calc(1.5em_-_1.6em)] before:left-[calc(1.5em_-_1.6em)]",
				"before:block before:h-[1.7em] before:w-[1.6em] before:cursor-pointer",
				"before:rounded-full before:border before:border-stone-400 before:border-solid",
				"before:bg-white before:transition-all before:duration-300 before:content-['']",
				"checked:bg-primary checked:before:translate-x-full checked:before:border-primary",
				"hover:before:shadow-[0_0_0px_8px_rgba(0,0,0,0.15)]",
				"checked:hover:before:shadow-[0_0_0px_8px_rgba(236,72,72,0.15)]",
				className,
			)}
			{...props}
		/>
	);
});
Switch.displayName = "Switch";
export { Switch };
