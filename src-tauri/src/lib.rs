// Browser behaviour that doesn't belong in a desktop app (find, print, reload,
// zoom shortcuts...) is turned off by tauri-plugin-prevent-default. Right-click
// is left to the frontend (src/components/ui/ContextMenu.tsx): it never shows
// the browser's menu, and draws Lineup's own menus instead, including Cut /
// Copy / Paste in text fields (through the clipboard plugin).

use tauri_plugin_prevent_default::Flags;

pub fn run() {
	tauri::Builder::default()
		.plugin(prevent_default())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_clipboard_manager::init())
		// Reopen the window at the size and place it was closed at, maximised or
		// full screen if it was.
		.plugin(tauri_plugin_window_state::Builder::default().build())
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
				// Lineup draws its own right-click menus, text fields included.
				.default_context_menus(false)
				.default_script_dialogs(false)
				.general_autofill(false)
				.password_autosave(false),
		);
	}

	builder.build()
}
