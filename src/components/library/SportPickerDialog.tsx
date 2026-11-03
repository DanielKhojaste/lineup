import { useEffect, useMemo, useState } from "react";
import { createBoard } from "../../model/board";
import { Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { getPreferences, setPreferences } from "../../state/preferences";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

/**
 * Pick the sport a session is for: the same pictures as the New board window,
 * without full or half. Enter or double-click picks.
 */
export default function SportPickerDialog({
	open,
	title,
	confirmLabel,
	initial,
	onClose,
	onPick,
}: {
	open: boolean;
	title: string;
	confirmLabel: string;
	/** The sport picked when it opens. */
	initial: Sport;
	onClose: () => void;
	onPick: (sport: Sport) => void;
}) {
	const pictures = useMemo(
		() => new Map(SPORTS.map((s) => [s, createBoard("", { sport: s, variant: "full" })])),
		[],
	);
	const [sport, setSport] = useState<Sport>(initial);
	const [makeDefault, setMakeDefault] = useState(false);

	useEffect(() => {
		if (!open) return;
		setSport(initial);
		setMakeDefault(false);
	}, [open, initial]);

	const prefs = getPreferences();
	const isDefault = prefs.hasDefaultSport && sport === prefs.defaultPitch.sport;

	const pick = (chosen = sport) => {
		if (makeDefault)
			setPreferences({ defaultPitch: { ...prefs.defaultPitch, sport: chosen } });
		onPick(chosen);
		onClose();
	};

	return (
		<Modal open={open} title={title} onClose={onClose} className="dialog--wide">
			<form
				className="new-board sport-picker-form"
				onSubmit={(e) => {
					e.preventDefault();
					pick();
				}}
			>
				<div className="new-board__sports sport-picker" role="radiogroup" aria-label="Sport">
					{SPORTS.map((s) => {
						const active = sport === s;
						return (
							<button
								key={s}
								type="button"
								role="radio"
								aria-checked={active}
								className={`new-board__sport${active ? " is-active" : ""}`}
								onClick={() => setSport(s)}
								onDoubleClick={() => pick(s)}
								{...(active ? { "data-autofocus": true } : {})}
							>
								<BoardPreview board={pictures.get(s)!} className="new-board__thumb" />
								<span>{SPORT_INFO[s].name}</span>
							</button>
						);
					})}
				</div>

				<div className="dialog__actions new-board__actions">
					{isDefault ? (
						<span className="check check--static">
							<Icon name="check" size={16} />
							Your default sport
						</span>
					) : (
						<label className="check">
							<input
								type="checkbox"
								checked={makeDefault}
								onChange={(e) => setMakeDefault(e.target.checked)}
							/>
							Use this sport for new boards and sessions from now on
						</label>
					)}
					<span className="topbar__spacer" />
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary">
						{confirmLabel}
					</button>
				</div>
			</form>
		</Modal>
	);
}
