import { useEffect, useState } from "react";
import { Sport } from "../../model/sports";
import { PitchSettings } from "../../model/types";
import { getPreferences, setPreferences } from "../../state/preferences";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";
import FieldChoices from "./FieldChoices";

/**
 * Pick a sport, then a full or half field, for a new board. Opens on the
 * default sport, so Enter makes a board straight away.
 */
export default function NewBoardDialog({
	open,
	onClose,
	onCreate,
	initialSport,
}: {
	open: boolean;
	/** Start on this sport (e.g. when the library is showing one sport's boards). */
	initialSport?: Sport;
	onClose: () => void;
	onCreate: (pitch: PitchSettings) => void;
}) {
	const [pitch, setPitch] = useState<PitchSettings>(
		() => getPreferences().defaultPitch,
	);
	const [makeDefault, setMakeDefault] = useState(false);

	// Each time it opens, start from the current default.
	useEffect(() => {
		if (!open) return;
		const preferred = getPreferences().defaultPitch;
		setPitch(
			initialSport && initialSport !== preferred.sport
				? { sport: initialSport, variant: "full" }
				: preferred,
		);
		setMakeDefault(false);
	}, [open, initialSport]);

	const isDefault = (p: PitchSettings) => {
		const d = getPreferences().defaultPitch;
		return d.sport === p.sport && d.variant === p.variant;
	};

	const create = (chosen = pitch) => {
		if (makeDefault) setPreferences({ defaultPitch: chosen });
		onCreate(chosen);
		onClose();
	};

	return (
		<Modal
			open={open}
			title="New board"
			onClose={onClose}
			className="dialog--wide"
		>
			<form
				className="new-board"
				onSubmit={(e) => {
					e.preventDefault();
					create();
				}}
			>
				<FieldChoices
					pitch={pitch}
					onPick={setPitch}
					onConfirm={create}
					note={(option) =>
						isDefault(option) && <span className="muted"> · default</span>
					}
				/>

				<div className="dialog__actions new-board__actions">
					{isDefault(pitch) ? (
						// Already the default: say so, rather than showing a box that can't be ticked.
						<span className="check check--static">
							<Icon name="check" size={16} />
							Your default for new boards
						</span>
					) : (
						<label className="check">
							<input
								type="checkbox"
								checked={makeDefault}
								onChange={(e) => setMakeDefault(e.target.checked)}
							/>
							Use this for new boards from now on
						</label>
					)}
					<span className="topbar__spacer" />
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary">
						Create board
					</button>
				</div>
			</form>
		</Modal>
	);
}
