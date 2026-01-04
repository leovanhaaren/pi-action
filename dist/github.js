export function extractTriggerInfo(payload) {
    const comment = payload.comment;
    const issue = (payload.issue || payload.pull_request);
    if (!issue) {
        return null;
    }
    const isCommentEvent = !!comment;
    const triggerText = isCommentEvent
        ? comment?.body
        : issue.body;
    const author = isCommentEvent
        ? comment?.user
        : issue.user;
    const authorAssociation = isCommentEvent
        ? comment?.author_association
        : issue.author_association;
    if (!triggerText || !author) {
        return null;
    }
    return {
        isCommentEvent,
        triggerText,
        author,
        authorAssociation,
        issueNumber: issue.number,
        issueTitle: issue.title,
        issueBody: issue.body || "",
        commentId: comment?.id,
        isPullRequest: !!payload.pull_request,
    };
}
export function createGitHubClient(octokit, context) {
    const { owner, name: repo } = context.repo;
    return {
        async addReactionToComment(commentId, reaction) {
            await octokit.rest.reactions.createForIssueComment({
                owner,
                repo,
                comment_id: commentId,
                content: reaction,
            });
        },
        async addReactionToIssue(issueNumber, reaction) {
            await octokit.rest.reactions.createForIssue({
                owner,
                repo,
                issue_number: issueNumber,
                content: reaction,
            });
        },
        async createComment(issueNumber, body) {
            await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: issueNumber,
                body,
            });
        },
        async getPullRequestDiff(pullNumber) {
            const { data: diff } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: pullNumber,
                mediaType: { format: "diff" },
            });
            return diff;
        },
    };
}
export async function addReaction(client, triggerInfo, reaction) {
    if (triggerInfo.isCommentEvent && triggerInfo.commentId) {
        await client.addReactionToComment(triggerInfo.commentId, reaction);
    }
    else {
        await client.addReactionToIssue(triggerInfo.issueNumber, reaction);
    }
}
