import { ContextMenuProvider } from "./components/ui/ContextMenu";
import ViewManager from "./router/ViewManager";
import { LibraryProvider } from "./state/LibraryContext";
import { ThemeProvider } from "./theme/ThemeProvider";

function App() {
	return (
		<ThemeProvider>
			<ContextMenuProvider>
				<LibraryProvider>
					<ViewManager />
				</LibraryProvider>
			</ContextMenuProvider>
		</ThemeProvider>
	);
}

export default App;
