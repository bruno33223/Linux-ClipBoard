use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_global_shortcut::{ShortcutState, Shortcut, GlobalShortcutExt};
// Duplicate import removed
use crate::db::DbState;

mod clipboard;
mod commands;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            } else if let tauri::WindowEvent::Focused(false) = event {
                // Auto-hide when focus is lost (clicked outside)
                let _ = window.hide();
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        // Global shortcut plugin added manually in setup with handler
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                 commands::show_window(win);
            }
        }))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Initialize DB
            let state = DbState::new(app.handle());
            app.manage(state);
            
            // Start Clipboard Watcher
            clipboard::start_watcher(app.handle().clone());
            
            // Setup Tray
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Clipboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            // Register Global Shortcut (Super+V)
            // Linux: Super+V, Windows: Win+V (reserved?), Mac: Cmd+V
            // We'll try "Super+V" and also "Ctrl+Shift+V" as fallback or user configurable later.
            // For now hardcode "Super+V" as per user request (legacy behavior).
            let shortcut_str = "Super+V";
            #[cfg(target_os = "macos")]
            let shortcut_str = "Command+Shift+V";

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                              if let Some(win) = app.get_webview_window("main") {
                                  commands::show_window(win);
                              }
                         }
                    })
                    .build(),
            )?;

            let shortcut_manager = app.global_shortcut();
            // Note: "Super+V" might need explicit parsing or constructed Struct if string fails.
            // But from_str is usually supported.
            if let Err(e) = shortcut_manager.register(shortcut_str.parse::<Shortcut>().unwrap()) {
                log::error!("Failed to register global shortcut: {}", e);
            }

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                 commands::show_window(win);
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                             if win.is_visible().unwrap_or(false) && win.is_focused().unwrap_or(false) {
                                 let _ = win.minimize();
                             } else {
                                 commands::show_window(win);
                             }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_history,
            commands::delete_item,
            commands::clear_all,
            commands::toggle_pin,
            commands::hide_window,
            commands::start_dragging,
            commands::set_zoom,
            commands::show_window,
            commands::paste_item,
            commands::get_settings,
            commands::update_setting,
            commands::reorder_items,
            commands::paste_content,
            commands::get_app_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
