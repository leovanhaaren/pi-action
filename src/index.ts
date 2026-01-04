import { execSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildPrompt, extractTask, hasTrigger } from "./context.js";
import type { PIContext } from "./context.js";
import { sanitizeInput, validatePermissions } from "./security.js";
import type { SecurityContext } from "./security.js";

function setupAuth(): void {
	const authJson = core.getInput("pi_auth_json");
	if (authJson) {
		const authDir = join(homedir(), ".pi", "agent");
		mkdirSync(authDir, { recursive: true });
		writeFileSync(join(authDir, "auth.json"), authJson);
		core.info("Wrote PI auth.json");
	}
}

async function run(): Promise<void> {
	setupAuth();

	const triggerPhrase = core.getInput("trigger_phrase") || "@pi";
	const allowedBots = (core.getInput("allowed_bots") || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const timeout = Number.parseInt(core.getInput("timeout") || "300", 10);
	const provider = core.getInput("provider") || "anthropic";
	const model = core.getInput("model") || "claude-sonnet-4-20250514";

	const { context } = github;
	const { payload } = context;

	// Determine if this is a comment event or an opened event
	const comment = payload.comment;
	const issue = payload.issue || payload.pull_request;

	if (!issue) {
		core.info("No issue or pull_request in payload, skipping");
		return;
	}

	// Get the trigger text and author info based on event type
	const isCommentEvent = !!comment;
	const triggerText = isCommentEvent ? comment.body : issue.body;
	const author = isCommentEvent ? comment.user : issue.user;
	const authorAssociation = isCommentEvent
		? comment.author_association
		: issue.author_association;

	if (!triggerText) {
		core.info("No trigger text found, skipping");
		return;
	}

	// Check if trigger phrase is present
	if (!hasTrigger(triggerText, triggerPhrase)) {
		core.info(`No trigger phrase "${triggerPhrase}" found, skipping`);
		return;
	}

	// Validate permissions
	const securityContext: SecurityContext = {
		authorAssociation: authorAssociation,
		authorLogin: author.login,
		isBot: author.type === "Bot",
		allowedBots,
	};

	if (!validatePermissions(securityContext)) {
		core.warning(
			`User ${author.login} (${authorAssociation}) does not have permission`,
		);
		return;
	}

	const token = core.getInput("github_token") || process.env.GITHUB_TOKEN;
	if (!token) {
		core.setFailed("github_token is required");
		return;
	}
	const octokit = github.getOctokit(token);

	// Add eyes reaction to acknowledge - different API for comments vs issues
	if (isCommentEvent) {
		await octokit.rest.reactions.createForIssueComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			comment_id: comment.id,
			content: "eyes",
		});
	} else {
		await octokit.rest.reactions.createForIssue({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: issue.number,
			content: "eyes",
		});
	}

	// Build context
	const sanitizedBody = sanitizeInput(triggerText);
	const task = extractTask(sanitizedBody, triggerPhrase);

	const piContext: PIContext = {
		type: payload.pull_request ? "pull_request" : "issue",
		title: issue.title,
		body: issue.body || "",
		number: issue.number,
		triggerComment: sanitizedBody,
		task,
	};

	// Get PR diff if applicable
	if (payload.pull_request) {
		const { data: diff } = await octokit.rest.pulls.get({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: issue.number,
			mediaType: { format: "diff" },
		});
		piContext.diff = diff as unknown as string;
	}

	const prompt = buildPrompt(piContext);
	core.info(`Prompt:\n${prompt}`);

	// Write prompt to temp file
	const promptFile = join(tmpdir(), `pi-prompt-${Date.now()}.md`);
	writeFileSync(promptFile, prompt);

	// Execute PI
	let response: string;
	try {
		const cmd = `pi --provider ${provider} --model ${model} -p @${promptFile}`;
		core.info(`Running: ${cmd}`);
		response = execSync(cmd, {
			encoding: "utf-8",
			timeout: timeout * 1000,
			maxBuffer: 10 * 1024 * 1024,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		core.error(`PI execution failed: ${errorMessage}`);

		// Add confused reaction - different API for comments vs issues
		if (isCommentEvent) {
			await octokit.rest.reactions.createForIssueComment({
				owner: context.repo.owner,
				repo: context.repo.repo,
				comment_id: comment.id,
				content: "confused",
			});
		} else {
			await octokit.rest.reactions.createForIssue({
				owner: context.repo.owner,
				repo: context.repo.repo,
				issue_number: issue.number,
				content: "confused",
			});
		}

		await octokit.rest.issues.createComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: issue.number,
			body: `### ❌ PI Error\n\nFailed to process request: ${errorMessage}`,
		});
		return;
	} finally {
		try {
			unlinkSync(promptFile);
		} catch {
			// Ignore cleanup errors
		}
	}

	// Post response with rocket reaction - different API for comments vs issues
	if (isCommentEvent) {
		await octokit.rest.reactions.createForIssueComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			comment_id: comment.id,
			content: "rocket",
		});
	} else {
		await octokit.rest.reactions.createForIssue({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: issue.number,
			content: "rocket",
		});
	}

	await octokit.rest.issues.createComment({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: issue.number,
		body: `### 🤖 PI Response\n\n${response}`,
	});
}

run().catch((error) => {
	core.setFailed(error instanceof Error ? error.message : "Unknown error");
});
