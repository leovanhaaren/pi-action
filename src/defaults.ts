/**
 * Centralized default values for action inputs.
 * These are the source of truth - action.yml should match these values.
 */

export const DEFAULTS = {
	triggerPhrase: "@pi",
	timeout: 300,
	provider: "anthropic",
	model: "claude-sonnet-4-20250514",
} as const;
