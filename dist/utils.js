/**
 * Safely extracts error message from unknown error value
 */
export function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "string")
        return error;
    if (error && typeof error === "object" && "message" in error) {
        return String(error.message);
    }
    return "Unknown error";
}
/**
 * Wraps a promise with a timeout. Rejects with TimeoutError if the timeout is exceeded.
 */
export class TimeoutError extends Error {
    timeoutMs;
    constructor(message, timeoutMs) {
        super(message);
        this.timeoutMs = timeoutMs;
        this.name = "TimeoutError";
    }
}
export function withTimeout(promise, timeoutMs, message) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new TimeoutError(message ?? `Operation timed out after ${timeoutMs}ms`, timeoutMs));
        }, timeoutMs);
        promise
            .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
        })
            .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
