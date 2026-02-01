import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/shared/Button";

export function NotFound({ children }: { children?: ReactNode }) {
	const navigate = useNavigate();
	return (
		<div className="flex flex-1 flex-col">
			<div className="flex flex-1 items-center justify-center">
				<div className="text-center">
					<div className="">
						{children || (
							<div className="flex flex-col items-center gap-2">
								<h1>404</h1> <h4>Страница не найдена...</h4>
							</div>
						)}
					</div>
					<p className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Button
							size="lg"
							onClick={() => window.history.back()}
							className="px-2 py-1"
						>
							Назад
						</Button>
						<Button
							variant="outline"
							size="lg"
							onClick={() => navigate({ to: "/" })}
							className="px-2 py-1"
						>
							Главная страница
						</Button>
					</p>
				</div>
			</div>
		</div>
	);
}
