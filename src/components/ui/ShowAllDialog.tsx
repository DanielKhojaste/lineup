import { ReactNode, useMemo, useState } from "react";
import { Icon } from "../Icon";
import { Modal } from "./Dialog";

/**
 * "Show all": a window listing everything when there's too much to show in
 * place (a day's calendar items, a long list of teams…), with a search when
 * the list is long. Used wherever a list gets cut short.
 */
export default function ShowAllDialog<T>({
	title,
	items,
	itemKey,
	itemText,
	renderItem,
	onPick,
	onClose,
	searchPlaceholder = "Search",
	empty = "Nothing here.",
}: {
	title: string;
	items: T[];
	itemKey: (item: T) => string;
	/** What the search looks in. */
	itemText: (item: T) => string;
	/** One row (it's inside a button; picking it calls onPick). */
	renderItem: (item: T) => ReactNode;
	onPick: (item: T) => void;
	onClose: () => void;
	searchPlaceholder?: string;
	empty?: string;
}) {
	const [query, setQuery] = useState("");
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return q ? items.filter((i) => itemText(i).toLowerCase().includes(q)) : items;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items, query]);
	return (
		<Modal open title={title} onClose={onClose} className="dialog--show-all">
			<div className="dialog__section show-all">
				{items.length > 8 && (
					<label className="search">
						<Icon name="search" size={16} />
						<input
							type="search"
							placeholder={searchPlaceholder}
							value={query}
							data-autofocus=""
							onChange={(e) => setQuery(e.target.value)}
						/>
					</label>
				)}
				{shown.length ? (
					<ul className="show-all__list">
						{shown.map((item) => (
							<li key={itemKey(item)}>
								<button type="button" className="show-all__item" onClick={() => onPick(item)}>
									{renderItem(item)}
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="muted">{query ? "Nothing matches." : empty}</p>
				)}
			</div>
		</Modal>
	);
}
