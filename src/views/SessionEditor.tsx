import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import Loader from "../components/Loader";
import DrillPicker from "../components/session/DrillPicker";
import SessionHeaderForm from "../components/session/SessionHeaderForm";
import SessionSheet from "../components/session/SessionSheet";
import Timeline from "../components/session/Timeline";
import { isTextField } from "../components/ui/ContextMenu";
import { Menu } from "../components/ui/Menu";
import { useSessionExport } from "../export/useSessionExport";
import { exportSessionDocument } from "../storage/files";
import { Session, sessionTitle } from "../model/session";
import { drillsOf } from "../model/sessionFile";
import { useLibrary } from "../state/LibraryContext";
import { SessionProvider, useSessionEditor } from "../state/SessionContext";
import { SaveStatus, useAutosave } from "../state/useAutosave";

const STATUS_TEXT: Record<SaveStatus, string> = {
	saved: "Saved",
	saving: "Saving…",
	error: "Couldn't save",
};

/** Where each session's plan was scrolled to, while the app is open. */
const scrollPositions = new Map<string, number>();

function SessionLayout() {
	const { state, dispatch, selectedBlock, setSelectedBlock } =
		useSessionEditor();
	const library = useLibrary();
	const navigate = useNavigate();
	const exporter = useSessionExport();
	const { status, flush } = useAutosave(state.session, library.saveSession);
	const { session } = state;
	const mainRef = useRef<HTMLElement>(null);
	// Back from a drill opened in this session: scroll to where the coach was.
	const returning = !!(useLocation().state as { back?: boolean } | null)?.back;
	useLayoutEffect(() => {
		const top = scrollPositions.get(session.id);
		const main = mainRef.current;
		if (!returning || top === undefined || !main) return;
		main.scrollTop = top;
		// Drill pictures can still be settling; try again on the next frame.
		const frame = requestAnimationFrame(() => {
			main.scrollTop = top;
		});
		return () => cancelAnimationFrame(frame);
		// Only when the session opens.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session.id]);
	const editing = !!state.gestureBase && state.gestureBase !== session;
	const canUndo = state.past.length > 0 || editing;
	const canRedo = state.future.length > 0 && !editing;

	const run = (type: "undo" | "redo") => {
		(document.activeElement as HTMLElement | null)?.blur?.();
		dispatch({ type });
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const mod = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();
			if (mod && key === "s") {
				e.preventDefault();
				void flush();
				return;
			}
			if (mod && key === "p") {
				e.preventDefault();
				window.print();
				return;
			}
			if (isTextField(e.target) || document.querySelector("dialog[open]"))
				return;
			if (mod && (key === "z" || key === "y")) {
				e.preventDefault();
				dispatch({ type: key === "y" || e.shiftKey ? "redo" : "undo" });
			} else if ((key === "delete" || key === "backspace") && selectedBlock) {
				e.preventDefault();
				dispatch({ type: "removeBlock", id: selectedBlock });
				setSelectedBlock(null);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [flush, dispatch, selectedBlock, setSelectedBlock]);

	return (
		<div className="session-editor">
			<header className="topbar">
				<button type="button" className="back-button" onClick={() => navigate("/")}>
					<Icon name="chevronLeft" size={16} />
					Library
				</button>
				<span className="topbar__divider" aria-hidden="true" />
				<span className="badge">Session</span>
				{/* The title is edited in the form; up here it just says where you are. */}
				<span
					className={`topbar__heading${session.meta.title.trim() ? "" : " muted"}`}
				>
					{sessionTitle(session)}
				</span>
				{status === "error" ? (
					<button
						type="button"
						className="save-status save-status--error"
						onClick={() => void flush()}
					>
						{STATUS_TEXT.error} · Retry
					</button>
				) : (
					<span className={`save-status save-status--${status}`} role="status">
						<span className="save-status__dot" aria-hidden="true" />
						{STATUS_TEXT[status]}
					</span>
				)}
				<span className="topbar__spacer" />
				<button
					type="button"
					className="icon-button"
					aria-label="Undo"
					title="Undo (Ctrl+Z)"
					disabled={!canUndo}
					onClick={() => run("undo")}
				>
					<Icon name="undo" size={18} />
				</button>
				<button
					type="button"
					className="icon-button"
					aria-label="Redo"
					title="Redo (Ctrl+Y)"
					disabled={!canRedo}
					onClick={() => run("redo")}
				>
					<Icon name="redo" size={18} />
				</button>
				<Menu
					label="Export the session"
					buttonClassName="button"
					button={
						<>
							<Icon name="download" size={16} />
							{exporter.busy ? "Exporting…" : "Export"}
						</>
					}
					items={[
						{ label: "PDF document", onSelect: () => exporter.exportAs(session, "pdf") },
						{ label: "Image (PNG)", onSelect: () => exporter.exportAs(session, "png") },
						"separator",
						{
							label: "Session file (.lineup-session)",
							onSelect: () =>
								void exportSessionDocument(
									session,
									drillsOf(session, library.getBoard),
								).catch(console.error),
						},
					]}
				/>
				<button
					type="button"
					className="button"
					title="Print the session sheet (Ctrl+P)"
					onClick={() => window.print()}
				>
					<Icon name="print" size={16} />
					Print
				</button>
			</header>
			{exporter.error && (
				<div className="notice notice--error session-editor__notice" role="alert">
					<span>{exporter.error}</span>
					<button
						type="button"
						className="icon-button icon-button--small"
						aria-label="Dismiss"
						onClick={exporter.clearError}
					>
						<Icon name="close" size={14} />
					</button>
				</div>
			)}
			<div className="session-editor__body">
				<main
					className="session-editor__main"
					ref={mainRef}
					onScroll={(e) => scrollPositions.set(session.id, e.currentTarget.scrollTop)}
				>
					<SessionHeaderForm />
					<Timeline />
				</main>
				<DrillPicker />
			</div>
			<SessionSheet session={session} getBoard={library.getBoard} />
		</div>
	);
}

export default function SessionEditor() {
	const { id } = useParams();
	const library = useLibrary();
	// Read the session once when the editor opens; after that the editor owns it.
	const [loaded, setLoaded] = useState<Session | undefined>(() =>
		id ? library.getSession(id) : undefined,
	);

	useEffect(() => {
		if (!loaded && library.status === "ready" && id)
			setLoaded(library.getSession(id));
	}, [library.status, id, loaded, library]);

	if (library.status === "loading") return <Loader />;
	if (!loaded) {
		return (
			<main className="not-found">
				<h1>Session not found</h1>
				<p>It may have been deleted or moved out of your library.</p>
				<Link to="/">Back to the library</Link>
			</main>
		);
	}

	return (
		<SessionProvider key={loaded.id} session={loaded}>
			<SessionLayout />
		</SessionProvider>
	);
}
