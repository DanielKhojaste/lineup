import ViewManager from "./router/ViewManager";
import { ThemeProvider } from "./theme/ThemeProvider";

function App() {
	return (
		<ThemeProvider>
			<ViewManager />
		</ThemeProvider>
	);
}

export default App;
