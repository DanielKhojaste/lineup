import { useState } from "react";
import { Session, sessionTitle } from "../model/session";
import { useLibrary } from "../state/LibraryContext";
import { exportSessionFile } from "../storage/files";
import { sessionToPdf, sessionToPng } from "./session";

/** Export a session sheet as a PDF or an image, with a busy flag and any error to show. */
export function useSessionExport() {
	const library = useLibrary();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const exportAs = async (session: Session, kind: "pdf" | "png") => {
		setBusy(true);
		setError(null);
		try {
			const bytes =
				kind === "pdf"
					? await sessionToPdf(session, library.getBoard)
					: await sessionToPng(session, library.getBoard);
			await exportSessionFile(sessionTitle(session), kind, bytes);
		} catch (e) {
			setError(`Export failed: ${(e as Error).message || e}`);
		} finally {
			setBusy(false);
		}
	};

	return { exportAs, busy, error, clearError: () => setError(null) };
}
