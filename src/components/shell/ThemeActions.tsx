import { ReactNode, useState } from "react";
import { exportThemeFile, pickThemeFiles } from "../../storage/files";
import { ThemePreset } from "../../theme/themes";
import {
	addUserTheme,
	parseThemeFile,
	removeUserTheme,
	renameUserTheme,
} from "../../theme/userThemes";
import { Icon } from "../Icon";

/**
 * Import…, Export…, Rename… and Delete for themes, used in Settings and in the
 * Theme preview. Rename and Delete only show for your own themes.
 */
export default function ThemeActions({
	theme,
	onImported,
	before,
}: {
	/** The theme the buttons act on (the one in use, or the one being previewed). */
	theme: ThemePreset;
	/** A theme was imported: Settings uses it, the preview shows it. */
	onImported: (theme: ThemePreset) => void;
	/** Buttons to show first, e.g. "Preview all themes". */
	before?: ReactNode;
}) {
	const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
	const [renaming, setRenaming] = useState<string | null>(null);
	const yours = theme.preset.startsWith("user-");

	const importThemes = async () => {
		try {
			const files = await pickThemeFiles();
			if (!files.length) return;
			const problems: string[] = [];
			const added: ThemePreset[] = [];
			for (const file of files) {
				try {
					added.push(addUserTheme(parseThemeFile(file.text)));
				} catch (error) {
					problems.push(`${file.name}: ${(error as Error).message}`);
				}
			}
			if (added.length) onImported(added[added.length - 1]);
			setNotice(
				problems.length
					? { text: problems.join(" "), error: true }
					: {
							text:
								added.length === 1
									? `Added "${added[0].name}" to your themes.`
									: `Added ${added.length} themes to your themes.`,
						},
			);
		} catch (error) {
			setNotice({ text: `Couldn't import: ${(error as Error).message}`, error: true });
		}
	};

	const rename = () => {
		if (renaming === null) return;
		const renamed = renameUserTheme(theme.preset, renaming);
		setRenaming(null);
		if (renamed && renamed.name !== theme.name)
			setNotice({ text: `Renamed to "${renamed.name}".` });
	};

	return (
		<div className="theme-actions">
			{renaming !== null ? (
				<form
					className="settings__save"
					onSubmit={(e) => {
						e.preventDefault();
						rename();
					}}
				>
					<input
						className="field__input"
						aria-label="New name for the theme"
						maxLength={40}
						autoFocus
						value={renaming}
						onChange={(e) => setRenaming(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.stopPropagation();
								setRenaming(null);
							}
						}}
					/>
					<button type="submit" className="button button--small button--primary">
						Rename
					</button>
					<button type="button" className="button button--small" onClick={() => setRenaming(null)}>
						Cancel
					</button>
				</form>
			) : (
				<div className="settings__actions">
					{before}
					<button type="button" className="button button--small" onClick={importThemes}>
						<Icon name="upload" size={14} />
						Import…
					</button>
					<button
						type="button"
						className="button button--small"
						title={`Save "${theme.name}" as a .lineup-theme file to share or keep`}
						onClick={() =>
							void exportThemeFile(theme).catch((error) =>
								setNotice({ text: `Couldn't export: ${(error as Error).message}`, error: true }),
							)
						}
					>
						<Icon name="download" size={14} />
						Export…
					</button>
					{yours && (
						<>
							<button
								type="button"
								className="button button--small"
								onClick={() => setRenaming(theme.name)}
							>
								<Icon name="pencil" size={14} />
								Rename…
							</button>
							<button
								type="button"
								className="button button--small button--danger"
								onClick={() => {
									removeUserTheme(theme.preset);
									setNotice({ text: `Deleted "${theme.name}".` });
								}}
							>
								Delete theme
							</button>
						</>
					)}
				</div>
			)}
			{notice && (
				<p
					className={`small${notice.error ? " settings__error" : " muted"}`}
					role={notice.error ? "alert" : "status"}
				>
					{notice.text}
				</p>
			)}
		</div>
	);
}
