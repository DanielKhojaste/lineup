import { useState } from "react";
import { DrillNotes } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { allFolders, useLibrary } from "../../state/LibraryContext";
import { Icon } from "../Icon";
import { BoardInput, BoardTextarea, Section } from "../ui/fields";

const DETAIL_FIELDS: {
	key: keyof DrillNotes;
	label: string;
	placeholder: string;
}[] = [
	{ key: "category", label: "Category", placeholder: "Finishing" },
	{ key: "ageGroup", label: "Age group", placeholder: "U16" },
	{ key: "duration", label: "Duration", placeholder: "15 min" },
	{ key: "players", label: "Players", placeholder: "5 v 4 + GK" },
	{ key: "area", label: "Area", placeholder: "30 × 20 m" },
	{ key: "equipment", label: "Equipment", placeholder: "Cones, balls" },
];

function FolderField() {
	const { state, dispatch } = useEditor();
	const library = useLibrary();
	const folder = state.board.meta.folder;
	const folders = allFolders(library.folders, library.boards);
	const options =
		folder && !folders.includes(folder) ? [...folders, folder] : folders;

	return (
		<div className="field">
			<label className="field__label" htmlFor="board-folder">
				Folder
			</label>
			<select
				id="board-folder"
				className="field__input"
				value={folder}
				onChange={(e) =>
					dispatch({ type: "updateMeta", patch: { folder: e.target.value } })
				}
			>
				<option value="">No folder</option>
				{options.map((f) => (
					<option key={f} value={f}>
						{f}
					</option>
				))}
			</select>
		</div>
	);
}

function Tags() {
	const { state, dispatch } = useEditor();
	const tags = state.board.meta.tags;
	const [draft, setDraft] = useState("");

	const add = () => {
		const tag = draft.trim();
		setDraft("");
		if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
		dispatch({ type: "updateMeta", patch: { tags: [...tags, tag] } });
	};

	return (
		<div className="field">
			<label className="field__label" htmlFor="new-tag">
				Tags
			</label>
			<div className="chips">
				{tags.map((tag) => (
					<span key={tag} className="chip">
						{tag}
						<button
							type="button"
							className="chip__remove"
							aria-label={`Remove tag ${tag}`}
							onClick={() =>
								dispatch({
									type: "updateMeta",
									patch: { tags: tags.filter((t) => t !== tag) },
								})
							}
						>
							<Icon name="close" size={12} />
						</button>
					</span>
				))}
				<input
					id="new-tag"
					className="chip-input"
					placeholder="+ Add tag"
					value={draft}
					maxLength={30}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							add();
						}
					}}
					onBlur={add}
				/>
			</div>
		</div>
	);
}

function CoachingPoints() {
	const { state, dispatch } = useEditor();
	const points = state.board.notes.coachingPoints;
	const set = (coachingPoints: string[]) =>
		dispatch({ type: "updateNotes", patch: { coachingPoints } });

	return (
		<Section title="Coaching points">
			{points.length > 0 && (
				<ol className="points">
					{points.map((point, i) => (
						<li key={i} className="points__item">
							<span className="points__index" aria-hidden="true">
								{i + 1}.
							</span>
							<BoardInput
								label={`Coaching point ${i + 1}`}
								hideLabel
								value={point}
								maxLength={160}
								autoFocus={point === "" && i === points.length - 1}
								onValue={(v) => set(points.map((p, j) => (j === i ? v : p)))}
							/>
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label={`Remove coaching point ${i + 1}`}
								onClick={() => set(points.filter((_, j) => j !== i))}
							>
								<Icon name="close" size={14} />
							</button>
						</li>
					))}
				</ol>
			)}
			<button
				type="button"
				className="link-button"
				onClick={() => set([...points, ""])}
			>
				+ Add point
			</button>
		</Section>
	);
}

export default function NotesPanel() {
	const { state, dispatch } = useEditor();
	const notes = state.board.notes;
	const update = (patch: Partial<DrillNotes>) =>
		dispatch({ type: "updateNotes", patch });

	return (
		<div className="panel-body">
			<Section title="Details">
				<FolderField />
				<div className="field-grid">
					{DETAIL_FIELDS.map((f) => (
						<BoardInput
							key={f.key}
							label={f.label}
							placeholder={f.placeholder}
							maxLength={60}
							value={notes[f.key] as string}
							onValue={(v) => update({ [f.key]: v })}
						/>
					))}
				</div>
				<BoardTextarea
					label="Description"
					rows={4}
					placeholder="How the drill runs, rotations, progressions…"
					value={notes.description}
					onValue={(description) => update({ description })}
				/>
				<Tags />
			</Section>
			<CoachingPoints />
		</div>
	);
}
