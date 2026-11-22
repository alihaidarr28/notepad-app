/** @format */

import { describe, test, expect } from "@jest/globals";
import { add } from "./math.js";

describe("add function", () => {
	test("adds two positive numbers", () => {
		const result = add(5, 3);

		expect(result).toBe(8);
	});

	test("adds two negative numbers", () => {
		const result = add(-5, -3);

		expect(result).toBe(-8);
	});
});
