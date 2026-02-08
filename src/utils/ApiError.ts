/**
 * Custom error class that carries an HTTP status code.
 *
 * Throw this from server functions to return a specific status code
 * instead of a generic 500. Catch it with:
 *
 * ```ts
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     setResponseStatus(error.status);
 *   } else {
 *     setResponseStatus(500);
 *   }
 *   throw error;
 * }
 * ```
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}
