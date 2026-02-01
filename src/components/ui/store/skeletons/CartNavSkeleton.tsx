import { Skeleton } from "~/components/ui/dashboard/skeleton";

export function CartNavSkeleton() {
	return (
		<div className="fixed right-3 bottom-3 z-50">
			<Skeleton className="h-[2.6rem] w-[2.6rem] rounded-full md:h-[3.2rem] md:w-[3.2rem]" />
		</div>
	);
}
