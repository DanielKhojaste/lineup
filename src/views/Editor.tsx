import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Board from "../components/board/Board";
import Loader from "../components/Loader";
import SettingsDialog from "../components/shell/SettingsDialog";
import SidePanel from "../components/shell/SidePanel";
import ToolRail from "../components/shell/ToolRail";
import TopBar from "../components/shell/TopBar";
import { Board as BoardDoc } from "../model/types";
import { EditorProvider, useEditor } from "../state/EditorContext";
import { useLibrary } from "../state/LibraryContext";
import { useAutosave } from "../state/useAutosave";
import { PlaybackProvider } from "../state/PlaybackContext";
import { useShortcuts } from "../state/useShortcuts";

function EditorLayout() {
	const { state } = useEditor();
	const library = useLibrary();
	const navigate = useNavigate();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { status, flush } = useAutosave(state.board, library.saveBoard);
	useShortcuts(!settingsOpen);

	// Ctrl+S saves straight away (it also works while typing in a field).
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				void flush();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [flush]);

	return (
		<div className="editor">
			<TopBar
				saveStatus={status}
				onRetrySave={() => void flush()}
				onBack={() => navigate("/")}
				onOpenSettings={() => setSettingsOpen(true)}
			/>
			<div className="editor__body">
				<ToolRail />
				<Board />
				<SidePanel />
			</div>
			<SettingsDialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	);
}

export default function Editor() {
	const { id } = useParams();
	const library = useLibrary();
	// Read the board once when the editor opens; after that the editor owns it.
	const [board] = useState<BoardDoc | undefined>(() =>
		id ? library.getBoard(id) : undefined,
	);
	const [loaded, setLoaded] = useState(board);

	useEffect(() => {
		if (!loaded && library.status === "ready" && id)
			setLoaded(library.getBoard(id));
	}, [library.status, id, loaded, library]);

	if (library.status === "loading") return <Loader />;
	if (!loaded) {
		return (
			<main className="not-found">
				<h1>Board not found</h1>
				<p>It may have been deleted or moved out of your library.</p>
				<Link to="/">Back to the library</Link>
			</main>
		);
	}

	return (
		<EditorProvider key={loaded.id} board={loaded}>
			<PlaybackProvider>
				<EditorLayout />
			</PlaybackProvider>
		</EditorProvider>
	);
}
