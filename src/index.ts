import * as core from "@actions/core";
import * as github from "@actions/github";
import { DEFAULTS } from "./defaults.js";
import { createGitHubClient } from "./github.js";
import { run } from "./run.js";
import { getErrorMessage } from "./utils.js";

function getInputOrDefault(name: string, defaultValue: string): string {
	const value = core.getInput(name);
	return value || defaultValue;
}

run({
	inputs: {
		triggerPhrase: getInputOrDefault("trigger_phrase", DEFAULTS.triggerPhrase),
		allowedBots: (core.getInput("allowed_bots") || "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean),
		modelConfig: {
			timeout: Number.parseInt(
				getInputOrDefault("timeout", String(DEFAULTS.timeout)),
				10,
			),
			provider: getInputOrDefault("provider", DEFAULTS.provider),
			model: getInputOrDefault("model", DEFAULTS.model),
		},
		githubToken: core.getInput("github_token") || process.env.GITHUB_TOKEN,
		piAuthJson: core.getInput("pi_auth_json"),
		promptTemplate: core.getInput("prompt_template"),
	},
	context: {
		payload: github.context.payload,
		repo: {
			owner: github.context.repo.owner,
			name: github.context.repo.repo,
		},
	},
	createClient: (token: string) =>
		createGitHubClient(github.getOctokit(token), {
			repo: {
				owner: github.context.repo.owner,
				name: github.context.repo.repo,
			},
		}),
	log: {
		info: core.info,
		warning: core.warning,
		error: core.error,
		setFailed: core.setFailed,
	},
	cwd: process.cwd(),
}).catch((error) => {
	core.setFailed(getErrorMessage(error));
});
