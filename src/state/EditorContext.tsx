import {
	createContext,
	Dispatch,
	MutableRefObject,
	ReactNode,
	useContext,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { Board } from "../model/types";
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

export function EditorProvider({
	board,
	children,
}: {
	board: Board;
	children: ReactNode;
}) {
	const [state, dispatch] = useReducer(editorReducer, board, createEditorState);
	const [panelTab, setPanelTab] = useState<SidePanelTab>("inspector");
	const boardRef = useRef<SVGSVGElement | null>(null);
	const inspectorFocusRef = useRef<HTMLInputElement | null>(null);

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
