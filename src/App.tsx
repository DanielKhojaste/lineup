import ViewManager from "./router/ViewManager";
import { LibraryProvider } from "./state/LibraryContext";
import { ThemeProvider } from "./theme/ThemeProvider";

function App() {
	return (
		<ThemeProvider>
			<LibraryProvider>
				<ViewManager />
			</LibraryProvider>
		</ThemeProvider>
	);
}

export default App;
