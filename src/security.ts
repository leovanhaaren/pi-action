export interface SecurityContext {
	authorAssociation: string;
	authorLogin: string;
	isBot: boolean;
	allowedBots: string[];
}

const WRITE_ACCESS_ROLES = ["OWNER", "MEMBER", "COLLABORATOR"];

export function validatePermissions(ctx: SecurityContext): boolean {
	if (ctx.isBot) {
		return ctx.allowedBots.includes(ctx.authorLogin);
	}
	return WRITE_ACCESS_ROLES.includes(ctx.authorAssociation);
}

export function sanitizeInput(text: string): string {
	return (
		text
			.replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
			.replace(/\u200B|\u200C|\u200D|\uFEFF|\u00AD/g, "") // Remove invisible characters
			// Remove common prompt injection patterns
			.replace(/---\s*(ignore|end|system|admin|root).*?---/gi, "[FILTERED]")
			.replace(/\b(ignore\s+previous\s+instructions?)\b/gi, "[FILTERED]")
			.replace(/\b(you\s+are\s+now\s+a?\s*(different|new))\b/gi, "[FILTERED]")
			.replace(/\b(system\s*:\s*|admin\s*:\s*|root\s*:\s*)/gi, "[FILTERED]")
			.replace(
				/\b(execute\s+command|run\s+command|delete\s+all)\b/gi,
				"[FILTERED]",
			)
			// Remove potential command injection in markdown
			.replace(/\$\(.*?\)/g, "[COMMAND_FILTERED]")
			.replace(/`[^`]*\|[^`]*`/g, "[PIPE_FILTERED]")
			.trim()
	);
}

/**
 * Escapes template variables based on their context to prevent injection
 */
export function escapeTemplateVariable(
	value: string,
	context: "markdown" | "code" | "plain" = "plain",
): string {
	switch (context) {
		case "markdown":
			// Escape markdown that could affect prompt structure
			return value
				.replace(/^#+\s/gm, "\\$&") // Escape headers
				.replace(/^-{3,}/gm, "\\$&") // Escape horizontal rules
				.replace(/^>{1,}\s/gm, "\\$&") // Escape blockquotes
				.replace(/```/g, "\\`\\`\\`"); // Escape code blocks in markdown too
		case "code":
			// Escape code block delimiters
			return value.replace(/```/g, "\\`\\`\\`");
		default:
			return value;
	}
}

/**
 * Sanitizes agent response to prevent malicious content
 */
export function sanitizeAgentResponse(response: string): string {
	return response
		.replace(/\$\(.*?\)/g, "[COMMAND_FILTERED]") // Command substitution
		.replace(/`[^`]*\|[^`]*`/g, "[PIPE_FILTERED]") // Pipe commands in backticks
		.replace(
			/sudo\s+rm\s+-rf\s*\S*|rm\s+-rf\s*\S*|format|del\s+\/s|mkfs|dd\s+if=\S*/gi,
			"[DANGEROUS_COMMAND_FILTERED]",
		);
}

/**
 * Rate limiting to prevent abuse
 */
export class RateLimiter {
	private attempts: Map<string, number[]> = new Map();
	private readonly maxAttempts: number;
	private readonly windowMs: number;

	constructor(maxAttempts = 5, windowMs = 60000) {
		this.maxAttempts = maxAttempts;
		this.windowMs = windowMs;
	}

	isRateLimited(userId: string): boolean {
		const now = Date.now();
		const userAttempts = this.attempts.get(userId) || [];

		// Remove old attempts outside the window
		const recentAttempts = userAttempts.filter(
			(time) => now - time < this.windowMs,
		);

		if (recentAttempts.length >= this.maxAttempts) {
			return true;
		}

		recentAttempts.push(now);
		this.attempts.set(userId, recentAttempts);
		return false;
	}

	getRemainingAttempts(userId: string): number {
		const now = Date.now();
		const userAttempts = this.attempts.get(userId) || [];
		const recentAttempts = userAttempts.filter(
			(time) => now - time < this.windowMs,
		);
		return Math.max(0, this.maxAttempts - recentAttempts.length);
	}
}

/**
 * Security event logging
 */
export interface SecurityEvent {
	timestamp: string;
	type:
		| "rate_limit"
		| "injection_attempt"
		| "unauthorized_access"
		| "suspicious_content";
	userId: string;
	details: Record<string, unknown>;
	severity: "low" | "medium" | "high" | "critical";
}

export function logSecurityEvent(
	type: SecurityEvent["type"],
	userId: string,
	details: Record<string, unknown>,
	severity: SecurityEvent["severity"] = "medium",
): void {
	const event: SecurityEvent = {
		timestamp: new Date().toISOString(),
		type,
		userId,
		details,
		severity,
	};

	// Log to console for GitHub Actions logs (intentional for security monitoring)
	// biome-ignore lint/suspicious/noConsoleLog: Required for security event logging in CI/CD
	console.log(`SECURITY_EVENT: ${JSON.stringify(event)}`);
}
