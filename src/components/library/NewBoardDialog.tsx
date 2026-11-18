import { useEffect, useMemo, useState } from "react";
import { createBoard } from "../../model/board";
import { FieldVariant, Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { PitchSettings } from "../../model/types";
import { getPreferences, setPreferences } from "../../state/preferences";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

/**
 * "home": the default sport with both its fields on top, the other sports
 * below (design B). "sport": the grid alone, before there's a default.
 * "field": full or half for a sport picked from the grid.
 */
type Step = "home" | "sport" | "field";

/** Empty boards used as pictures of each field. */
function useFieldPictures() {
	return useMemo(() => {
		const pictures = new Map<string, ReturnType<typeof createBoard>>();
		for (const sport of SPORTS)
			for (const variant of ["full", "half"] as FieldVariant[])
				pictures.set(`${sport}-${variant}`, createBoard("", { sport, variant }));
		return pictures;
	}, []);
}

const fieldName = (sport: Sport, variant: FieldVariant) =>
	`${variant === "full" ? "Full" : "Half"} ${SPORT_INFO[sport].surface}`;

/**
 * A new board. With a default sport, the window opens on that sport and both
 * its fields, the default field highlighted: one click (or Enter) makes the
 * board. Any other sport is one click away below, then its field. Without a
 * default yet, it's the grid of sports (with a tick to make the pick the
 * default), then the field.
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
	const [step, setStep] = useState<Step>("sport");
	const [pitch, setPitch] = useState<PitchSettings>(() => getPreferences().defaultPitch);
	const [sportDefault, setSportDefault] = useState(false);

	const prefs = getPreferences();
	const defaultSport = prefs.hasDefaultSport ? prefs.defaultPitch.sport : undefined;
	/** The sport on top: the library's sport when it's showing one, else the default. */
	const topSport = initialSport ?? defaultSport;
	const fieldFor = (sport: Sport): FieldVariant => prefs.fieldDefaults[sport] ?? "full";

	// Each time it opens, start from the defaults.
	useEffect(() => {
		if (!open) return;
		const p = getPreferences();
		const top = initialSport ?? (p.hasDefaultSport ? p.defaultPitch.sport : undefined);
		const sport = top ?? p.defaultPitch.sport;
		setPitch({ sport, variant: p.fieldDefaults[sport] ?? "full" });
		setStep(top ? "home" : "sport");
		setSportDefault(p.hasDefaultSport && p.defaultPitch.sport === sport);
	}, [open, initialSport]);

	// The window settles on its step after opening: focus the step's main pick, so Enter works.
	useEffect(() => {
		if (!open) return;
		const id = requestAnimationFrame(() =>
			document.querySelector<HTMLElement>(".dialog--new-board [data-autofocus]")?.focus(),
		);
		return () => cancelAnimationFrame(id);
	}, [open, step]);

	const pickSport = (sport: Sport) => {
		setPitch({ sport, variant: fieldFor(sport) });
		setSportDefault(sport === defaultSport);
	};

	/**
	 * Makes the board; from the field step, "Make … my default sport" is saved.
	 * There's no default field to ask for: with the default sport on top and
	 * both its fields there, either is one click.
	 */
	const create = (chosen: PitchSettings = pitch) => {
		if (step !== "home" && sportDefault && chosen.sport !== defaultSport)
			setPreferences({ defaultPitch: { sport: chosen.sport, variant: fieldFor(chosen.sport) } });
		onCreate(chosen);
		onClose();
	};

	const info = SPORT_INFO[pitch.sport];
	const fieldTile = (sport: Sport, variant: FieldVariant, onPick: () => void, small = false) => {
		const active = pitch.sport === sport && pitch.variant === variant;
		return (
			<button
				key={variant}
				type="button"
				role="radio"
				aria-checked={active}
				className={`field-tile${small ? " field-tile--row" : ""}${active ? " is-active" : ""}`}
				onClick={onPick}
				{...(active ? { "data-autofocus": true } : {})}
			>
				<BoardPreview board={pictures.get(`${sport}-${variant}`)!} className="field-tile__thumb" />
				<span className="field-tile__text">
					<b>{fieldName(sport, variant)}</b>
					{small && (
						<small className="muted">{active ? "Click or press Enter" : "Click to create"}</small>
					)}
				</span>
			</button>
		);
	};

	const sportTile = (sport: Sport, onPick: () => void, onDouble?: () => void) => {
		const active = step === "sport" && pitch.sport === sport;
		return (
			<button
				key={sport}
				type="button"
				role={step === "sport" ? "radio" : undefined}
				aria-checked={step === "sport" ? active : undefined}
				className={`sport-tile${active ? " is-active" : ""}`}
				onClick={onPick}
				onDoubleClick={onDouble}
				{...(active ? { "data-autofocus": true } : {})}
			>
				{sport === defaultSport && <span className="sport-tile__default">Default</span>}
				<BoardPreview board={pictures.get(`${sport}-full`)!} className="sport-tile__thumb" />
				<span>{SPORT_INFO[sport].name}</span>
			</button>
		);
	};

	return (
		<Modal open={open} title="New board" onClose={onClose} className="dialog--new-board">
			<form
				className="dialog__section new-board-steps"
				onSubmit={(e) => {
					e.preventDefault();
					if (step === "sport") setStep("field");
					else create();
				}}
			>
				{step === "home" && topSport && (
					<>
						<div className="new-board-default" role="radiogroup" aria-label={SPORT_INFO[topSport].name}>
							<span className="new-board-default__sport">
								<b>{SPORT_INFO[topSport].name}</b>
								<span className="muted small">
									{topSport === defaultSport ? "Your default" : "This sport"}
								</span>
							</span>
							{(["full", "half"] as FieldVariant[]).map((variant) =>
								fieldTile(topSport, variant, () => create({ sport: topSport, variant }), true),
							)}
						</div>
						<span className="new-board-steps__heading">Other sports</span>
						<div className="sport-grid">
							{SPORTS.filter((s) => s !== topSport).map((sport) =>
								sportTile(sport, () => {
									pickSport(sport);
									setStep("field");
								}),
							)}
						</div>
					</>
				)}

				{step === "sport" && (
					<>
						<div className="sport-grid" role="radiogroup" aria-label="Sport">
							{SPORTS.map((sport) =>
								sportTile(
									sport,
									() => pickSport(sport),
									() => {
										pickSport(sport);
										setStep("field");
									},
								),
							)}
						</div>
						<label className="check">
							<input
								type="checkbox"
								checked={sportDefault}
								onChange={(e) => setSportDefault(e.target.checked)}
							/>
							Make {info.name.toLowerCase()} my default sport
						</label>
					</>
				)}

				{step === "field" && (
					<>
						<button
							type="button"
							className="link-button new-board-steps__back"
							onClick={() => setStep(topSport ? "home" : "sport")}
						>
							<Icon name="chevronLeft" size={14} />
							{topSport ? "All sports" : info.name}
						</button>
						<div className="field-tiles" role="radiogroup" aria-label={`Full or half ${info.surface}`}>
							{(["full", "half"] as FieldVariant[]).map((variant) =>
								fieldTile(pitch.sport, variant, () => setPitch({ sport: pitch.sport, variant })),
							)}
						</div>
						{pitch.sport !== defaultSport && (
							<label className="check">
								<input
									type="checkbox"
									checked={sportDefault}
									onChange={(e) => setSportDefault(e.target.checked)}
								/>
								Make {info.name.toLowerCase()} my default sport
							</label>
						)}
					</>
				)}

				<div className="dialog__actions">
					{step === "home" && <span className="muted small new-board-steps__hint">Change the defaults in Settings</span>}
					{step === "field" ? (
						<button type="button" className="button" onClick={() => setStep(topSport ? "home" : "sport")}>
							Back
						</button>
					) : (
						<button type="button" className="button" onClick={onClose}>
							Cancel
						</button>
					)}
					<button type="submit" className="button button--primary">
						{step === "sport" ? "Next: field ›" : "Create board"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
