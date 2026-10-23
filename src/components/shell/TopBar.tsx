import { useEditor } from "../../state/EditorContext";
import { Icon } from "../Icon";
import { BoardInput } from "../ui/fields";

export default function TopBar({
	onOpenSettings,
}: {
	onOpenSettings: () => void;
}) {
	const { state, dispatch } = useEditor();
	// While a field is being edited its changes are not in the history yet, but
	// undo should still be offered: leaving the field records them first.
	const editing = !!state.gestureBase && state.gestureBase !== state.board;
	const canUndo = state.past.length > 0 || editing;
	const canRedo = state.future.length > 0 && !editing;
	const run = (type: "undo" | "redo") => {
		(document.activeElement as HTMLElement | null)?.blur?.();
		dispatch({ type });
	};

	return (
		<header className="topbar">
			<div className="brand">
				<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
					<rect
						x="1"
						y="1"
						width="22"
						height="22"
						rx="6"
						fill="var(--accent)"
					/>
					<path
						d="M12 5v14M5 12a7 7 0 0 0 14 0"
						stroke="var(--on-accent)"
						strokeWidth="2"
						fill="none"
					/>
				</svg>
				<span>Lineup</span>
			</div>
			<span className="topbar__divider" aria-hidden="true" />
			<BoardInput
				className="topbar__title"
				label="Board title"
				hideLabel
				maxLength={80}
				value={state.board.meta.title}
				onValue={(title) => dispatch({ type: "updateMeta", patch: { title } })}
			/>
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
