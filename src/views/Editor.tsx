import { useState } from "react";
import Board from "../components/board/Board";
import SettingsDialog from "../components/shell/SettingsDialog";
import SidePanel from "../components/shell/SidePanel";
import ToolRail from "../components/shell/ToolRail";
import TopBar from "../components/shell/TopBar";
import { EditorProvider } from "../state/EditorContext";
import { useShortcuts } from "../state/useShortcuts";

function EditorLayout() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	useShortcuts(!settingsOpen);

	return (
		<div className="editor">
			<TopBar onOpenSettings={() => setSettingsOpen(true)} />
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
	return (
		<EditorProvider>
			<EditorLayout />
		</EditorProvider>
	);
}
