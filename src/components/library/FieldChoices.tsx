import { ReactNode, useMemo } from "react";
import { createBoard } from "../../model/board";
import { FieldVariant, Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { PitchSettings } from "../../model/types";
import BoardPreview from "../board/BoardPreview";

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
 * The sports down the side and a full or half field beside them, as pictures.
 * Used by New board and by "Change sport or field". `current` is the board's
 * sport and field now: shown in grey, while the pick is in the accent colour.
 */
export default function FieldChoices({
	pitch,
	onPick,
	onConfirm,
	current,
	note,
	confirmHint = "Double-click to make the board",
}: {
	pitch: PitchSettings;
	onPick: (pitch: PitchSettings) => void;
	/** Double-clicking a field picks it and confirms straight away. */
	onConfirm: (pitch: PitchSettings) => void;
	current?: PitchSettings;
	/** Extra words after a field's name, e.g. " · default". */
	note?: (pitch: PitchSettings) => ReactNode;
	confirmHint?: string;
}) {
	const pictures = useFieldPictures();
	const info = SPORT_INFO[pitch.sport];

	return (
		<>
			<div className="new-board__sports" role="radiogroup" aria-label="Sport">
				{SPORTS.map((sport) => {
					const active = pitch.sport === sport;
					const isCurrent = current?.sport === sport;
					return (
						<button
							key={sport}
							type="button"
							role="radio"
							aria-checked={active}
							className={`new-board__sport${active ? " is-active" : ""}${
								isCurrent ? " is-current" : ""
							}`}
							onClick={() =>
								onPick({
									sport,
									// Back on the board's own sport, its own field is picked again.
									variant:
										isCurrent && current ? current.variant : pitch.variant,
								})
							}
							{...(active ? { "data-autofocus": true } : {})}
						>
							<BoardPreview
								board={pictures.get(`${sport}-full`)!}
								className="new-board__thumb"
							/>
							<span className="new-board__sport-name">
								{SPORT_INFO[sport].name}
							</span>
							{isCurrent && <span className="new-board__now">Now</span>}
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
						const isCurrent =
							current?.sport === option.sport && current.variant === variant;
						return (
							<button
								key={variant}
								type="button"
								role="radio"
								aria-checked={active}
								className={`new-board__variant${active ? " is-active" : ""}${
									isCurrent ? " is-current" : ""
								}`}
								onClick={() => onPick(option)}
								onDoubleClick={() => onConfirm(option)}
								title={confirmHint}
							>
								<BoardPreview
									board={pictures.get(`${pitch.sport}-${variant}`)!}
									className="new-board__preview"
								/>
								<span>
									{variant === "full"
										? `Full ${info.surface}`
										: `Half ${info.surface}`}
									{isCurrent && <span className="muted"> · now</span>}
									{note?.(option)}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}
