import { useEffect, useMemo, useState } from "react";
import { createBoard } from "../../model/board";
import { FieldVariant, Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { PitchSettings } from "../../model/types";
import { useLibrary } from "../../state/LibraryContext";
import { getPreferences, setPreferences } from "../../state/preferences";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

type Step = "summary" | "sport" | "field";

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
 * A new board in up to two steps: a grid of sports, then a full or half
 * field. Each step has a tick to make the pick the default; with both set,
 * the window opens on a one-click summary, and "Change" brings the steps
 * back, so a default never traps anyone.
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
	const library = useLibrary();
	const pictures = useFieldPictures();
	const [step, setStep] = useState<Step>("sport");
	const [pitch, setPitch] = useState<PitchSettings>(() => getPreferences().defaultPitch);
	const [sportDefault, setSportDefault] = useState(false);
	const [fieldDefault, setFieldDefault] = useState(false);

	const prefs = getPreferences();
	const defaultSport = prefs.hasDefaultSport ? prefs.defaultPitch.sport : undefined;
	const fieldFor = (sport: Sport): FieldVariant => prefs.fieldDefaults[sport] ?? "full";

	// Each time it opens, start from the defaults: the summary when both are set.
	useEffect(() => {
		if (!open) return;
		const p = getPreferences();
		const sport = initialSport ?? p.defaultPitch.sport;
		const known = !!initialSport || p.hasDefaultSport;
		const field = p.fieldDefaults[sport];
		setPitch({ sport, variant: field ?? "full" });
		setStep(known && field ? "summary" : known ? "field" : "sport");
		setSportDefault(p.hasDefaultSport && p.defaultPitch.sport === sport);
		setFieldDefault(!!field);
	}, [open, initialSport]);

	const pickSport = (sport: Sport) => {
		setPitch({ sport, variant: fieldFor(sport) });
		setSportDefault(sport === defaultSport);
		setFieldDefault(!!prefs.fieldDefaults[sport]);
	};

	const create = (chosen: PitchSettings = pitch, saveDefaults = step !== "summary") => {
		if (saveDefaults) {
			const p = getPreferences();
			const fieldDefaults = { ...p.fieldDefaults };
			if (step === "field") {
				if (fieldDefault) fieldDefaults[chosen.sport] = chosen.variant;
				else delete fieldDefaults[chosen.sport];
			}
			setPreferences({
				fieldDefaults,
				...(sportDefault && chosen.sport !== defaultSport
					? { defaultPitch: { sport: chosen.sport, variant: fieldDefaults[chosen.sport] ?? "full" } }
					: {}),
			});
		}
		onCreate(chosen);
		onClose();
	};

	// "Or quickly": the default sport's other field, and the sports used most after it.
	const quick = useMemo(() => {
		const counts = new Map<Sport, number>();
		for (const b of library.boards) counts.set(b.pitch.sport, (counts.get(b.pitch.sport) ?? 0) + 1);
		const others = SPORTS.filter((s) => s !== pitch.sport)
			.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || SPORTS.indexOf(a) - SPORTS.indexOf(b))
			.slice(0, 2);
		const other: FieldVariant = pitch.variant === "full" ? "half" : "full";
		return [
			{ label: fieldName(pitch.sport, other), pitch: { sport: pitch.sport, variant: other } },
			...others.map((s) => ({ label: SPORT_INFO[s].name, pitch: { sport: s, variant: fieldFor(s) } })),
		];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [library.boards, pitch.sport, pitch.variant, open]);

	const info = SPORT_INFO[pitch.sport];

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
				{step === "summary" && (
					<>
						<div className="new-board-summary">
							<BoardPreview
								board={pictures.get(`${pitch.sport}-${pitch.variant}`)!}
								className="new-board-summary__thumb"
							/>
							<span className="new-board-summary__text">
								<b>
									{info.name} · {fieldName(pitch.sport, pitch.variant)}
								</b>
								<span className="muted small">Your defaults</span>
							</span>
							<button type="button" className="button button--small" onClick={() => setStep("sport")}>
								Change
							</button>
						</div>
						<div className="new-board-quick">
							<span className="muted small">Or quickly:</span>
							{quick.map((q) => (
								<button
									key={q.label}
									type="button"
									className="filter-chip"
									onClick={() => create(q.pitch, false)}
								>
									{q.label}
								</button>
							))}
						</div>
					</>
				)}

				{step === "sport" && (
					<>
						<div className="sport-grid" role="radiogroup" aria-label="Sport">
							{SPORTS.map((sport) => {
								const active = pitch.sport === sport;
								return (
									<button
										key={sport}
										type="button"
										role="radio"
										aria-checked={active}
										className={`sport-tile${active ? " is-active" : ""}`}
										onClick={() => pickSport(sport)}
										onDoubleClick={() => {
											pickSport(sport);
											setStep("field");
										}}
										title="Double-click to pick the field"
										{...(active ? { "data-autofocus": true } : {})}
									>
										{sport === defaultSport && <span className="sport-tile__default">Default</span>}
										<BoardPreview board={pictures.get(`${sport}-full`)!} className="sport-tile__thumb" />
										<span>{SPORT_INFO[sport].name}</span>
									</button>
								);
							})}
						</div>
						<label className="check">
							<input
								type="checkbox"
								checked={sportDefault}
								onChange={(e) => setSportDefault(e.target.checked)}
								disabled={pitch.sport === defaultSport}
							/>
							{pitch.sport === defaultSport
								? `${info.name} is your default sport`
								: `Make ${info.name.toLowerCase()} my default sport`}
						</label>
					</>
				)}

				{step === "field" && (
					<>
						<button type="button" className="link-button new-board-steps__back" onClick={() => setStep("sport")}>
							<Icon name="chevronLeft" size={14} />
							{info.name}
						</button>
						<div className="field-tiles" role="radiogroup" aria-label={`Full or half ${info.surface}`}>
							{(["full", "half"] as FieldVariant[]).map((variant) => {
								const active = pitch.variant === variant;
								return (
									<button
										key={variant}
										type="button"
										role="radio"
										aria-checked={active}
										className={`field-tile${active ? " is-active" : ""}`}
										onClick={() => {
											setPitch({ sport: pitch.sport, variant });
											setFieldDefault(prefs.fieldDefaults[pitch.sport] === variant);
										}}
										onDoubleClick={() => create({ sport: pitch.sport, variant })}
										title="Double-click to make the board"
										{...(active ? { "data-autofocus": true } : {})}
									>
										<BoardPreview
											board={pictures.get(`${pitch.sport}-${variant}`)!}
											className="field-tile__thumb"
										/>
										<b>{fieldName(pitch.sport, variant)}</b>
									</button>
								);
							})}
						</div>
						<label className="check">
							<input
								type="checkbox"
								checked={fieldDefault}
								onChange={(e) => setFieldDefault(e.target.checked)}
							/>
							Always start {info.name.toLowerCase()} boards on a {fieldName(pitch.sport, pitch.variant).toLowerCase()}
						</label>
					</>
				)}

				<div className="dialog__actions">
					{step === "field" ? (
						<button type="button" className="button" onClick={() => setStep("sport")}>
							Back
						</button>
					) : (
						<button type="button" className="button" onClick={onClose}>
							Cancel
						</button>
					)}
					<button
						type="submit"
						className="button button--primary"
						{...(step === "summary" ? { "data-autofocus": true } : {})}
					>
						{step === "sport" ? "Next: field ›" : "Create board"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
