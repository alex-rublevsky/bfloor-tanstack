import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatedGroup } from "~/components/motion_primitives/AnimatedGroup";
import { TextEffect } from "~/components/motion_primitives/AnimatedText";
import { Button } from "~/components/ui/shared/Button";
import { ASSETS_BASE_URL } from "~/constants/urls";
import { signIn, signOut, useSession } from "~/utils/auth-client";
import { getAuthStatus } from "~/utils/auth-server-func";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	loader: async () => {
		try {
			const authStatus = await getAuthStatus();
			return { authStatus };
		} catch (error) {
			console.error("Error loading auth status:", error);
			return { authStatus: { isAuthenticated: false, isAdmin: false } };
		}
	},
});

function RouteComponent() {
	const { data: session } = useSession();
	const { authStatus } = Route.useLoaderData();

	if (session) {
		// Check if user is authorized using server-side check
		const isAuthorized = authStatus?.isAdmin ?? false;

		if (isAuthorized) {
			return (
				<section className="relative mt-4 flex items-center justify-center lg:mt-12">
					<AnimatedGroup>
						<div className="max-w-md text-center">
							<TextEffect as="h2" className="mb-4">
								Добро пожаловать обратно!
							</TextEffect>
							<p className="mb-6 text-muted-foreground">
								Вы уже вошли как {session.user.name}
							</p>
							<Button asChild size="lg" className="w-full">
								<Link to="/dashboard">Перейти к панели управления</Link>
							</Button>
						</div>
					</AnimatedGroup>
				</section>
			);
		} else {
			return (
				<section className="relative mt-4 flex items-center justify-center lg:mt-12">
					<AnimatedGroup>
						<div className="max-w-md text-center">
							<TextEffect as="h2" className="mb-4">
								Доступ запрещен
							</TextEffect>
							<p className="mb-6 text-muted-foreground">
								Вы вошли как {session.user.name} ({session.user.email}), но этот
								аккаунт не имеет доступа к панели управления.
							</p>
							<Button
								onClick={() => signOut()}
								variant="outline"
								size="lg"
								className="w-full"
							>
								Выйти
							</Button>
						</div>
					</AnimatedGroup>
				</section>
			);
		}
	}

	return (
		<section className="relative mt-4 flex h-full items-center justify-center pb-0 lg:mt-12">
			<AnimatedGroup>
				<div className="w-full max-w-md">
					<img
						src={`${ASSETS_BASE_URL}/misc/login-zaiika.webp`}
						alt="Rabbit looking at the camera"
						className="rounded-xl"
					/>
					<div className="text-center">
						<TextEffect as="h3" className="mt-3">
							Вы точно друг зайки?
						</TextEffect>
						<p className="mb-8 text-muted-foreground">
							Войдите используя свой аккаунт Google
						</p>
					</div>

					<Button
						onClick={() =>
							signIn.social({ provider: "google", callbackURL: "/dashboard" })
						}
						variant="default"
						size="lg"
						className="flex w-full items-center gap-3"
					>
						<svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Войти с помощью Google
					</Button>
				</div>
			</AnimatedGroup>
		</section>
	);
}
