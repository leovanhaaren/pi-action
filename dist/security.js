const WRITE_ACCESS_ROLES = ["OWNER", "MEMBER", "COLLABORATOR"];
export function validatePermissions(ctx) {
    if (ctx.isBot) {
        return ctx.allowedBots.includes(ctx.authorLogin);
    }
    return WRITE_ACCESS_ROLES.includes(ctx.authorAssociation);
}
export function sanitizeInput(text) {
    return (text
        .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
        .replace(/\u200B|\u200C|\u200D|\uFEFF|\u00AD/g, "") // Remove invisible characters
        // Remove common prompt injection patterns
        .replace(/---\s*(ignore|end|system|admin|root).*?---/gi, "[FILTERED]")
        .replace(/\b(ignore\s+previous\s+instructions?)\b/gi, "[FILTERED]")
        .replace(/\b(you\s+are\s+now\s+a?\s*(different|new))\b/gi, "[FILTERED]")
        .replace(/\b(system\s*:\s*|admin\s*:\s*|root\s*:\s*)/gi, "[FILTERED]")
        .replace(/\b(execute\s+command|run\s+command|delete\s+all)\b/gi, "[FILTERED]")
        // Remove potential command injection in markdown
        .replace(/\$\(.*?\)/g, "[COMMAND_FILTERED]")
        .replace(/`[^`]*\|[^`]*`/g, "[PIPE_FILTERED]")
        .trim());
}
/**
 * Escapes template variables based on their context to prevent injection
 */
export function escapeTemplateVariable(value, context = "plain") {
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
export function sanitizeAgentResponse(response) {
    return response
        .replace(/\$\(.*?\)/g, "[COMMAND_FILTERED]") // Command substitution
        .replace(/`[^`]*\|[^`]*`/g, "[PIPE_FILTERED]") // Pipe commands in backticks
        .replace(/sudo\s+rm\s+-rf\s*\S*|rm\s+-rf\s*\S*|format|del\s+\/s|mkfs|dd\s+if=\S*/gi, "[DANGEROUS_COMMAND_FILTERED]");
}
/**
 * Rate limiting to prevent abuse
 */
export class RateLimiter {
    attempts = new Map();
    maxAttempts;
    windowMs;
    constructor(maxAttempts = 5, windowMs = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
    }
    isRateLimited(userId) {
        const now = Date.now();
        const userAttempts = this.attempts.get(userId) || [];
        // Remove old attempts outside the window
        const recentAttempts = userAttempts.filter((time) => now - time < this.windowMs);
        if (recentAttempts.length >= this.maxAttempts) {
            return true;
        }
        recentAttempts.push(now);
        this.attempts.set(userId, recentAttempts);
        return false;
    }
    getRemainingAttempts(userId) {
        const now = Date.now();
        const userAttempts = this.attempts.get(userId) || [];
        const recentAttempts = userAttempts.filter((time) => now - time < this.windowMs);
        return Math.max(0, this.maxAttempts - recentAttempts.length);
    }
}
export function logSecurityEvent(type, userId, details, severity = "medium") {
    const event = {
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
