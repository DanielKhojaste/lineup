import { INTERFACE_SCALES } from "../config/sizes";
import { isTauri } from "../storage";

/**
 * Draw the whole interface at a size (1 = 100%). The desktop app zooms its
 * window like a browser does; in a browser, the page is zoomed with CSS.
 */
export async function applyInterfaceScale(scale: number) {
	if (isTauri()) {
		try {
			const { getCurrentWebview } = await import("@tauri-apps/api/webview");
			await getCurrentWebview().setZoom(scale);
			return;
		} catch (error) {
			console.warn("Couldn't zoom the window; using CSS instead", error);
		}
	}
	document.documentElement.style.zoom = scale === 1 ? "" : String(scale);
}

/** The next size up or down from this one (Ctrl+= and Ctrl+-). */
export function nextInterfaceScale(scale: number, step: 1 | -1): number {
	const sizes: readonly number[] = INTERFACE_SCALES;
	const at = sizes.findIndex((s) => s >= scale - 0.001);
	const index = Math.max(0, Math.min(sizes.length - 1, (at === -1 ? sizes.length - 1 : at) + step));
	return sizes[index];
}

export const scaleLabel = (scale: number) => `${Math.round(scale * 100)}%`;
