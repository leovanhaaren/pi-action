import type {
	GitHubReaction,
	GitHubUser,
	OctokitClient,
	RepoRef,
	TriggerInfo,
} from "./types.js";

export interface GitHubContext {
	repo: RepoRef;
}

export function extractTriggerInfo(
	payload: Record<string, unknown>,
): TriggerInfo | null {
	const comment = payload.comment as Record<string, unknown> | undefined;
	const issue = (payload.issue || payload.pull_request) as
		| Record<string, unknown>
		| undefined;

	if (!issue) {
		return null;
	}

	const isCommentEvent = !!comment;
	const triggerText = isCommentEvent
		? (comment?.body as string)
		: (issue.body as string);
	const author = isCommentEvent
		? (comment?.user as GitHubUser)
		: (issue.user as GitHubUser);
	const authorAssociation = isCommentEvent
		? (comment?.author_association as string)
		: (issue.author_association as string);

	if (!triggerText || !author) {
		return null;
	}

	return {
		isCommentEvent,
		triggerText,
		author,
		authorAssociation,
		issueNumber: issue.number as number,
		issueTitle: issue.title as string,
		issueBody: (issue.body as string) || "",
		commentId: comment?.id as number | undefined,
		isPullRequest: !!payload.pull_request,
	};
}

export interface GitHubClient {
	addReactionToComment(
		commentId: number,
		reaction: GitHubReaction,
	): Promise<void>;
	addReactionToIssue(
		issueNumber: number,
		reaction: GitHubReaction,
	): Promise<void>;
	createComment(issueNumber: number, body: string): Promise<void>;
	getPullRequestDiff(pullNumber: number): Promise<string>;
}

export function createGitHubClient(
	octokit: OctokitClient,
	context: GitHubContext,
): GitHubClient {
	const { owner, name: repo } = context.repo;

	return {
		async addReactionToComment(commentId: number, reaction: GitHubReaction) {
			await octokit.rest.reactions.createForIssueComment({
				owner,
				repo,
				comment_id: commentId,
				content: reaction,
			});
		},

		async addReactionToIssue(issueNumber: number, reaction: GitHubReaction) {
			await octokit.rest.reactions.createForIssue({
				owner,
				repo,
				issue_number: issueNumber,
				content: reaction,
			});
		},

		async createComment(issueNumber: number, body: string) {
			await octokit.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body,
			});
		},

		async getPullRequestDiff(pullNumber: number): Promise<string> {
			const { data: diff } = await octokit.rest.pulls.get({
				owner,
				repo,
				pull_number: pullNumber,
				mediaType: { format: "diff" },
			});
			return diff as unknown as string;
		},
	};
}

export async function addReaction(
	client: GitHubClient,
	triggerInfo: TriggerInfo,
	reaction: GitHubReaction,
): Promise<void> {
	if (triggerInfo.isCommentEvent && triggerInfo.commentId) {
		await client.addReactionToComment(triggerInfo.commentId, reaction);
	} else {
		await client.addReactionToIssue(triggerInfo.issueNumber, reaction);
	}
}
