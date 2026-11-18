import { describe, expect, it } from "vitest";
import { axisTicks } from "../components/session/SessionSheet";
import { exportName } from "./useSessionExport";

describe("export names", () => {
	it("adds what kind of export it is", () => {
		expect(exportName("Cool session", {})).toBe("Cool session");
		expect(exportName("Cool session", { ink: true })).toBe("Cool session (ink saver)");
		expect(exportName("Cool session", { layout: "details" })).toBe("Cool session (details)");
		expect(exportName("Cool session", { layout: "details", ink: true })).toBe("Cool session (details, ink saver)");
	});
});

describe("timeline minutes", () => {
	const t = (...at: number[]) => at.map((a, i) => ({ id: String(i), at: a }));
	it("leaves out minutes too close to the end or to the one before", () => {
		expect(axisTicks(t(0, 14, 26, 41, 53, 70), 71).map((x) => x.at)).toEqual([14, 26, 41, 53]);
		expect(axisTicks(t(0, 2, 3, 30), 60).map((x) => x.at)).toEqual([30]);
		expect(axisTicks(t(0, 10, 12, 40), 100).map((x) => x.at)).toEqual([10, 40]);
	});
});
