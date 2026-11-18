import { ContextMenuProvider } from "./components/ui/ContextMenu";
import ViewManager from "./router/ViewManager";
import { LibraryProvider } from "./state/LibraryContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import { useEffect } from "react";
import { applyInterfaceScale, nextInterfaceScale } from "./app/interfaceScale";
import { getPreferences, setPreferences, usePreferences } from "./state/preferences";

/** The interface size from Settings, and Ctrl+= / Ctrl+- / Ctrl+0 to change it. */
function InterfaceScale() {
	const { interfaceScale } = usePreferences();
	useEffect(() => {
		void applyInterfaceScale(interfaceScale);
	}, [interfaceScale]);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
			const current = getPreferences().interfaceScale;
			let next: number | null = null;
			if (e.key === "=" || e.key === "+") next = nextInterfaceScale(current, 1);
			else if (e.key === "-" || e.key === "_") next = nextInterfaceScale(current, -1);
			else if (e.key === "0") next = 1;
			if (next === null) return;
			e.preventDefault();
			if (next !== current) setPreferences({ interfaceScale: next });
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	return null;
}

function App() {
	return (
		<ThemeProvider>
			<InterfaceScale />
			<ContextMenuProvider>
				<LibraryProvider>
					<ViewManager />
					{/* Preview branch: switch between designs to compare. */}
				</LibraryProvider>
			</ContextMenuProvider>
		</ThemeProvider>
	);
}

export default App;
