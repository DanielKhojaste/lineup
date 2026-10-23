import { useState } from "react";
import { boardToPng } from "../../export/png";
import { useEditor } from "../../state/EditorContext";
import { SaveStatus } from "../../state/useAutosave";
import { exportBoardFile, exportPng } from "../../storage/files";
import { Icon } from "../Icon";
import { BoardInput } from "../ui/fields";
import { Menu } from "../ui/Menu";

interface TopBarProps {
	saveStatus: SaveStatus;
	onRetrySave: () => void;
	onBack: () => void;
	onOpenSettings: () => void;
}

const STATUS_TEXT: Record<SaveStatus, string> = {
	saved: "Saved",
	saving: "Saving…",
	error: "Couldn't save",
};

export default function TopBar({
	saveStatus,
	onRetrySave,
	onBack,
	onOpenSettings,
}: TopBarProps) {
	const { state, dispatch } = useEditor();
	const [exportError, setExportError] = useState<string | null>(null);
	// While a field is being edited its changes are not in the history yet, but
	// undo should still be offered: leaving the field records them first.
	const editing = !!state.gestureBase && state.gestureBase !== state.board;
	const canUndo = state.past.length > 0 || editing;
	const canRedo = state.future.length > 0 && !editing;
	const run = (type: "undo" | "redo") => {
		(document.activeElement as HTMLElement | null)?.blur?.();
		dispatch({ type });
	};

	const exportWith = (task: () => Promise<unknown>) => async () => {
		setExportError(null);
		try {
			await task();
		} catch (error) {
			setExportError(`Export failed: ${(error as Error).message || error}`);
		}
	};

	return (
		<header className="topbar">
			<button type="button" className="back-button" onClick={onBack}>
				<Icon name="chevronLeft" size={16} />
				Library
			</button>
			<span className="topbar__divider" aria-hidden="true" />
			<BoardInput
				className="topbar__title"
				label="Board title"
				hideLabel
				maxLength={80}
				value={state.board.meta.title}
				onValue={(title) => dispatch({ type: "updateMeta", patch: { title } })}
			/>
			{saveStatus === "error" ? (
				<button
					type="button"
					className="save-status save-status--error"
					onClick={onRetrySave}
				>
					{STATUS_TEXT.error} · Retry
				</button>
			) : (
				<span
					className={`save-status save-status--${saveStatus}`}
					role="status"
				>
					<span className="save-status__dot" aria-hidden="true" />
					{STATUS_TEXT[saveStatus]}
				</span>
			)}
			{exportError && (
				<span className="save-status save-status--error" role="alert">
					{exportError}
				</span>
			)}
			<span className="topbar__spacer" />
			<button
				type="button"
				className="icon-button"
				aria-label="Undo (Ctrl+Z)"
				title="Undo (Ctrl+Z)"
				disabled={!canUndo}
				onClick={() => run("undo")}
			>
				<Icon name="undo" size={18} />
			</button>
			<button
				type="button"
				className="icon-button"
				aria-label="Redo (Ctrl+Y)"
				title="Redo (Ctrl+Y)"
				disabled={!canRedo}
				onClick={() => run("redo")}
			>
				<Icon name="redo" size={18} />
			</button>
			<Menu
				label="Export"
				button={<Icon name="download" size={18} />}
				items={[
					{
						label: "Export PNG image",
						onSelect: exportWith(async () =>
							exportPng(state.board, await boardToPng(state.board)),
						),
					},
					{
						label: "Export .lineup file",
						onSelect: exportWith(() => exportBoardFile(state.board)),
					},
				]}
			/>
			<button
				type="button"
				className="icon-button"
				aria-label="Settings and themes"
				title="Settings and themes"
				onClick={onOpenSettings}
			>
				<Icon name="settings" size={18} />
			</button>
		</header>
	);
}
