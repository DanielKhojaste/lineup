import { KeyboardEvent } from "react";
import { SidePanelTab, useEditor } from "../../state/EditorContext";
import Inspector from "./Inspector";
import NotesPanel from "./NotesPanel";

const TABS: { id: SidePanelTab; label: string }[] = [
	{ id: "inspector", label: "Inspector" },
	{ id: "notes", label: "Notes" },
];

export default function SidePanel() {
	const { panelTab, setPanelTab } = useEditor();

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		const index = TABS.findIndex((t) => t.id === panelTab);
		const next =
			TABS[
				(index + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length
			];
		setPanelTab(next.id);
		document.getElementById(`tab-${next.id}`)?.focus();
	};

	return (
		<aside className="side-panel" aria-label="Side panel">
			<div
				className="tabs"
				role="tablist"
				aria-label="Panel"
				onKeyDown={onKeyDown}
			>
				{TABS.map((tab) => (
					<button
						key={tab.id}
						id={`tab-${tab.id}`}
						type="button"
						role="tab"
						aria-selected={panelTab === tab.id}
						aria-controls={`tabpanel-${tab.id}`}
						tabIndex={panelTab === tab.id ? 0 : -1}
						className={`tabs__tab${panelTab === tab.id ? " is-active" : ""}`}
						onClick={() => setPanelTab(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>
			<div
				className="side-panel__content"
				role="tabpanel"
				id={`tabpanel-${panelTab}`}
				aria-labelledby={`tab-${panelTab}`}
			>
				{panelTab === "inspector" ? <Inspector /> : <NotesPanel />}
			</div>
		</aside>
	);
}
