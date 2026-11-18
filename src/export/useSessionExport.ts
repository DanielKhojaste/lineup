import { useState } from "react";
import { Session, sessionTitle } from "../model/session";
import { useLibrary } from "../state/LibraryContext";
import { exportSessionFile } from "../storage/files";
import { SheetOptions, sessionToPdf, sessionToPng } from "./session";

/** The suggested file name: "Cool session", "Cool session (ink saver)", "Cool session (details, ink saver)". */
export function exportName(title: string, { layout, ink }: SheetOptions): string {
	const extras = [layout === "details" ? "details" : "", ink ? "ink saver" : ""].filter(Boolean);
	return extras.length ? `${title} (${extras.join(", ")})` : title;
}

/** Export a session sheet as a PDF or an image, with a busy flag and any error to show. */
export function useSessionExport() {
	const library = useLibrary();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/** `ink`: the ink saver (white pitches) for printing at home; `layout`: the summary or the details. */
	const exportAs = async (session: Session, kind: "pdf" | "png", options: SheetOptions = {}) => {
		setBusy(true);
		setError(null);
		try {
			const bytes =
				kind === "pdf"
					? await sessionToPdf(session, library.getBoard, options)
					: await sessionToPng(session, library.getBoard, options);
			const title = sessionTitle(session);
			await exportSessionFile(exportName(title, options), kind, bytes);
		} catch (e) {
			setError(`Export failed: ${(e as Error).message || e}`);
		} finally {
			setBusy(false);
		}
	};

	/** The export choices for a menu: the summary and the details, each as a PDF (plain or ink saver) or an image. */
	const menuItems = (session: Session) =>
		(["summary", "details"] as const).flatMap((layout) => [
			{ heading: layout === "summary" ? "Session summary" : "Session details" },
			{ label: "PDF document", onSelect: () => exportAs(session, "pdf", { layout }) },
			{ label: "PDF document, ink saver", onSelect: () => exportAs(session, "pdf", { layout, ink: true }) },
			{ label: "Image (PNG)", onSelect: () => exportAs(session, "png", { layout }) },
		]);

	return { exportAs, menuItems, busy, error, clearError: () => setError(null) };
}
