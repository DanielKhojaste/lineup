import {
	STEP_DURATIONS,
	stepAtTime,
	totalDuration,
} from "../../model/animation";
import { useEditor } from "../../state/EditorContext";
import { PLAYBACK_SPEEDS, usePlayback } from "../../state/PlaybackContext";
import { Icon } from "../Icon";

function formatSeconds(s: number): string {
	return `${Number.isInteger(s) ? s : s.toFixed(1)} s`;
}

/**
 * The animation timeline under the board: play, pick a step to edit, add or
 * remove steps and set how long each takes.
 */
export default function AnimationBar() {
	const { state, dispatch } = useEditor();
	const playback = usePlayback();
	const { steps } = state.board;
	const inPlayback = playback.time !== null;
	const playingStep = inPlayback
		? stepAtTime(state.board, playback.time!)
		: null;
	const current = steps[state.step - 1];
	const total = totalDuration(state.board);

	const goTo = (step: number) => {
		if (inPlayback) playback.stop();
		dispatch({ type: "setStep", step });
	};

	return (
		<div className="animation-bar" role="toolbar" aria-label="Animation">
			<button
				type="button"
				className="animation-bar__play"
				aria-label={playback.playing ? "Pause (Space)" : "Play (Space)"}
				title={
					steps.length === 0
						? "Add a step to animate the board"
						: playback.playing
						  ? "Pause (Space)"
						  : "Play (Space)"
				}
				disabled={steps.length === 0}
				onClick={playback.toggle}
			>
				<Icon name={playback.playing ? "pause" : "play"} size={16} />
			</button>

			<ol className="animation-bar__steps">
				{[0, ...steps.map((_, i) => i + 1)].map((step) => {
					const active = inPlayback
						? playingStep!.step === step
						: state.step === step;
					const progress =
						inPlayback && playingStep!.step === step ? playingStep!.t : null;
					return (
						<li key={step}>
							<button
								type="button"
								className={`step-chip${active ? " is-active" : ""}`}
								aria-current={active ? "step" : undefined}
								title={
									step === 0
										? "Starting position"
										: `Step ${step} · ${formatSeconds(
												steps[step - 1].duration,
										  )}`
								}
								onClick={() => goTo(step)}
							>
								{step === 0 ? "Start" : step}
								{progress !== null && (
									<span
										className="step-chip__progress"
										style={{ transform: `scaleX(${progress})` }}
									/>
								)}
							</button>
						</li>
					);
				})}
				<li>
					<button
						type="button"
						className="step-chip step-chip--add"
						aria-label="Add a step after this one"
						title="Add a step after this one"
						onClick={() => {
							if (inPlayback) playback.stop();
							dispatch({ type: "addStep" });
						}}
					>
						<Icon name="plus" size={14} />
						{steps.length === 0 && <span>Add step</span>}
					</button>
				</li>
			</ol>

			<span className="animation-bar__spacer" />

			{current && !inPlayback && (
				<>
					<label className="animation-bar__field">
						<span className="visually-hidden">Step {state.step} length</span>
						<select
							className="field__input field__input--small"
							value={current.duration}
							onChange={(e) =>
								dispatch({
									type: "setStepDuration",
									step: state.step,
									duration: Number(e.target.value),
								})
							}
						>
							{[...new Set([...STEP_DURATIONS, current.duration])]
								.sort((a, b) => a - b)
								.map((d) => (
									<option key={d} value={d}>
										{formatSeconds(d)}
									</option>
								))}
						</select>
					</label>
					<button
						type="button"
						className="icon-button icon-button--small"
						aria-label={`Delete step ${state.step}`}
						title={`Delete step ${state.step}`}
						onClick={() => dispatch({ type: "deleteStep", step: state.step })}
					>
						<Icon name="trash" size={16} />
					</button>
				</>
			)}
			{steps.length > 0 && (
				<label className="animation-bar__field">
					<span className="visually-hidden">Playback speed</span>
					<select
						className="field__input field__input--small"
						value={playback.speed}
						title={`Whole animation: ${formatSeconds(total)} at normal speed`}
						onChange={(e) => playback.setSpeed(Number(e.target.value))}
					>
						{PLAYBACK_SPEEDS.map((s) => (
							<option key={s} value={s}>
								{s}×
							</option>
						))}
					</select>
				</label>
			)}
		</div>
	);
}
