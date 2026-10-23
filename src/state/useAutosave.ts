import { useCallback, useEffect, useRef, useState } from "react";
import { Board } from "../model/types";

export type SaveStatus = "saved" | "saving" | "error";

/** How long to wait after the last change before writing to disk. */
const DELAY = 600;

/**
 * Save the board shortly after every change, and immediately when the editor
 * closes. Returns the current status and a `flush` for Ctrl+S.
 */
export function useAutosave(
	board: Board,
	save: (board: Board) => Promise<void>,
) {
	const [status, setStatus] = useState<SaveStatus>("saved");
	const latest = useRef(board);
	const pending = useRef(false);
	const timer = useRef<number | undefined>(undefined);
	const firstRender = useRef(true);
	const saveRef = useRef(save);
	saveRef.current = save;

	const flush = useCallback(async () => {
		window.clearTimeout(timer.current);
		if (!pending.current) return;
		pending.current = false;
		setStatus("saving");
		try {
			await saveRef.current(latest.current);
			if (!pending.current) setStatus("saved");
		} catch (error) {
			console.error("Saving failed", error);
			pending.current = true;
			setStatus("error");
		}
	}, []);

	useEffect(() => {
		if (firstRender.current) {
			firstRender.current = false;
			return;
		}
		latest.current = board;
		pending.current = true;
		setStatus("saving");
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(flush, DELAY);
	}, [board, flush]);

	// Leaving the editor (back to the library, or closing the window) saves right away.
	useEffect(() => {
		const onUnload = () => void flush();
		window.addEventListener("beforeunload", onUnload);
		return () => {
			window.removeEventListener("beforeunload", onUnload);
			void flush();
		};
	}, [flush]);

	return { status, flush };
}
