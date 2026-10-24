import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { startOfStep, stepAtTime, totalDuration } from "../model/animation";
import { useEditor } from "./EditorContext";

export const PLAYBACK_SPEEDS = [0.5, 1, 2] as const;

interface PlaybackValue {
	/** Seconds into the animation, or null when not in playback (editing a step). */
	time: number | null;
	playing: boolean;
	speed: number;
	setSpeed: (speed: number) => void;
	/** Play from the current step (or from the start if on the last step). */
	play: () => void;
	pause: () => void;
	/** Play or pause. */
	toggle: () => void;
	/** Leave playback and go back to editing, on the step reached. */
	stop: () => void;
}

const PlaybackContext = createContext<PlaybackValue | null>(null);

/** Plays a board's animation. Playback never changes the board itself. */
export function PlaybackProvider({ children }: { children: ReactNode }) {
	const { state, dispatch } = useEditor();
	const { board } = state;
	const [time, setTime] = useState<number | null>(null);
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState(1);
	const total = totalDuration(board);

	// Kept in refs so the animation frame loop always sees the latest values.
	const timeRef = useRef<number | null>(null);
	const speedRef = useRef(speed);
	speedRef.current = speed;

	const update = useCallback((t: number | null) => {
		timeRef.current = t;
		setTime(t);
	}, []);

	const stop = useCallback(() => {
		const t = timeRef.current;
		setPlaying(false);
		if (t === null) return;
		const { step, t: through } = stepAtTime(board, t);
		// Paused part-way through a step: go to whichever end is nearer.
		dispatch({ type: "setStep", step: through >= 0.5 ? step : step - 1 });
		update(null);
	}, [board, dispatch, update]);

	const play = useCallback(() => {
		if (board.steps.length === 0) return;
		if (timeRef.current === null || timeRef.current >= total) {
			const from = state.step >= board.steps.length ? 0 : state.step;
			update(startOfStep(board, from + 1));
		}
		setPlaying(true);
	}, [board, state.step, total, update]);

	const pause = useCallback(() => setPlaying(false), []);

	const toggle = useCallback(() => {
		if (playing) pause();
		else play();
	}, [playing, pause, play]);

	useEffect(() => {
		if (!playing) return;
		let last = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			const dt = ((now - last) / 1000) * speedRef.current;
			last = now;
			const next = (timeRef.current ?? 0) + dt;
			if (next >= total) {
				// Finished: back to editing, on the last step.
				setPlaying(false);
				dispatch({ type: "setStep", step: board.steps.length });
				update(null);
				return;
			}
			update(next);
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, [playing, total, board.steps.length, dispatch, update]);

	// Editing the steps (or undoing them away) ends playback.
	useEffect(() => {
		if (board.steps.length === 0 && timeRef.current !== null) {
			setPlaying(false);
			update(null);
		}
	}, [board.steps.length, update]);

	const value = useMemo<PlaybackValue>(
		() => ({ time, playing, speed, setSpeed, play, pause, toggle, stop }),
		[time, playing, speed, play, pause, toggle, stop],
	);

	return (
		<PlaybackContext.Provider value={value}>
			{children}
		</PlaybackContext.Provider>
	);
}

export function usePlayback(): PlaybackValue {
	const context = useContext(PlaybackContext);
	if (!context)
		throw new Error("usePlayback must be used inside <PlaybackProvider>");
	return context;
}
