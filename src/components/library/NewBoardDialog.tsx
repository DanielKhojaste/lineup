import { useEffect, useMemo, useState } from "react";
import { createBoard } from "../../model/board";
import { FieldVariant, Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { PitchSettings } from "../../model/types";
import { getPreferences, setPreferences } from "../../state/preferences";
import BoardPreview from "../board/BoardPreview";
import { Modal } from "../ui/Dialog";

/** Empty boards used as pictures of each field. */
function useFieldPictures() {
	return useMemo(() => {
		const pictures = new Map<string, ReturnType<typeof createBoard>>();
		for (const sport of SPORTS)
			for (const variant of ["full", "half"] as FieldVariant[])
				pictures.set(
					`${sport}-${variant}`,
					createBoard("", { sport, variant }),
				);
		return pictures;
	}, []);
}

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
	const pictures = useFieldPictures();
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

	const info = SPORT_INFO[pitch.sport];

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
				<div className="new-board__sports" role="radiogroup" aria-label="Sport">
					{SPORTS.map((sport) => {
						const active = pitch.sport === sport;
						return (
							<button
								key={sport}
								type="button"
								role="radio"
								aria-checked={active}
								className={`new-board__sport${active ? " is-active" : ""}`}
								onClick={() => setPitch({ ...pitch, sport })}
								{...(active ? { "data-autofocus": true } : {})}
							>
								<BoardPreview
									board={pictures.get(`${sport}-full`)!}
									className="new-board__thumb"
								/>
								<span>{SPORT_INFO[sport].name}</span>
							</button>
						);
					})}
				</div>

				<div className="new-board__fields">
					<span className="field__label" id="new-board-size">
						{info.name}: full or half {info.surface}?
					</span>
					<div
						className="new-board__variants"
						role="radiogroup"
						aria-labelledby="new-board-size"
					>
						{(["full", "half"] as FieldVariant[]).map((variant) => {
							const option = { sport: pitch.sport as Sport, variant };
							const active = pitch.variant === variant;
							return (
								<button
									key={variant}
									type="button"
									role="radio"
									aria-checked={active}
									className={`new-board__variant${active ? " is-active" : ""}`}
									onClick={() => setPitch(option)}
									onDoubleClick={() => create(option)}
									title="Double-click to make the board"
								>
									<BoardPreview
										board={pictures.get(`${pitch.sport}-${variant}`)!}
										className="new-board__preview"
									/>
									<span>
										{variant === "full"
											? `Full ${info.surface}`
											: `Half ${info.surface}`}
										{isDefault(option) && (
											<span className="muted"> · default</span>
										)}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				<div className="dialog__actions new-board__actions">
					<label className="check">
						<input
							type="checkbox"
							checked={makeDefault}
							disabled={isDefault(pitch)}
							onChange={(e) => setMakeDefault(e.target.checked)}
						/>
						Use this for new boards from now on
					</label>
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
