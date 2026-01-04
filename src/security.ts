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
	return text
		.replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
		.replace(/\u200B|\u200C|\u200D|\uFEFF|\u00AD/g, "") // Remove invisible characters
		.trim();
}
