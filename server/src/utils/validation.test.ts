/** @format */

import { describe, test, expect } from "@jest/globals";
import { isValidTitle } from "./validation.js";

describe("isValidTitle", () => {
	test("accepts a normal title", () => {
		expect(isValidTitle("My first note")).toBe(true);
	});

	test("rejects an empty title", () => {
		expect(isValidTitle("")).toBe(false);
	});

	test("rejects a title containing only spaces", () => {
		expect(isValidTitle("   ")).toBe(false);
	});
	test("accepts a title with surrounding spaces", () => {
		const result = isValidTitle("   Shopping list   ");

		expect(result).toBe(true);
	});
});
