import { useState } from "react";
import { DRILL_STAGES } from "../../model/board";
import { Icon } from "../Icon";
import { ContextMenuEntry, useContextMenu } from "../ui/ContextMenu";
import { PromptDialog } from "../ui/Dialog";

/**
 * A block's name in the timeline ("Warm-up 1", "Scrimmage 1"), which is also
 * where its part of the session is picked: click it for the usual parts, your
 * own wording, or none.
 */
export default function StageMenu({
	name,
	value,
	emptyLabel,
	onChange,
}: {
	/** What the block is called now; empty shows "Set part". */
	name: string;
	/** The part picked for this block; empty when none is. */
	value: string;
	/** What picking no part means here ("From the drill", "None"). */
	emptyLabel: string;
	onChange: (value: string) => void;
}) {
	const { openMenu } = useContextMenu();
	const [naming, setNaming] = useState(false);
	const custom = value.trim() !== "" && !DRILL_STAGES.includes(value);

	const entries: ContextMenuEntry[] = [
		...DRILL_STAGES.map((stage) => ({
			label: stage,
			checked: value === stage,
			onSelect: () => onChange(stage),
		})),
		"separator",
		{
			label: custom ? `Custom: ${value}` : "Custom…",
			checked: custom,
			onSelect: () => setNaming(true),
		},
		{ label: emptyLabel, checked: value.trim() === "", onSelect: () => onChange("") },
	];

	return (
		<>
			<button
				type="button"
				className={`block__name stage-menu${name ? "" : " stage-menu--unset"}`}
				aria-haspopup="menu"
				title="Part of the session"
				onClick={(e) => {
					const r = e.currentTarget.getBoundingClientRect();
					openMenu({ x: r.left, y: r.bottom + 4 }, entries);
				}}
			>
				<span className="stage-menu__text">{name || "Set part"}</span>
				<Icon name="chevronDown" size={12} />
			</button>
			<PromptDialog
				open={naming}
				title="Your own part of the session"
				label="Name"
				initialValue={custom ? value : ""}
				confirmLabel="Use it"
				validate={(v) => (v.trim() ? null : "Type a name, or pick one of the usual parts.")}
				onSubmit={(v) => onChange(v.trim().slice(0, 60))}
				onClose={() => setNaming(false)}
			/>
		</>
	);
}
