// GitHub-specific types
export type GitHubReaction =
	| "+1"
	| "-1"
	| "laugh"
	| "confused"
	| "heart"
	| "hooray"
	| "rocket"
	| "eyes";

export interface GitHubUser {
	login: string;
	type: "User" | "Bot" | "Organization";
}

/**
 * Repository reference with clearer naming (avoids repo.repo)
 */
export interface RepoRef {
	owner: string;
	name: string;
}

/**
 * Model configuration - commonly passed together
 */
export interface ModelConfig {
	provider: string;
	model: string;
	timeout: number;
}

// Updated TriggerInfo interface using proper types
export interface TriggerInfo {
	isCommentEvent: boolean;
	triggerText: string;
	author: GitHubUser;
	authorAssociation: string;
	issueNumber: number;
	issueTitle: string;
	issueBody: string;
	commentId?: number;
	isPullRequest: boolean;
}

// Improved AgentResult using discriminated union
export type AgentResult =
	| { success: true; response: string }
	| { success: false; error: string };

// Minimal Octokit interface to replace 'any' type
export interface OctokitClient {
	rest: {
		reactions: {
			createForIssueComment: (params: {
				owner: string;
				repo: string;
				comment_id: number;
				content: GitHubReaction;
			}) => Promise<unknown>;
			createForIssue: (params: {
				owner: string;
				repo: string;
				issue_number: number;
				content: GitHubReaction;
			}) => Promise<unknown>;
		};
		issues: {
			createComment: (params: {
				owner: string;
				repo: string;
				issue_number: number;
				body: string;
			}) => Promise<unknown>;
		};
		pulls: {
			get: (params: {
				owner: string;
				repo: string;
				pull_number: number;
				mediaType: { format: string };
			}) => Promise<{ data: unknown }>;
		};
	};
}
