import { useMemo, useState } from "react";
import { Board } from "../../model/types";
import { useLibrary } from "../../state/LibraryContext";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

/** Picking a board from the library (a game's formation), as pictures with a search. */
export default function BoardPicker({
	title = "Choose a formation",
	onPick,
	onClose,
	onSwitch,
}: {
	title?: string;
	onPick: (board: Board) => void;
	onClose: () => void;
	/** In the calendar's Attach window: switch to picking the other kind. */
	onSwitch?: (to: "session" | "board") => void;
}) {
	const library = useLibrary();
	const [query, setQuery] = useState("");
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return library.boards
			.filter((b) => [b.meta.title, ...b.meta.tags, ...b.meta.folders].join(" ").toLowerCase().includes(q))
			.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
	}, [library.boards, query]);
	return (
		<Modal open title={title} onClose={onClose} className="dialog--picker">
			<div className="dialog__section session-picker">
				{onSwitch && (
					<div className="segmented segmented--small attach-tabs" role="radiogroup" aria-label="Attach">
						{(["session", "board"] as const).map((t) => (
							<button
								key={t}
								type="button"
								role="radio"
								aria-checked={t === "board"}
								className={`segmented__item${t === "board" ? " is-active" : ""}`}
								onClick={() => t !== "board" && onSwitch(t)}
							>
								{t === "session" ? "Session" : "Board (e.g. a formation)"}
							</button>
						))}
					</div>
				)}
				<div className="session-picker__bar">
					<label className="search">
						<Icon name="search" size={16} />
						<input
							type="search"
							placeholder="Search boards"
							value={query}
							data-autofocus=""
							onChange={(e) => setQuery(e.target.value)}
						/>
					</label>
				</div>
				{shown.length ? (
					<div className="board-pick-grid">
						{shown.map((b) => (
							<button key={b.id} type="button" className="board-pick" onClick={() => onPick(b)}>
								<BoardPreview board={b} className="board-pick__thumb" />
								<span className="board-pick__title" title={b.meta.title}>
									{b.meta.title || "Untitled board"}
								</span>
							</button>
						))}
					</div>
				) : (
					<p className="muted session-picker__empty">No boards match.</p>
				)}
			</div>
		</Modal>
	);
}
