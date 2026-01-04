export interface SecurityContext {
    authorAssociation: string;
    authorLogin: string;
    isBot: boolean;
    allowedBots: string[];
}
export declare function validatePermissions(ctx: SecurityContext): boolean;
export declare function sanitizeInput(text: string): string;
