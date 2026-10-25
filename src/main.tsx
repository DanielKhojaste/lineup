import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/app.css";

/** True for elements where the browser's own behaviour is wanted: text fields. */
function isTextField(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement)
	);
}

// No browser right-click menu (Back, Reload, Inspect…) outside text fields.
// Lineup's own right-click menus call preventDefault themselves.
window.addEventListener("contextmenu", (e) => {
	if (!isTextField(e.target)) e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<App />,
);
