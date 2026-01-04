import { describe, expect, it } from "vitest";
import { sanitizeInput, validatePermissions } from "./security.js";

describe("validatePermissions", () => {
	it("allows OWNER", () => {
		expect(
			validatePermissions({
				authorAssociation: "OWNER",
				authorLogin: "user",
				isBot: false,
				allowedBots: [],
			}),
		).toBe(true);
	});

	it("allows MEMBER", () => {
		expect(
			validatePermissions({
				authorAssociation: "MEMBER",
				authorLogin: "user",
				isBot: false,
				allowedBots: [],
			}),
		).toBe(true);
	});

	it("allows COLLABORATOR", () => {
		expect(
			validatePermissions({
				authorAssociation: "COLLABORATOR",
				authorLogin: "user",
				isBot: false,
				allowedBots: [],
			}),
		).toBe(true);
	});

	it("denies CONTRIBUTOR", () => {
		expect(
			validatePermissions({
				authorAssociation: "CONTRIBUTOR",
				authorLogin: "user",
				isBot: false,
				allowedBots: [],
			}),
		).toBe(false);
	});

	it("denies NONE", () => {
		expect(
			validatePermissions({
				authorAssociation: "NONE",
				authorLogin: "user",
				isBot: false,
				allowedBots: [],
			}),
		).toBe(false);
	});

	it("allows bots in allowlist", () => {
		expect(
			validatePermissions({
				authorAssociation: "NONE",
				authorLogin: "dependabot[bot]",
				isBot: true,
				allowedBots: ["dependabot[bot]", "renovate[bot]"],
			}),
		).toBe(true);
	});

	it("denies bots not in allowlist", () => {
		expect(
			validatePermissions({
				authorAssociation: "NONE",
				authorLogin: "evil-bot",
				isBot: true,
				allowedBots: ["dependabot[bot]"],
			}),
		).toBe(false);
	});
});

describe("sanitizeInput", () => {
	it("removes HTML comments", () => {
		expect(sanitizeInput("before<!-- hidden -->after")).toBe("beforeafter");
	});

	it("removes multiline HTML comments", () => {
		expect(sanitizeInput("before<!-- \nhidden\n -->after")).toBe("beforeafter");
	});

	it("removes invisible characters", () => {
		expect(sanitizeInput("hello\u200Bworld")).toBe("helloworld");
		expect(sanitizeInput("hello\u200Cworld")).toBe("helloworld");
		expect(sanitizeInput("hello\u200Dworld")).toBe("helloworld");
		expect(sanitizeInput("hello\uFEFFworld")).toBe("helloworld");
		expect(sanitizeInput("hello\u00ADworld")).toBe("helloworld");
	});

	it("trims whitespace", () => {
		expect(sanitizeInput("  hello  ")).toBe("hello");
	});

	it("preserves normal content", () => {
		expect(sanitizeInput("@pi please review this code")).toBe(
			"@pi please review this code",
		);
	});
});
