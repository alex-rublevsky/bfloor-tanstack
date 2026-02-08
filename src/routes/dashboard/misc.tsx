import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { EntityCardContent } from "~/components/ui/dashboard/EntityCardContent";
import { getAllStoreLocations } from "~/data/storeLocations";
import { cleanupOrphanedData } from "~/server_functions/dashboard/store/cleanupOrphanedData";

interface OrphanReport {
	table: string;
	description: string;
	count: number;
}

interface CleanupResult {
	mode: "audit" | "clean";
	orphans: OrphanReport[];
	totalOrphaned: number;
	totalCleaned: number;
}

export const Route = createFileRoute("/dashboard/misc")({
	component: RouteComponent,
});

function RouteComponent() {
	// Get store locations from hardcoded data
	const locations = getAllStoreLocations();

	const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runCleanup = useCallback(async (mode: "audit" | "clean") => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await cleanupOrphanedData({ data: { mode } });
			setCleanupResult(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsLoading(false);
		}
	}, []);

	return (
		<div className="space-y-6 px-6 py-6">
			{/* Main grid layout - 3 columns on desktop, 1 column on mobile */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Store Addresses Card - Read Only */}
				<div className="space-y-4">
					<div className="flex flex-col gap-2">
						<h3 className="font-semibold text-lg">Адреса магазинов</h3>
					</div>

					{/* Use EntityCardGrid container styling but with custom cards */}
					<div className="rounded-lg border border-border bg-transparent p-4">
						<div className="grid grid-cols-1 gap-3">
							{locations.map((location) => (
								<div
									key={location.id}
									className="flex w-full flex-col rounded-md border border-border bg-muted/30 p-3"
								>
									<div className="flex items-center space-x-2">
										<EntityCardContent
											name={location.address}
											secondaryInfo={location.description || undefined}
										/>
									</div>
									{location.openingHours && (
										<div className="mt-2 ml-0 whitespace-pre-line break-words text-muted-foreground text-xs">
											{location.openingHours}
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Database Maintenance Card */}
				<div className="space-y-4 lg:col-span-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-semibold text-lg">Обслуживание базы данных</h3>
					</div>

					<div className="rounded-lg border border-border bg-transparent p-4">
						<p className="mb-4 text-muted-foreground text-sm">
							Проверьте и очистите осиротевшие записи в базе данных — строки в
							промежуточных таблицах, которые ссылаются на удалённые сущности.
						</p>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => runCleanup("audit")}
								disabled={isLoading}
								className="rounded-md border border-border bg-muted/50 px-4 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50"
							>
								{isLoading ? "Проверка..." : "Аудит"}
							</button>

							{cleanupResult && cleanupResult.totalOrphaned > 0 && (
								<button
									type="button"
									onClick={() => runCleanup("clean")}
									disabled={isLoading}
									className="rounded-md bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
								>
									{isLoading
										? "Очистка..."
										: `Очистить (${cleanupResult.totalOrphaned} записей)`}
								</button>
							)}
						</div>

						{error && (
							<div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
								{error}
							</div>
						)}

						{cleanupResult && (
							<div className="mt-4 space-y-3">
								{cleanupResult.mode === "clean" && (
									<div className="rounded-md border border-green-300 bg-green-50 p-3 text-green-800 text-sm dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
										Очищено {cleanupResult.totalCleaned} осиротевших записей.
									</div>
								)}

								{cleanupResult.orphans.length === 0 &&
								cleanupResult.mode === "audit" ? (
									<div className="rounded-md border border-green-300 bg-green-50 p-3 text-green-800 text-sm dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
										База данных чистая — осиротевших записей не найдено.
									</div>
								) : cleanupResult.orphans.length > 0 &&
									cleanupResult.mode === "audit" ? (
									<div className="space-y-2">
										<p className="font-medium text-sm">
											Найдено {cleanupResult.totalOrphaned} осиротевших записей:
										</p>
										<div className="overflow-hidden rounded-md border border-border">
											<table className="w-full text-left text-sm">
												<thead className="bg-muted/50">
													<tr>
														<th className="px-3 py-2 font-medium">Таблица</th>
														<th className="px-3 py-2 font-medium">Описание</th>
														<th className="px-3 py-2 text-right font-medium">
															Кол-во
														</th>
													</tr>
												</thead>
												<tbody>
													{cleanupResult.orphans.map((orphan) => (
														<tr
															key={orphan.table}
															className="border-border border-t"
														>
															<td className="px-3 py-2 font-mono text-xs">
																{orphan.table}
															</td>
															<td className="px-3 py-2 text-muted-foreground">
																{orphan.description}
															</td>
															<td className="px-3 py-2 text-right font-medium text-red-600 dark:text-red-400">
																{orphan.count}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								) : null}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
