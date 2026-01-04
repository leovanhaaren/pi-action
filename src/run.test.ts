import * as fs from "node:fs";
import * as os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "./defaults.js";
import { type ActionDependencies, run, setupAuth } from "./run.js";
import {
	createMockGitHubClient,
	createModelConfig,
	createRepoRef,
} from "./test-helpers.js";

// Mock the agent module
vi.mock("./agent.js", () => ({
	runAgent: vi.fn(),
}));

import { runAgent } from "./agent.js";

// Mock fs and os for setupAuth tests
vi.mock("node:fs", () => ({
	mkdirSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

vi.mock("node:os", () => ({
	homedir: vi.fn(() => "/home/testuser"),
}));

describe("setupAuth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does nothing when piAuthJson is undefined", () => {
		setupAuth(undefined);
		expect(fs.mkdirSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it("does nothing when piAuthJson is empty string", () => {
		setupAuth("");
		expect(fs.mkdirSync).not.toHaveBeenCalled();
		expect(fs.writeFileSync).not.toHaveBeenCalled();
	});

	it("writes auth.json when piAuthJson is provided", () => {
		const authJson = '{"anthropic": {"key": "test"}}';
		setupAuth(authJson);

		expect(fs.mkdirSync).toHaveBeenCalledWith("/home/testuser/.pi/agent", {
			recursive: true,
		});
		expect(fs.writeFileSync).toHaveBeenCalledWith(
			"/home/testuser/.pi/agent/auth.json",
			authJson,
		);
	});
});

describe("run", () => {
	function createMockDeps(
		overrides: Partial<ActionDependencies> = {},
	): ActionDependencies {
		return {
			inputs: {
				triggerPhrase: DEFAULTS.triggerPhrase,
				allowedBots: [],
				modelConfig: createModelConfig(),
				githubToken: "test-token",
				piAuthJson: undefined,
				promptTemplate: undefined,
			},
			context: {
				payload: {},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => createMockGitHubClient()),
			log: {
				info: vi.fn(),
				warning: vi.fn(),
				error: vi.fn(),
				setFailed: vi.fn(),
			},
			cwd: "/test/cwd",
			...overrides,
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("skips when no issue or PR in payload", async () => {
		const deps = createMockDeps();
		await run(deps);
		expect(deps.log.info).toHaveBeenCalledWith(
			"No issue or pull_request in payload, skipping",
		);
	});

	it("skips when trigger phrase not found", async () => {
		const deps = createMockDeps({
			context: {
				payload: {
					issue: {
						number: 1,
						title: "Test",
						body: "No trigger here",
						user: { login: "user", type: "User" },
						author_association: "OWNER",
					},
				},
				repo: { owner: "testowner", repo: "testrepo" },
			},
		});

		await run(deps);
		expect(deps.log.info).toHaveBeenCalledWith(
			'No trigger phrase "@pi" found, skipping',
		);
	});

	it("warns and skips when user lacks permission", async () => {
		const deps = createMockDeps({
			context: {
				payload: {
					issue: {
						number: 1,
						title: "Test",
						body: "@pi do something",
						user: { login: "stranger", type: "User" },
						author_association: "NONE",
					},
				},
				repo: { owner: "testowner", repo: "testrepo" },
			},
		});

		await run(deps);
		expect(deps.log.warning).toHaveBeenCalledWith(
			"User stranger (NONE) does not have permission",
		);
	});

	it("allows bots in allowedBots list", async () => {
		const mockClient = createMockGitHubClient();
		const deps = createMockDeps({
			inputs: {
				triggerPhrase: DEFAULTS.triggerPhrase,
				allowedBots: ["dependabot[bot]"],
				modelConfig: createModelConfig(),
				githubToken: "test-token",
				piAuthJson: undefined,
				promptTemplate: undefined,
			},
			context: {
				payload: {
					comment: {
						id: 123,
						body: "@pi update deps",
						user: { login: "dependabot[bot]", type: "Bot" },
						author_association: "NONE",
					},
					issue: {
						number: 1,
						title: "Dependency Update",
						body: "Update deps",
						user: { login: "dependabot[bot]", type: "Bot" },
						author_association: "NONE",
					},
				},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => mockClient),
		});

		vi.mocked(runAgent).mockResolvedValue({
			success: true,
			response: "Done",
		});

		await run(deps);

		// Should not have logged a warning about permissions
		expect(deps.log.warning).not.toHaveBeenCalled();
		// Should have proceeded to add reaction
		expect(mockClient.addReactionToComment).toHaveBeenCalledWith(123, "eyes");
	});

	it("fails when github_token is missing", async () => {
		const deps = createMockDeps({
			inputs: {
				triggerPhrase: DEFAULTS.triggerPhrase,
				allowedBots: [],
				modelConfig: createModelConfig(),
				githubToken: undefined,
				piAuthJson: undefined,
				promptTemplate: undefined,
			},
			context: {
				payload: {
					issue: {
						number: 1,
						title: "Test",
						body: "@pi do something",
						user: { login: "user", type: "User" },
						author_association: "OWNER",
					},
				},
				repo: createRepoRef(),
			},
		});

		await run(deps);
		expect(deps.log.setFailed).toHaveBeenCalledWith("github_token is required");
	});

	it("runs agent and posts success response", async () => {
		const mockClient = createMockGitHubClient();
		const deps = createMockDeps({
			context: {
				payload: {
					issue: {
						number: 42,
						title: "Test Issue",
						body: "@pi help me",
						user: { login: "user", type: "User" },
						author_association: "OWNER",
					},
				},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => mockClient),
		});

		vi.mocked(runAgent).mockResolvedValue({
			success: true,
			response: "Here is your help!",
		});

		await run(deps);

		expect(mockClient.addReactionToIssue).toHaveBeenCalledWith(42, "eyes");
		expect(runAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "issue",
				title: "Test Issue",
				task: "help me",
			}),
			expect.objectContaining({
				provider: DEFAULTS.provider,
				model: DEFAULTS.model,
				timeout: DEFAULTS.timeout,
				cwd: "/test/cwd",
			}),
		);
		expect(mockClient.addReactionToIssue).toHaveBeenCalledWith(42, "rocket");
		expect(mockClient.createComment).toHaveBeenCalledWith(
			42,
			"### 🤖 pi Response\n\nHere is your help!",
		);
	});

	it("runs agent and posts error response on failure", async () => {
		const mockClient = createMockGitHubClient();
		const deps = createMockDeps({
			context: {
				payload: {
					issue: {
						number: 42,
						title: "Test Issue",
						body: "@pi do something",
						user: { login: "user", type: "User" },
						author_association: "MEMBER",
					},
				},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => mockClient),
		});

		vi.mocked(runAgent).mockResolvedValue({
			success: false,
			error: "Model not found",
		});

		await run(deps);

		expect(deps.log.error).toHaveBeenCalledWith(
			"pi execution failed: Model not found",
		);
		expect(mockClient.addReactionToIssue).toHaveBeenCalledWith(42, "confused");
		expect(mockClient.createComment).toHaveBeenCalledWith(
			42,
			"### ❌ pi Error\n\nFailed to process request: Model not found",
		);
	});

	it("fetches PR diff for pull requests", async () => {
		const mockClient = createMockGitHubClient();
		mockClient.getPullRequestDiff = vi
			.fn()
			.mockResolvedValue("+added\n-removed");
		const deps = createMockDeps({
			context: {
				payload: {
					pull_request: {
						number: 99,
						title: "Add Feature",
						body: "@pi review",
						user: { login: "contributor", type: "User" },
						author_association: "COLLABORATOR",
					},
				},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => mockClient),
		});

		vi.mocked(runAgent).mockResolvedValue({
			success: true,
			response: "LGTM!",
		});

		await run(deps);

		expect(mockClient.getPullRequestDiff).toHaveBeenCalledWith(99);
		expect(runAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pull_request",
				diff: "+added\n-removed",
			}),
			expect.anything(),
		);
	});

	it("handles comment events", async () => {
		const mockClient = createMockGitHubClient();
		const deps = createMockDeps({
			context: {
				payload: {
					comment: {
						id: 123,
						body: "@pi format code",
						user: { login: "reviewer", type: "User" },
						author_association: "MEMBER",
					},
					issue: {
						number: 42,
						title: "Code Review",
						body: "Please review",
						user: { login: "author", type: "User" },
						author_association: "OWNER",
					},
				},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => mockClient),
		});

		vi.mocked(runAgent).mockResolvedValue({
			success: true,
			response: "Code formatted!",
		});

		await run(deps);

		// Should add reaction to comment, not issue
		expect(mockClient.addReactionToComment).toHaveBeenCalledWith(123, "eyes");
		expect(mockClient.addReactionToComment).toHaveBeenCalledWith(123, "rocket");
		expect(mockClient.addReactionToIssue).not.toHaveBeenCalled();
	});

	it("sanitizes input before processing", async () => {
		const mockClient = createMockGitHubClient();
		const deps = createMockDeps({
			context: {
				payload: {
					issue: {
						number: 1,
						title: "Test",
						body: "@pi <!-- hidden --> do something\u200B",
						user: { login: "user", type: "User" },
						author_association: "OWNER",
					},
				},
				repo: createRepoRef(),
			},
			createClient: vi.fn(() => mockClient),
		});

		vi.mocked(runAgent).mockResolvedValue({
			success: true,
			response: "Done",
		});

		await run(deps);

		expect(runAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				task: "do something",
				triggerComment: "@pi  do something", // HTML comment and invisible char removed
			}),
			expect.anything(),
		);
	});
});
