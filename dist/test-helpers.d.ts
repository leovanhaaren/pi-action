import type { AgentConfig } from "./agent.js";
import type { PIContext } from "./context.js";
import type { GitHubClient } from "./github.js";
import type { ModelConfig, RepoRef, TriggerInfo } from "./types.js";
/**
 * Creates a mock GitHub client with all required methods
 */
export declare function createMockGitHubClient(): GitHubClient;
/**
 * Creates a TriggerInfo object with sensible defaults and optional overrides
 */
export declare function createTriggerInfo(overrides?: Partial<TriggerInfo>): TriggerInfo;
/**
 * Creates a PIContext object with sensible defaults and optional overrides
 */
export declare function createPIContext(overrides?: Partial<PIContext>): PIContext;
/**
 * Creates an AgentConfig object with sensible defaults and optional overrides
 */
export declare function createAgentConfig(overrides?: Partial<AgentConfig>): AgentConfig;
/**
 * Creates a ModelConfig object with sensible defaults and optional overrides
 */
export declare function createModelConfig(overrides?: Partial<ModelConfig>): ModelConfig;
/**
 * Creates a RepoRef object with sensible defaults and optional overrides
 */
export declare function createRepoRef(overrides?: Partial<RepoRef>): RepoRef;
/**
 * Creates a mock session for pi agent testing
 */
export declare function createMockSession(): {
    subscribe: import("vitest").Mock<(...args: any[]) => any>;
    prompt: import("vitest").Mock<(...args: any[]) => any>;
};
