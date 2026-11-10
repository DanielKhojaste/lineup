import { useEffect, useState } from "react";
import { SPORT_INFO } from "../../model/sports";
import { PitchSettings } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { usePlayback } from "../../state/PlaybackContext";
import FieldChoices from "../library/FieldChoices";
import { Modal } from "../ui/Dialog";

/** Name a sport and field, e.g. "Half basketball court". */
export function fieldName(pitch: PitchSettings): string {
	const info = SPORT_INFO[pitch.sport];
	return `${pitch.variant === "full" ? "Full" : "Half"} ${info.name.toLowerCase()} ${info.surface}`;
}

/**
 * Change the board's sport or field with the same pictures as New board. The
 * board's own sport and field are in grey; the pick is in the accent colour.
 * "Start with a blank board" clears it too. There's no confirmation: Ctrl+Z
 * brings everything back.
 */
export default function ChangeFieldDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const { state, dispatch } = useEditor();
	const playback = usePlayback();
	const current = state.board.pitch;
	const [pitch, setPitch] = useState<PitchSettings>(current);
	const [blank, setBlank] = useState(false);
	const hasContent =
		state.board.nodes.length > 0 ||
		state.board.drawings.length > 0 ||
		state.board.steps.length > 0;

	// Each time it opens, start on the board's own sport and field.
	useEffect(() => {
		if (!open) return;
		setPitch(current);
		setBlank(false);
		// Only when it opens: the board doesn't change while the window is up.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const same = pitch.sport === current.sport && pitch.variant === current.variant;
	const canApply = !same || (blank && hasContent);

	const apply = (chosen = pitch) => {
		const unchanged =
			chosen.sport === current.sport && chosen.variant === current.variant;
		if (unchanged && !(blank && hasContent)) return onClose();
		playback.stop();
		dispatch({ type: "updatePitch", patch: chosen, blank });
		onClose();
	};

	return (
		<Modal
			open={open}
			title="Change sport or field"
			onClose={onClose}
			className="dialog--wide"
		>
			<form
				className="new-board"
				onSubmit={(e) => {
					e.preventDefault();
					apply();
				}}
			>
				<FieldChoices
					pitch={pitch}
					onPick={setPitch}
					onConfirm={apply}
					current={current}
					confirmHint="Double-click to change to this"
				/>

				<div className="dialog__actions new-board__actions">
					<div className="change-field__blank">
						<label className="check">
							<input
								type="checkbox"
								checked={blank}
								onChange={(e) => setBlank(e.target.checked)}
							/>
							Start with a blank board
						</label>
						{blank && (
							<span className="change-field__warning" role="note">
								Removes every marker and drawing
								{state.board.steps.length ? " and animation step" : ""}.
								Ctrl+Z brings them back.
							</span>
						)}
					</div>
					<span className="topbar__spacer" />
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="submit"
						className="button button--primary"
						disabled={!canApply}
						title={
							canApply
								? `Change to: ${fieldName(pitch)}`
								: "Pick another sport or field first"
						}
					>
						{same && blank ? "Clear board" : "Change"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
