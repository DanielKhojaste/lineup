import {
	createContext,
	Dispatch,
	MutableRefObject,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { createBoard } from "../model/board";
import { Board, SCHEMA_VERSION } from "../model/types";
import {
	createEditorState,
	EditorAction,
	EditorState,
	editorReducer,
} from "./editor";

export type SidePanelTab = "inspector" | "notes";

interface EditorContextValue {
	state: EditorState;
	dispatch: Dispatch<EditorAction>;
	/** The board's <svg>, used to convert pointer positions into board coordinates. */
	boardRef: MutableRefObject<SVGSVGElement | null>;
	panelTab: SidePanelTab;
	setPanelTab: (tab: SidePanelTab) => void;
	/** Opens the inspector and focuses its first field (used on double-click). */
	focusInspector: () => void;
	inspectorFocusRef: MutableRefObject<HTMLInputElement | null>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

// Until saving to files lands (v0.5.0), the board in progress is kept as a
// local draft so closing the app does not lose it.
const DRAFT_KEY = "lineup.draft";

function loadDraft(): Board {
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (raw) {
			const board = JSON.parse(raw) as Board;
			if (
				board?.schemaVersion === SCHEMA_VERSION &&
				Array.isArray(board.nodes)
			) {
				const fresh = createBoard();
				// Fill in any fields added since the draft was written.
				return {
					...fresh,
					...board,
					meta: { ...fresh.meta, ...board.meta },
					notes: { ...fresh.notes, ...board.notes },
					teams: { ...fresh.teams, ...board.teams },
					display: { ...fresh.display, ...board.display },
				};
			}
		}
	} catch {
		// Fall through to a new board.
	}
	return createBoard();
}

export function EditorProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(editorReducer, undefined, () =>
		createEditorState(loadDraft()),
	);
	const [panelTab, setPanelTab] = useState<SidePanelTab>("inspector");
	const boardRef = useRef<SVGSVGElement | null>(null);
	const inspectorFocusRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			try {
				localStorage.setItem(DRAFT_KEY, JSON.stringify(state.board));
			} catch {
				// Ignore: drafts are a convenience only.
			}
		}, 400);
		return () => window.clearTimeout(handle);
	}, [state.board]);

	const value = useMemo<EditorContextValue>(
		() => ({
			state,
			dispatch,
			boardRef,
			panelTab,
			setPanelTab,
			inspectorFocusRef,
			focusInspector: () => {
				setPanelTab("inspector");
				// Wait for the inspector to render the selected node's fields.
				requestAnimationFrame(() => {
					inspectorFocusRef.current?.focus();
					inspectorFocusRef.current?.select();
				});
			},
		}),
		[state, panelTab],
	);

	return (
		<EditorContext.Provider value={value}>{children}</EditorContext.Provider>
	);
}

export function useEditor(): EditorContextValue {
	const context = useContext(EditorContext);
	if (!context)
		throw new Error("useEditor must be used inside <EditorProvider>");
	return context;
}
