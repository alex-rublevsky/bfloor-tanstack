import { createFileRoute } from "@tanstack/react-router";

const SENTRY_HOST = "o4510799912108032.ingest.us.sentry.io";
const SENTRY_PROJECT_IDS = ["4510800074440704"];

export const Route = createFileRoute("/tunnel")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const envelope = await request.text();
					const pieces = envelope.split("\n");
					const header = JSON.parse(pieces[0]);

					// Validate the DSN
					const dsn = header.dsn;
					if (!dsn) {
						return new Response("Missing DSN in envelope header", {
							status: 400,
						});
					}

					// Extract project ID from DSN
					const dsnUrl = new URL(dsn);
					const projectId = dsnUrl.pathname.substring(1);

					// Verify the project ID is in our allowed list
					if (!SENTRY_PROJECT_IDS.includes(projectId)) {
						return new Response("Invalid project ID", { status: 403 });
					}

					// Forward the envelope to Sentry
					const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;

					const sentryResponse = await fetch(sentryUrl, {
						method: "POST",
						headers: {
							"Content-Type": "application/x-sentry-envelope",
						},
						body: envelope,
					});

					// Return the response from Sentry
					return new Response(sentryResponse.body, {
						status: sentryResponse.status,
						headers: {
							"Content-Type": "application/json",
						},
					});
				} catch (error) {
					console.error("Error forwarding to Sentry:", error);
					return new Response("Internal server error", { status: 500 });
				}
			},
		},
	},
});
