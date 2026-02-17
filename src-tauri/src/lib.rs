// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// RELEASE: The 'prevent default' code was written using AI and must be investigated further before release.

use tauri_plugin_prevent_default::Flags;

#[tauri::command]
fn greet(name: &str) -> String {
	format!("Hello, {}! You've been greeted from Rust!", name)
}

pub fn run() {
	tauri::Builder::default()
		.plugin(prevent_default())
		.plugin(tauri_plugin_opener::init())
		.invoke_handler(tauri::generate_handler![greet])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

//
// DEBUG MODE
//
#[cfg(debug_assertions)]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
	use tauri_plugin_prevent_default::Builder;

	// Disable everything EXCEPT DevTools and Reload
	Builder::new()
		.with_flags(Flags::all().difference(Flags::DEV_TOOLS | Flags::RELOAD))
		.build()
}

//
// RELEASE MODE
//
#[cfg(not(debug_assertions))]
fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
	use tauri_plugin_prevent_default::{Builder, PlatformOptions};

	let mut builder = Builder::new();

	// Windows-specific hard lock
	#[cfg(target_os = "windows")]
	{
		builder = builder.platform(
			PlatformOptions::new()
				.browser_accelerator_keys(false)
				.default_context_menus(false)
				.default_script_dialogs(false)
				.general_autofill(false)
				.password_autosave(false),
		);
	}

	builder.build()
}
