import { createFileRoute } from "@tanstack/react-router";

const SENTRY_HOST = "o4510799912108032.ingest.us.sentry.io";
const SENTRY_PROJECT_IDS = ["4510800437968896"];

export const Route = createFileRoute("/tunnel")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					// Get the raw envelope data
					const envelope = await request.arrayBuffer();
					const envelopeText = new TextDecoder().decode(envelope);

					// Parse the envelope header (first line)
					const pieces = envelopeText.split("\n");
					if (pieces.length === 0) {
						return new Response("Empty envelope", { status: 400 });
					}

					const header = JSON.parse(pieces[0]);

					// Get DSN from header
					const dsn = header.dsn;
					if (!dsn) {
						return new Response("Missing DSN in envelope", { status: 400 });
					}

					// Extract project ID from DSN
					const dsnUrl = new URL(dsn);
					const projectId = dsnUrl.pathname.replace(/^\//, ""); // Remove leading slash

					// Verify the Sentry host matches
					if (dsnUrl.hostname !== SENTRY_HOST) {
						console.error(`Invalid Sentry host: ${dsnUrl.hostname}`);
						return new Response("Invalid Sentry host", { status: 403 });
					}

					// Verify the project ID is in our allowed list
					if (!SENTRY_PROJECT_IDS.includes(projectId)) {
						console.error(`Invalid project ID: ${projectId}`);
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

					// Return success (empty response is fine)
					return new Response(null, {
						status: sentryResponse.status,
					});
				} catch (error) {
					console.error("Error forwarding to Sentry:", error);
					return new Response(null, { status: 500 });
				}
			},
		},
	},
});
