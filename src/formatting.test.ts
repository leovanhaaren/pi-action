import { describe, expect, it } from "vitest";
import { formatErrorComment, formatSuccessComment } from "./formatting.js";

describe("formatSuccessComment", () => {
	it("formats response with pi emoji header", () => {
		const result = formatSuccessComment("Here is the answer");
		expect(result).toBe("### 🤖 pi Response\n\nHere is the answer");
	});

	it("handles multiline responses", () => {
		const result = formatSuccessComment("Line 1\nLine 2\nLine 3");
		expect(result).toBe("### 🤖 pi Response\n\nLine 1\nLine 2\nLine 3");
	});

	it("handles empty response", () => {
		const result = formatSuccessComment("");
		expect(result).toBe("### 🤖 pi Response\n\n");
	});
});

describe("formatErrorComment", () => {
	it("formats error with error emoji header", () => {
		const result = formatErrorComment("Something went wrong");
		expect(result).toBe(
			"### ❌ pi Error\n\nFailed to process request: Something went wrong",
		);
	});

	it("handles multiline errors", () => {
		const result = formatErrorComment("Error line 1\nError line 2");
		expect(result).toBe(
			"### ❌ pi Error\n\nFailed to process request: Error line 1\nError line 2",
		);
	});

	it("handles empty error", () => {
		const result = formatErrorComment("");
		expect(result).toBe("### ❌ pi Error\n\nFailed to process request: ");
	});
});
