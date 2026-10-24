import { describe, expect, it } from "vitest";
import { relativeTime } from "./time";

const now = new Date("2026-10-23T15:00:00");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("relativeTime", () => {
	it("describes recent times", () => {
		expect(relativeTime(ago(10_000), now)).toBe("just now");
		expect(relativeTime(ago(5 * 60_000), now)).toBe("5 min ago");
		expect(relativeTime(ago(3 * 3_600_000), now)).toBe("3 h ago");
	});

	it("uses dates for older times", () => {
		expect(
			relativeTime(new Date("2026-10-22T09:00:00").toISOString(), now),
		).toBe("yesterday");
		expect(
			relativeTime(new Date("2026-10-14T09:00:00").toISOString(), now),
		).toBe("Oct 14");
		expect(
			relativeTime(new Date("2025-10-14T09:00:00").toISOString(), now),
		).toBe("Oct 14, 2025");
	});
});
