import { truncate } from "../../utils/text";
import { Icon } from "../Icon";
import { ContextMenuEntry, useContextMenu } from "../ui/ContextMenu";

/**
 * The ⋯ button on a library card. It opens the same menu as right-clicking
 * the card, so both always offer the same things.
 */
export default function CardMenuButton({
	title,
	menu,
}: {
	title: string;
	menu: () => ContextMenuEntry[];
}) {
	const { openMenu } = useContextMenu();
	// Long titles are cut short in the tooltip.
	const label = `More actions for ${truncate(title, 40)}`;
	return (
		<div className="board-card__menu">
			<button
				type="button"
				className="icon-button"
				aria-label={label}
				title={label}
				aria-haspopup="menu"
				onClick={(e) => {
					e.stopPropagation();
					const r = e.currentTarget.getBoundingClientRect();
					openMenu({ x: r.left, y: r.bottom + 4 }, menu());
				}}
			>
				<Icon name="more" size={18} />
			</button>
		</div>
	);
}
