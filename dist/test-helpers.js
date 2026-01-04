/**
 * Test helper functions to reduce duplication in test files
 */
import { vi } from "vitest";
import { DEFAULTS } from "./defaults.js";
/**
 * Creates a mock GitHub client with all required methods
 */
export function createMockGitHubClient() {
    return {
        addReactionToComment: vi.fn(),
        addReactionToIssue: vi.fn(),
        createComment: vi.fn(),
        getPullRequestDiff: vi.fn().mockResolvedValue(""),
    };
}
/**
 * Creates a TriggerInfo object with sensible defaults and optional overrides
 */
export function createTriggerInfo(overrides = {}) {
    return {
        isCommentEvent: false,
        triggerText: "@pi test",
        author: { login: "user", type: "User" },
        authorAssociation: "OWNER",
        issueNumber: 1,
        issueTitle: "Test",
        issueBody: "Body",
        commentId: undefined,
        isPullRequest: false,
        ...overrides,
    };
}
/**
 * Creates a PIContext object with sensible defaults and optional overrides
 */
export function createPIContext(overrides = {}) {
    return {
        type: "issue",
        title: "Test Issue",
        body: "Issue body",
        number: 1,
        triggerComment: "@pi do something",
        task: "do something",
        ...overrides,
    };
}
/**
 * Creates an AgentConfig object with sensible defaults and optional overrides
 */
export function createAgentConfig(overrides = {}) {
    return {
        provider: DEFAULTS.provider,
        model: DEFAULTS.model,
        timeout: DEFAULTS.timeout,
        cwd: "/test/dir",
        ...overrides,
    };
}
/**
 * Creates a ModelConfig object with sensible defaults and optional overrides
 */
export function createModelConfig(overrides = {}) {
    return {
        provider: DEFAULTS.provider,
        model: DEFAULTS.model,
        timeout: DEFAULTS.timeout,
        ...overrides,
    };
}
/**
 * Creates a RepoRef object with sensible defaults and optional overrides
 */
export function createRepoRef(overrides = {}) {
    return {
        owner: "testowner",
        name: "testrepo",
        ...overrides,
    };
}
/**
 * Creates a mock session for pi agent testing
 */
export function createMockSession() {
    return {
        subscribe: vi.fn(),
        prompt: vi.fn(),
    };
}
