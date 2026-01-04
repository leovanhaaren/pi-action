export interface SecurityContext {
    authorAssociation: string;
    authorLogin: string;
    isBot: boolean;
    allowedBots: string[];
}
export declare function validatePermissions(ctx: SecurityContext): boolean;
export declare function sanitizeInput(text: string): string;
/**
 * Escapes template variables based on their context to prevent injection
 */
export declare function escapeTemplateVariable(value: string, context?: "markdown" | "code" | "plain"): string;
/**
 * Sanitizes agent response to prevent malicious content
 */
export declare function sanitizeAgentResponse(response: string): string;
/**
 * Rate limiting to prevent abuse
 */
export declare class RateLimiter {
    private attempts;
    private readonly maxAttempts;
    private readonly windowMs;
    constructor(maxAttempts?: number, windowMs?: number);
    isRateLimited(userId: string): boolean;
    getRemainingAttempts(userId: string): number;
}
/**
 * Security event logging
 */
export interface SecurityEvent {
    timestamp: string;
    type: "rate_limit" | "injection_attempt" | "unauthorized_access" | "suspicious_content";
    userId: string;
    details: Record<string, unknown>;
    severity: "low" | "medium" | "high" | "critical";
}
export declare function logSecurityEvent(type: SecurityEvent["type"], userId: string, details: Record<string, unknown>, severity?: SecurityEvent["severity"]): void;
