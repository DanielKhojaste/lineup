import { browserStore } from "./browser";
import { LibraryStore } from "./types";

/** True inside the Tauri desktop app (as opposed to a plain browser during development). */
export const isTauri = () =>
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let storePromise: Promise<LibraryStore> | null = null;

export function getStore(): Promise<LibraryStore> {
	if (!storePromise) {
		storePromise = isTauri()
			? import("./tauri").then((m) => m.createTauriStore())
			: Promise.resolve(browserStore);
	}
	return storePromise;
}
