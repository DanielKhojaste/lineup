// Browser behaviour that doesn't belong in a desktop app (find, print, reload,
// zoom shortcuts...) is turned off by tauri-plugin-prevent-default. Right-click
// is left to the frontend (src/main.tsx): it keeps the native copy/paste menu
// in text fields, blocks the browser menu everywhere else, and is where
// Lineup's own right-click menus live.

use tauri_plugin_prevent_default::Flags;

pub fn run() {
	tauri::Builder::default()
		.plugin(prevent_default())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_dialog::init())
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

//
// DEBUG MODE
//
#[cfg(debug_assertions)]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
	use tauri_plugin_prevent_default::Builder;

	// Disable everything except DevTools and Reload (handy while developing)
	// and the context menu (handled by the frontend).
	Builder::new()
		.with_flags(
			Flags::all().difference(Flags::DEV_TOOLS | Flags::RELOAD | Flags::CONTEXT_MENU),
		)
		.build()
}

//
// RELEASE MODE
//
#[cfg(not(debug_assertions))]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
	use tauri_plugin_prevent_default::Builder;

	// The context menu is handled by the frontend.
	#[allow(unused_mut)] // Only reassigned on Windows.
	let mut builder = Builder::new().with_flags(Flags::all().difference(Flags::CONTEXT_MENU));

	// Windows-specific hard lock. PlatformOptions only exists on Windows, so it's
	// imported here rather than above (that broke release builds elsewhere).
	#[cfg(target_os = "windows")]
	{
		use tauri_plugin_prevent_default::PlatformOptions;
		builder = builder.platform(
			PlatformOptions::new()
				.browser_accelerator_keys(false)
				// Kept on so text fields have Cut / Copy / Paste; the frontend blocks the
				// menu everywhere else.
				.default_context_menus(true)
				.default_script_dialogs(false)
				.general_autofill(false)
				.password_autosave(false),
		);
	}

	builder.build()
}
