/**
 * AppError — Typed application error with an HTTP status code.
 *
 * Throw this inside controllers instead of returning NextResponse directly.
 * The handleError() utility catches it and maps it to the correct HTTP response.
 *
 * @example
 * throw new AppError("Link not found", 404);
 * throw new AppError("Maximum of 8 links reached", 400);
 */
export class AppError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        // Maintain proper prototype chain in transpiled JS
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
