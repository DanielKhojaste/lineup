import {
	PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { BOARD_TYPE_LABELS } from "../../model/board";
import {
	blockTimes,
	createBreakBlock,
	createCustomBlock,
	formatMinutes,
	SessionBlock,
	totalMinutes,
} from "../../model/session";
import { useLibrary } from "../../state/LibraryContext";
import { BlockPatch } from "../../state/session";
import { useSessionEditor } from "../../state/SessionContext";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { ContextMenuEntry, useContextMenu } from "../ui/ContextMenu";
import { BoardInput, BoardTextarea } from "../ui/fields";
import { Menu, MenuItem } from "../ui/Menu";

function MinutesField({
	block,
	onMinutes,
}: {
	block: SessionBlock;
	onMinutes: (minutes: number) => void;
}) {
	return (
		<div className="minutes-field">
			<button
				type="button"
				className="icon-button icon-button--small"
				aria-label="One minute less"
				onClick={() => onMinutes(block.minutes - 1)}
				disabled={block.minutes <= 0}
			>
				−
			</button>
			<label className="minutes-field__value">
				<span className="visually-hidden">Minutes</span>
				<input
					type="number"
					min={0}
					max={240}
					value={block.minutes}
					onChange={(e) => onMinutes(Number(e.target.value))}
					onFocus={(e) => e.currentTarget.select()}
				/>
				<span aria-hidden="true">min</span>
			</label>
			<button
				type="button"
				className="icon-button icon-button--small"
				aria-label="One minute more"
				onClick={() => onMinutes(block.minutes + 1)}
			>
				+
			</button>
		</div>
	);
}

/** One block of the timeline: a drill with its board, a break, or a custom block. */
function BlockRow({
	block,
	index,
	time,
	dragging,
	onHandleDown,
	menu,
}: {
	block: SessionBlock;
	index: number;
	time: string;
	dragging: boolean;
	onHandleDown: (e: ReactPointerEvent, id: string) => void;
	menu: (block: SessionBlock, index: number) => ContextMenuEntry[];
}) {
	const { dispatch, selectedBlock, setSelectedBlock, state } =
		useSessionEditor();
	const library = useLibrary();
	const navigate = useNavigate();
	const { openMenu } = useContextMenu();
	const board = block.kind === "drill" ? library.getBoard(block.boardId) : undefined;
	const [notesOpen, setNotesOpen] = useState(block.notes !== "");
	const selected = selectedBlock === block.id;
	const count = state.session.blocks.length;
	const update = (patch: BlockPatch) =>
		dispatch({ type: "updateBlock", id: block.id, patch });

	const entries = menu(block, index);
	const summary = board
		? [
				BOARD_TYPE_LABELS[board.meta.type].one,
				board.notes.players,
				board.notes.area,
				board.notes.equipment,
			]
				.filter(Boolean)
				.join(" · ")
		: "";

	return (
		<li
			className={`block block--${block.kind}${selected ? " is-selected" : ""}${
				dragging ? " is-dragging" : ""
			}`}
			data-block-id={block.id}
			onPointerDown={() => setSelectedBlock(block.id)}
			onFocus={() => setSelectedBlock(block.id)}
			onContextMenu={(e) => {
				if (e.defaultPrevented) return;
				setSelectedBlock(block.id);
				openMenu(e, entries);
			}}
		>
			<button
				type="button"
				className="block__handle"
				aria-label={`Move block ${index + 1}. Drag, or use the up and down arrow keys`}
				title="Drag to reorder (or focus and use ↑ ↓)"
				onPointerDown={(e) => onHandleDown(e, block.id)}
				onKeyDown={(e) => {
					if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
					e.preventDefault();
					const to = index + (e.key === "ArrowUp" ? -1 : 1);
					if (to < 0 || to >= count) return;
					dispatch({ type: "moveBlock", id: block.id, index: to });
					// Keep focus on the handle as the row moves.
					requestAnimationFrame(() =>
						document
							.querySelector<HTMLButtonElement>(
								`[data-block-id="${block.id}"] .block__handle`,
							)
							?.focus(),
					);
				}}
			>
				<Icon name="grip" size={16} />
			</button>
			<div className="block__time mono">{time}</div>

			<div className="block__body">
				{block.kind === "drill" ? (
					board ? (
						<div className="block__drill">
							<button
								type="button"
								className="block__preview"
								title="Open the board"
								onClick={() =>
									navigate(`/board/${board.id}`, {
										state: { from: `/session/${state.session.id}` },
									})
								}
							>
								<BoardPreview board={board} />
							</button>
							<div className="block__drill-text">
								<button
									type="button"
									className="block__title link-button"
									onClick={() =>
										navigate(`/board/${board.id}`, {
											state: { from: `/session/${state.session.id}` },
										})
									}
								>
									{board.meta.title}
								</button>
								{summary && <p className="muted small">{summary}</p>}
								{board.notes.description && (
									<p className="block__description">{board.notes.description}</p>
								)}
								{board.notes.coachingPoints.filter(Boolean).length > 0 && (
									<ul className="block__points">
										{board.notes.coachingPoints.filter(Boolean).map((p, i) => (
											<li key={i}>{p}</li>
										))}
									</ul>
								)}
							</div>
						</div>
					) : (
						<p className="block__missing">
							This board isn't in your library any more. Remove the block, or
							import the board again.
						</p>
					)
				) : (
					<div className="block__label-row">
						{block.kind === "break" && (
							<span className="block__icon" aria-hidden="true">
								<Icon name="water" size={18} />
							</span>
						)}
						<BoardInput
							label={block.kind === "break" ? "Break" : "Block"}
							hideLabel
							className="block__label"
							placeholder={
								block.kind === "break" ? "Water break" : "Team talk, warm-up, match…"
							}
							maxLength={120}
							value={block.label}
							onValue={(label) => update({ label })}
						/>
					</div>
				)}
				{notesOpen ? (
					<BoardTextarea
						label="Notes for this block"
						rows={2}
						placeholder="Organisation, progressions, who goes where…"
						value={block.notes}
						onValue={(notes) => update({ notes })}
					/>
				) : (
					<button
						type="button"
						className="link-button block__add-notes"
						onClick={() => setNotesOpen(true)}
					>
						+ Add notes
					</button>
				)}
			</div>

			<div className="block__side">
				<MinutesField block={block} onMinutes={(minutes) => update({ minutes })} />
				<Menu
					label={`Actions for block ${index + 1}`}
					button={<Icon name="more" size={18} />}
					items={entries.flatMap((e): (MenuItem | "separator")[] =>
						e === "separator"
							? ["separator" as const]
							: e.submenu
							  ? []
							  : [
										{
											label: e.label,
											onSelect: e.onSelect ?? (() => {}),
											danger: e.danger,
											disabled: e.disabled,
										},
							    ],
					)}
				/>
			</div>
		</li>
	);
}

/** The session's blocks in order, with times, reordering and totals. */
export default function Timeline() {
	const { state, dispatch, setSelectedBlock, selectedBlock } = useSessionEditor();
	const navigate = useNavigate();
	const { session } = state;
	const times = blockTimes(session);
	const total = totalMinutes(session);
	const planned = session.header.plannedMinutes;
	const listRef = useRef<HTMLOListElement>(null);
	const [drag, setDrag] = useState<{ id: string; to: number } | null>(null);

	const insertAt = () => {
		const after = session.blocks.findIndex((b) => b.id === selectedBlock);
		return after === -1 ? undefined : after + 1;
	};
	const addBlock = (block: SessionBlock) => {
		dispatch({ type: "addBlocks", blocks: [block], index: insertAt() });
		setSelectedBlock(block.id);
		// Put the cursor in the new block's label.
		requestAnimationFrame(() =>
			document
				.querySelector<HTMLInputElement>(`[data-block-id="${block.id}"] input`)
				?.focus(),
		);
	};

	/** Where a dragged block would go: the index among the other blocks. */
	const dropIndex = (clientY: number, id: string) => {
		const rows = [
			...(listRef.current?.querySelectorAll<HTMLElement>("[data-block-id]") ?? []),
		].filter((r) => r.dataset.blockId !== id);
		let index = rows.length;
		for (let i = 0; i < rows.length; i++) {
			const r = rows[i].getBoundingClientRect();
			if (clientY < r.top + r.height / 2) {
				index = i;
				break;
			}
		}
		return index;
	};

	const onHandleDown = (e: ReactPointerEvent, id: string) => {
		if (e.button !== 0) return;
		e.preventDefault();
		// Finish any text edit first, so the move is its own undo step.
		(document.activeElement as HTMLElement | null)?.blur?.();
		// Listen on the window: the dragged row moves in the page while
		// dragging, which would lose pointer capture on the handle.
		const from = session.blocks.findIndex((b) => b.id === id);
		setDrag({ id, to: from });
		const move = (ev: PointerEvent) => setDrag({ id, to: dropIndex(ev.clientY, id) });
		const up = (ev: PointerEvent) => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			setDrag(null);
			if (ev.type === "pointerup")
				dispatch({ type: "moveBlock", id, index: dropIndex(ev.clientY, id) });
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
	};

	const menu = (block: SessionBlock, index: number): ContextMenuEntry[] => [
		...(block.kind === "drill"
			? [
					{
						label: "Open board",
						onSelect: () =>
							navigate(`/board/${block.boardId}`, {
								state: { from: `/session/${session.id}` },
							}),
					},
					"separator" as const,
				]
			: []),
		{
			label: "Move up",
			disabled: index === 0,
			onSelect: () => dispatch({ type: "moveBlock", id: block.id, index: index - 1 }),
		},
		{
			label: "Move down",
			disabled: index === session.blocks.length - 1,
			onSelect: () => dispatch({ type: "moveBlock", id: block.id, index: index + 1 }),
		},
		{
			label: "Duplicate",
			onSelect: () => dispatch({ type: "duplicateBlock", id: block.id }),
		},
		"separator",
		{
			label: "Add a water break after",
			onSelect: () =>
				dispatch({ type: "addBlocks", blocks: [createBreakBlock()], index: index + 1 }),
		},
		"separator",
		{
			label: "Remove from session",
			danger: true,
			onSelect: () => dispatch({ type: "removeBlock", id: block.id }),
		},
	];

	// Rows in their order while dragging: the dragged one shown at its drop spot.
	const order = session.blocks.map((b, i) => ({ block: b, index: i }));
	if (drag) {
		const from = order.findIndex((o) => o.block.id === drag.id);
		const [moved] = order.splice(from, 1);
		order.splice(drag.to, 0, moved);
	}

	return (
		<section className="timeline" aria-label="Session plan">
			<div className="timeline__head">
				<h2>Plan</h2>
				<span className="muted">
					{session.blocks.length} {session.blocks.length === 1 ? "block" : "blocks"}
				</span>
			</div>

			{session.blocks.length === 0 ? (
				<div className="timeline__empty">
					<p>Add drills from your library on the right, then breaks and other blocks.</p>
				</div>
			) : (
				<ol className="timeline__list" ref={listRef}>
					{order.map(({ block, index }) => {
						const t = times[index];
						return (
							<BlockRow
								key={block.id}
								block={block}
								index={index}
								time={`${t.from}–${t.to}′`}
								dragging={drag?.id === block.id}
								onHandleDown={onHandleDown}
								menu={menu}
							/>
						);
					})}
				</ol>
			)}

			<div className="timeline__add">
				<button
					type="button"
					className="button button--small"
					onClick={() => addBlock(createBreakBlock())}
				>
					<Icon name="water" size={14} />
					Water break
				</button>
				<button
					type="button"
					className="button button--small"
					onClick={() => addBlock(createCustomBlock())}
				>
					<Icon name="plus" size={14} />
					Other block
				</button>
				<span className="muted small">Drills: pick them from the library on the right.</span>
			</div>

			<div
				className={`timeline__total${
					planned && total > planned ? " is-over" : ""
				}`}
			>
				<div>
					<strong>{formatMinutes(total)}</strong>
					{planned ? (
						<span className="muted">
							{" "}
							of {formatMinutes(planned)} planned
							{total < planned
								? ` · ${formatMinutes(planned - total)} left`
								: total > planned
								  ? ` · ${formatMinutes(total - planned)} over`
								  : " · spot on"}
						</span>
					) : null}
				</div>
				{planned ? (
					<div className="timeline__meter" aria-hidden="true">
						<span style={{ width: `${Math.min(100, (total / planned) * 100)}%` }} />
					</div>
				) : null}
			</div>
		</section>
	);
}
