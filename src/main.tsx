import { syncPreferencesWithFile } from "./state/preferences";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/app.css";
import { startDevLog } from "./utils/log";

// Development builds keep a log for finding bugs (none in release builds).
startDevLog();

// Don't offer things typed into fields before (the webview remembers them).
// Turned off everywhere for now; see "Suggestions in fields" in the to-do list.
document.addEventListener(
	"focusin",
	(e) => {
		const el = e.target;
		if (
			(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
			!el.hasAttribute("autocomplete")
		)
			el.setAttribute("autocomplete", "off");
	},
	true,
);

// Desktop app: preferences from Lineup/settings.json (shared by every build).
void syncPreferencesWithFile();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<App />,
);
