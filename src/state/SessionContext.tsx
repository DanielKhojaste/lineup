import {
	createContext,
	Dispatch,
	ReactNode,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";
import { Session } from "../model/session";
import { FieldGestureContext } from "../components/ui/fields";
import {
	createSessionState,
	SessionAction,
	sessionReducer,
	SessionState,
} from "./session";

interface SessionContextValue {
	state: SessionState;
	dispatch: Dispatch<SessionAction>;
	/** The block picked in the timeline: new drills are added after it. */
	selectedBlock: string | null;
	setSelectedBlock: (id: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
	session,
	children,
}: {
	session: Session;
	children: ReactNode;
}) {
	const [state, dispatch] = useReducer(
		sessionReducer,
		session,
		createSessionState,
	);
	const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
	const value = useMemo(
		() => ({ state, dispatch, selectedBlock, setSelectedBlock }),
		[state, selectedBlock],
	);
	// Text fields in the session editor group their typing into one undo step.
	const gestures = useMemo(
		() => ({
			begin: () => dispatch({ type: "beginGesture" }),
			end: () => dispatch({ type: "endGesture" }),
		}),
		[],
	);

	return (
		<SessionContext.Provider value={value}>
			<FieldGestureContext.Provider value={gestures}>
				{children}
			</FieldGestureContext.Provider>
		</SessionContext.Provider>
	);
}

export function useSessionEditor(): SessionContextValue {
	const context = useContext(SessionContext);
	if (!context)
		throw new Error("useSessionEditor must be used inside <SessionProvider>");
	return context;
}
