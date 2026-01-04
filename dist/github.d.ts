import type { GitHubReaction, OctokitClient, RepoRef, TriggerInfo } from "./types.js";
export interface GitHubContext {
    repo: RepoRef;
}
export declare function extractTriggerInfo(payload: Record<string, unknown>): TriggerInfo | null;
export interface GitHubClient {
    addReactionToComment(commentId: number, reaction: GitHubReaction): Promise<void>;
    addReactionToIssue(issueNumber: number, reaction: GitHubReaction): Promise<void>;
    createComment(issueNumber: number, body: string): Promise<void>;
    getPullRequestDiff(pullNumber: number): Promise<string>;
}
export declare function createGitHubClient(octokit: OctokitClient, context: GitHubContext): GitHubClient;
export declare function addReaction(client: GitHubClient, triggerInfo: TriggerInfo, reaction: GitHubReaction): Promise<void>;
