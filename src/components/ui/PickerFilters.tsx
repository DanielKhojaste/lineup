import { Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { Icon } from "../Icon";

/** "All sports" and a chip per sport with how many there are (a sport with none can't be picked). */
export function SportChips({
	value,
	onChange,
	sports,
}: {
	value: Sport | "all";
	onChange: (sport: Sport | "all") => void;
	/** The sport of each thing in the list. */
	sports: Sport[];
}) {
	const countOf = (s: Sport) => sports.filter((x) => x === s).length;
	return (
		<div className="filter-chips" role="group" aria-label="Sport">
			<button
				type="button"
				className={`filter-chip${value === "all" ? " is-active" : ""}`}
				aria-pressed={value === "all"}
				onClick={() => onChange("all")}
			>
				All sports
				<span className="filter-chip__count">{sports.length}</span>
			</button>
			{SPORTS.map((s) => (
				<button
					key={s}
					type="button"
					className={`filter-chip${value === s ? " is-active" : ""}`}
					aria-pressed={value === s}
					disabled={!countOf(s) && value !== s}
					onClick={() => onChange(s)}
				>
					{SPORT_INFO[s].name}
					<span className="filter-chip__count">{countOf(s)}</span>
				</button>
			))}
		</div>
	);
}

/** Which folder a picker shows: all, the ones in no folder, or one folder. */
export type FolderPick = { kind: "all" } | { kind: "none" } | { kind: "folder"; name: string };

/** The folders that have something in them (for the sport picked), with counts, like the library's sidebar. */
export function PickerFolders({
	order,
	itemFolders,
	value,
	onChange,
	colors = {},
}: {
	/** Folders' own colours, by name. */
	colors?: Record<string, string>;
	/** The library's folders, in its order. */
	order: string[];
	/** The folders of each thing the picker can show (already narrowed to the sport). */
	itemFolders: string[][];
	value: FolderPick;
	onChange: (pick: FolderPick) => void;
}) {
	const count = (name: string) => itemFolders.filter((f) => f.includes(name)).length;
	const used = order.filter((name) => count(name) > 0);
	const loose = itemFolders.filter((f) => f.length === 0).length;
	const row = (pick: FolderPick, label: string, n: number, icon: "folder" | "grid" | "inbox") => {
		const active =
			pick.kind === value.kind && (pick.kind !== "folder" || (value.kind === "folder" && value.name === pick.name));
		return (
			<button
				key={pick.kind === "folder" ? `f:${pick.name}` : pick.kind}
				type="button"
				className={`picker-folders__item${active ? " is-active" : ""}`}
				aria-pressed={active}
				onClick={() => onChange(pick)}
			>
				<Icon
					name={icon}
					size={14}
					style={pick.kind === "folder" && colors[pick.name] ? { color: colors[pick.name] } : undefined}
					fillColor={pick.kind === "folder" ? colors[pick.name] : undefined}
				/>
				<span className="picker-folders__name" title={label}>
					{label}
				</span>
				<span className="picker-folders__count">{n}</span>
			</button>
		);
	};
	return (
		<nav className="picker-folders" aria-label="Folders">
			{row({ kind: "all" }, "All", itemFolders.length, "grid")}
			{used.length > 0 && <div className="picker-folders__label">Folders</div>}
			{used.map((name) => row({ kind: "folder", name }, name, count(name), "folder"))}
			{used.length > 0 && loose > 0 && row({ kind: "none" }, "Not in a folder", loose, "inbox")}
			{used.length === 0 && <p className="muted small picker-folders__empty">No folders for this sport.</p>}
		</nav>
	);
}

/** Whether something in these folders is shown for the folder picked. A folder that's gone shows everything. */
export function inFolder(folders: string[], pick: FolderPick, available: string[]): boolean {
	if (pick.kind === "all") return true;
	if (pick.kind === "none") return folders.length === 0;
	return available.includes(pick.name) ? folders.includes(pick.name) : true;
}
