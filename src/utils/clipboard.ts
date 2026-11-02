import { isTauri } from "../storage";

/**
 * The system clipboard, as text. The desktop app goes through Tauri's
 * clipboard plugin (the webview may not allow reading it otherwise); a plain
 * browser uses the Clipboard API.
 */
export async function readClipboardText(): Promise<string> {
	if (isTauri()) {
		const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
		return (await readText()) ?? "";
	}
	return navigator.clipboard.readText();
}

export async function writeClipboardText(text: string): Promise<void> {
	if (isTauri()) {
		const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
		await writeText(text);
		return;
	}
	await navigator.clipboard.writeText(text);
}
