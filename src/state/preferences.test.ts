import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
	getItem: (k: string) => store.get(k) ?? null,
	setItem: (k: string, v: string) => void store.set(k, v),
	removeItem: (k: string) => void store.delete(k),
};

/** The preferences module, freshly loaded from what's saved. */
async function load(saved?: unknown) {
	store.clear();
	if (saved !== undefined) store.set("lineup.preferences", JSON.stringify(saved));
	vi.resetModules();
	return import("./preferences");
}

describe("spice preferences", () => {
	beforeEach(() => vi.unstubAllEnvs());

	it("starts on, at the normal size, speed and amount", async () => {
		const { getPreferences } = await load();
		expect(getPreferences().themeEffect).toEqual({});
		expect(getPreferences().spice).toEqual({ size: 1, speed: 1, amount: 1 });
	});

	it("keeps the chosen settings for next time", async () => {
		const first = await load();
		first.setPreferences({
			themeEffect: { dune: "off", fremen: "worm-sign" },
			spice: { size: 1.5, speed: 1.1, amount: 2.3 },
		});
		const saved = JSON.parse(store.get("lineup.preferences")!);
		const { getPreferences } = await load(saved);
		expect(getPreferences().themeEffect).toEqual({ dune: "off", fremen: "worm-sign" });
		expect(getPreferences().spice).toEqual({ size: 1.5, speed: 1.1, amount: 2.3 });
	});

	it("keeps the spice off for those who turned it off before themes had a choice", async () => {
		const { getPreferences } = await load({ themeEffects: false });
		expect(getPreferences().themeEffect).toEqual({ dune: "off" });
	});

	it("keeps hand-edited values within the sliders' range", async () => {
		const { getPreferences } = await load({ spice: { size: 99, speed: -1, amount: "lots" } });
		expect(getPreferences().spice).toEqual({ size: 3, speed: 0.1, amount: 1 });
	});

	it("only drifts over the board in development builds", async () => {
		vi.stubEnv("DEV", false);
		const release = await load({ spiceOverBoard: true });
		expect(release.getPreferences().spiceOverBoard).toBe(false);
		vi.stubEnv("DEV", true);
		const dev = await load({ spiceOverBoard: true });
		expect(dev.getPreferences().spiceOverBoard).toBe(true);
	});
});
