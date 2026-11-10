import { CSSProperties, ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { ThemeSwatch } from "../components/shell/SettingsDialog";
import { Segmented, Swatches } from "../components/ui/controls";
import {
	THEME_PRESETS,
	ThemeMode,
	ThemeSettings,
	themeTokens,
} from "../theme/themes";
import { useTheme } from "../theme/ThemeProvider";

/** CSS custom properties for a theme, scoped to one element. */
function themeStyle(settings: ThemeSettings): CSSProperties {
	const style: Record<string, string> = {};
	for (const [name, value] of Object.entries(themeTokens(settings)))
		style[`--${name}`] = value;
	style.colorScheme = settings.mode;
	return style as CSSProperties;
}

type Uses = "primary" | "secondary" | "both" | "neither";

const USES_LABEL: Record<Uses, string> = {
	primary: "Primary",
	secondary: "Secondary",
	both: "Primary and secondary",
	neither: "Not a theme colour",
};

function Card({
	title,
	uses,
	children,
	wide,
}: {
	title: string;
	uses: Uses;
	children: ReactNode;
	wide?: boolean;
}) {
	return (
		<section className={`theme-spec__card${wide ? " theme-spec__card--wide" : ""}`}>
			<header className="theme-spec__head">
				<h3>{title}</h3>
				<span className={`theme-spec__uses theme-spec__uses--${uses}`}>
					{USES_LABEL[uses]}
				</span>
			</header>
			<div className="theme-spec__body">{children}</div>
		</section>
	);
}

const TOKEN_GROUPS: { label: string; tokens: string[] }[] = [
	{ label: "Primary", tokens: ["accent", "on-accent", "accent-text", "accent-soft"] },
	{
		label: "Secondary",
		tokens: ["secondary", "on-secondary", "secondary-text", "secondary-soft", "chip-bg", "chip-text"],
	},
	{
		label: "Surfaces and text",
		tokens: ["bg", "surface", "sunken", "raised", "hover", "border", "border-strong", "text", "text-muted", "board-bg", "danger"],
	},
];

/** Every component that uses the theme's colours, drawn in one theme. */
function Specimen({ settings, title }: { settings: ThemeSettings; title: string }) {
	const tokens = themeTokens(settings);
	const [kit, setKit] = useState("solid");
	const [colour, setColour] = useState("#E53935");
	const [tab, setTab] = useState("inspector");
	const [ticked, setTicked] = useState(true);

	return (
		<div className="theme-spec" style={themeStyle(settings)}>
			<h2 className="theme-spec__title">
				{title}
				<span className="muted"> · {settings.mode === "dark" ? "dark" : "light"}</span>
			</h2>
			<div className="theme-spec__grid">
				<Card title="Buttons and links" uses="primary">
					<div className="theme-spec__row">
						<button type="button" className="button button--primary">
							<Icon name="plus" size={16} /> New board
						</button>
						<button type="button" className="button">
							Cancel
						</button>
						<button type="button" className="link-button">
							+ Add notes
						</button>
					</div>
					<div className="theme-spec__row">
						<button type="button" className="button theme-spec__focus">
							Keyboard focus
						</button>
						<button type="button" className="button button--danger">
							Delete
						</button>
					</div>
				</Card>

				<Card title="Tool rail" uses="primary">
					<div className="rail__grid theme-spec__rail">
						<button type="button" className="rail__tool is-active" aria-pressed>
							<Icon name="select" />
						</button>
						<button type="button" className="rail__tool">
							<Icon name="player" fillColor="#E53935" />
						</button>
						<button type="button" className="rail__tool">
							<Icon name="cone" fillColor="#FF8A00" />
						</button>
						<button type="button" className="rail__tool">
							<Icon name="run" />
						</button>
					</div>
				</Card>

				<Card title="Tabs, choices and ticks" uses="primary">
					<div className="tabs" role="tablist">
						{["inspector", "notes"].map((t) => (
							<button
								key={t}
								type="button"
								role="tab"
								aria-selected={tab === t}
								className={`tabs__tab${tab === t ? " is-active" : ""}`}
								onClick={() => setTab(t)}
							>
								{t === "inspector" ? "Inspector" : "Notes"}
							</button>
						))}
					</div>
					<Segmented
						label="Kit"
						value={kit}
						options={[
							{ value: "solid", label: "Solid" },
							{ value: "stripes", label: "Stripes" },
						]}
						onChange={setKit}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={ticked}
							onChange={(e) => setTicked(e.target.checked)}
						/>
						Show positions and names
					</label>
					<Swatches
						label="Colour"
						value={colour}
						colors={["#E53935", "#F2F4F5", "#2F80ED", "#15181B"]}
						onChange={setColour}
					/>
				</Card>

				<Card title="Text fields" uses="primary">
					<div className="field">
						<span className="field__label">While typing</span>
						<input className="field__input is-focused" defaultValue="Rondo 4v2" />
					</div>
					<div className="field">
						<span className="field__label">Not typing</span>
						<input className="field__input" placeholder="Player name" />
					</div>
					<label className="search is-focused">
						<Icon name="search" size={16} />
						<input placeholder="Search boards and sessions" />
					</label>
				</Card>

				<Card title="Library" uses="both">
					<div className="theme-spec__nav">
						<button type="button" className="nav-item is-active">
							<span className="nav-item__label">Boards</span>
							<span className="nav-item__count">12</span>
						</button>
						<button type="button" className="nav-item">
							<span className="nav-item__label">Sessions</span>
							<span className="nav-item__count">3</span>
						</button>
					</div>
					<div className="filter-chips">
						<button type="button" className="filter-chip is-active">
							All
						</button>
						<button type="button" className="filter-chip">
							Drills <span className="filter-chip__count">5</span>
						</button>
						<span className="badge">Session</span>
					</div>
					<div className="session-card__strip theme-spec__strip">
						<span className="session-card__segment session-card__segment--active" style={{ flex: 12 }} />
						<span className="session-card__segment session-card__segment--rest" style={{ flex: 2 }} />
						<span className="session-card__segment session-card__segment--active" style={{ flex: 15 }} />
						<span className="session-card__segment session-card__segment--rest" style={{ flex: 5 }} />
					</div>
					<span className="field__hint">Session card: drills in the primary, breaks neutral</span>
				</Card>

				<Card title="Tags and topics" uses="secondary">
					<div className="chips">
						{["Pressing", "Rondo", "Transition"].map((t) => (
							<span key={t} className="chip">
								{t}
							</span>
						))}
					</div>
				</Card>

				<Card title="Session plan" uses="both" wide>
					<ol className="timeline theme-spec__timeline">
						<li className="block block--active is-selected">
							<span />
							<div className="block__time">
								<span className="block__name">Warm-up 1</span>
								<span>0–12′</span>
							</div>
							<div className="block__body">Rondo 4v2 (selected)</div>
							<span />
						</li>
						<li className="timeline__drop" aria-label="Where a dragged block will land" />
						<li className="block block--rest">
							<span />
							<div className="block__time">
								<span className="block__name">Water break 1</span>
								<span>12–14′</span>
							</div>
							<div className="block__body">
								<Icon name="water" size={16} /> Water break
							</div>
							<span />
						</li>
						<li className="block block--active">
							<span />
							<div className="block__time">
								<span className="block__name">Activity 1</span>
								<span>14–29′</span>
							</div>
							<div className="block__body">Playing through the thirds</div>
							<span />
						</li>
					</ol>
					<div className="timeline__total">
						<div className="timeline__meter">
							<span style={{ width: "62%" }} />
						</div>
					</div>
					<span className="field__hint">
						The line between blocks (where a dragged block lands) is the secondary
					</span>
				</Card>

				<Card title="Animation and saving" uses="primary">
					<div className="animation-bar theme-spec__steps">
						<button type="button" className="animation-bar__play" aria-label="Play">
							<Icon name="play" size={16} />
						</button>
						<ol className="animation-bar__steps">
							<li>
								<button type="button" className="step-chip">
									Start
								</button>
							</li>
							<li>
								<button type="button" className="step-chip is-active">
									1
									<span className="step-chip__progress" style={{ transform: "scaleX(0.6)" }} />
								</button>
							</li>
							<li>
								<button type="button" className="step-chip">
									2
								</button>
							</li>
						</ol>
					</div>
					<span className="save-status save-status--saving" role="status">
						<span className="save-status__dot" aria-hidden="true" />
						Saving…
					</span>
				</Card>

				<Card title="On the board" uses="primary">
					<svg viewBox="0 0 200 90" className="theme-spec__board" aria-hidden="true">
						<rect width="200" height="90" fill="#2D6A48" />
						<rect x="110" y="18" width="70" height="54" className="selection-box" />
						<g transform="translate(55 45)">
							<circle r="15" fill="#E53935" stroke="#FFFFFF" strokeWidth="2.5" />
							<circle r="22" className="marker__selection" />
						</g>
						<g transform="translate(145 45)">
							<circle r="15" fill="#F2F4F5" stroke="#15181B" strokeWidth="2.5" />
						</g>
					</svg>
					<span className="field__hint">Selected markers, the selection box and handles</span>
				</Card>

				<Card title="Every colour" uses="both" wide>
					{TOKEN_GROUPS.map((group) => (
						<div key={group.label} className="theme-spec__tokens">
							<span className="field__label">{group.label}</span>
							<div className="theme-spec__token-row">
								{group.tokens.map((name) => (
									<span key={name} className="theme-spec__token">
										<span
											className="theme-spec__chip"
											style={{ background: `var(--${name})` }}
										/>
										<span className="mono">{name}</span>
										<span className="mono muted">{tokens[name]}</span>
									</span>
								))}
							</div>
						</div>
					))}
					{settings.mode === "dark" && tokens.secondary !== settings.secondary && (
						<p className="field__hint">
							The secondary {settings.secondary} is too dark to see on dark panels, so
							it's shown lighter: {tokens.secondary}.
						</p>
					)}
				</Card>
			</div>
		</div>
	);
}

/**
 * Every component that uses the primary and secondary colours, in any theme.
 * Opened from Settings › Appearance; picking a theme here only previews it
 * until "Use this theme".
 */
export default function ThemePreview() {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();
	const [picked, setPicked] = useState<ThemeSettings>(theme);
	const [both, setBoth] = useState(false);

	const options: { settings: ThemeSettings; name: string }[] = [
		...THEME_PRESETS.map((p) => ({
			settings: { preset: p.preset, mode: p.mode, accent: p.accent, secondary: p.secondary },
			name: p.name,
		})),
		...(theme.preset === "custom" ? [{ settings: theme, name: "Custom" }] : []),
	];
	const name = options.find((o) => o.settings.preset === picked.preset)?.name ?? "Custom";
	const modes: ThemeMode[] = both ? ["dark", "light"] : [picked.mode];
	const inUse = picked.preset === theme.preset && picked.mode === theme.mode;

	return (
		<div className="theme-page">
			<header className="topbar">
				<button type="button" className="back-button" onClick={() => navigate(-1)}>
					<Icon name="chevronLeft" size={16} />
					Back
				</button>
				<span className="topbar__divider" aria-hidden="true" />
				<span className="topbar__heading">Theme preview</span>
				<span className="topbar__spacer" />
				<label className="check">
					<input type="checkbox" checked={both} onChange={(e) => setBoth(e.target.checked)} />
					Dark and light side by side
				</label>
				<button
					type="button"
					className="button button--primary"
					disabled={inUse}
					onClick={() => setTheme(picked)}
				>
					{inUse ? "In use" : "Use this theme"}
				</button>
			</header>
			<div className="theme-page__body">
				<nav className="theme-page__list" aria-label="Themes">
					{options.map((o) => {
						const active = o.settings.preset === picked.preset;
						return (
							<button
								key={o.settings.preset}
								type="button"
								className={`nav-item theme-page__item${active ? " is-active" : ""}`}
								aria-pressed={active}
								onClick={() => setPicked(o.settings)}
							>
								<ThemeSwatch settings={o.settings} />
								<span className="nav-item__label">
									{o.name}
									<span className="muted">
										{" "}
										· {o.settings.mode === "dark" ? "dark" : "light"}
									</span>
								</span>
								{o.settings.preset === theme.preset && (
									<span className="nav-item__count">In use</span>
								)}
							</button>
						);
					})}
					<p className="muted small theme-page__note">
						Themes are files in <span className="mono">src/theme/presets/</span>. Danger
						red, the fields, team kits and the printed session sheet stay the same in
						every theme.
					</p>
				</nav>
				<main className="theme-page__main">
					{modes.map((mode) => (
						<Specimen
							key={mode}
							title={name}
							settings={{
								...picked,
								mode,
								// A preset's hand-set colours are for its own mode.
								preset: mode === picked.mode ? picked.preset : "custom",
							}}
						/>
					))}
				</main>
			</div>
		</div>
	);
}
