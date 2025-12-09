use tauri::{AppHandle, State, Window, Manager};
use crate::db::{DbState, ClipboardItem};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub fn get_history(state: State<DbState>) -> Vec<ClipboardItem> {
    state.get_history()
}

#[tauri::command]
pub fn delete_item(state: State<DbState>, id: String) -> Vec<ClipboardItem> {
    state.delete_item(&id);
    let _ = state.save();
    state.get_history()
}

#[tauri::command]
pub fn clear_all(state: State<DbState>) -> Vec<ClipboardItem> {
    state.clear_all();
    let _ = state.save();
    state.get_history()
}

#[tauri::command]
pub fn toggle_pin(state: State<DbState>, id: String) -> Vec<ClipboardItem> {
    state.toggle_pin(&id);
    let _ = state.save();
    state.get_history()
}

#[tauri::command]
pub fn hide_window(window: Window) {
    let _ = window.hide();
}

#[tauri::command]
pub fn paste_item(app: AppHandle, state: State<DbState>, id: String) {
    let history = state.get_history();
    if let Some(item) = history.iter().find(|i| i.id == id) {
        // Write to clipboard
        let clip = app.clipboard();
        if item.r#type == "text" {
            let _ = clip.write_text(item.content.clone());
        }

        // Hide window
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.hide();
        }

        // Simulate Paste
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(100)); // wait for focus switch
             let shell = app.shell();
             let _ = shell.command("xdotool")
                 .args(["key", "--clearmodifiers", "ctrl+v"])
                 .spawn();
        });
    }
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> crate::db::Settings {
    state.get_settings()
}

#[tauri::command]
pub fn update_setting(state: State<DbState>, key: String, value: serde_json::Value) -> crate::db::Settings {
    state.update_setting(key, value);
    let _ = state.save();
    state.get_settings()
}

#[tauri::command]
pub fn reorder_items(state: State<DbState>, active_id: String, over_id: String) -> Vec<ClipboardItem> {
    state.reorder_items(&active_id, &over_id);
    let _ = state.save();
    state.get_history()
}

#[tauri::command]
pub fn paste_content(app: AppHandle, _state: State<DbState>, content: String) {
     // Write to clipboard (ignore watcher?)
     // To ignore watcher, we might need a flag in Db or Clipboard State.
     // For now just write.
     let clip = app.clipboard();
     let _ = clip.write_text(content);
     
     if let Some(win) = app.get_webview_window("main") {
            let _ = win.hide();
     }
     
     std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(100)); 
             let shell = app.shell();
             let _ = shell.command("xdotool")
                 .args(["key", "--clearmodifiers", "ctrl+v"])
                 .spawn();
             let _ = shell.command("xdotool")
                 .args(["key", "--clearmodifiers", "ctrl+v"])
                 .spawn();
    });
}

#[tauri::command]
pub fn get_app_path() -> String {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Unknown".to_string())
}

#[tauri::command]
pub fn start_dragging(window: Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
pub fn set_zoom(window: tauri::WebviewWindow, factor: f64) {
    let width = 400.0 * factor;
    let height = 600.0 * factor;
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }));
}

// use tauri_plugin_positioner::{WindowExt, Position}; // Removed unused imports
use mouse_position::mouse_position::Mouse;

#[tauri::command]
pub fn show_window(window: tauri::WebviewWindow) {
    // 1. Force AlwaysOnTop logic
    let _ = window.set_always_on_top(true);
    
    // 2. Calculate and Set Position BEFORE showing (No Flicker)
    let state: State<DbState> = window.state();
    let settings = state.get_settings();
    
    match settings.position.as_str() {
         "cursor" => {
              let position = Mouse::get_mouse_position();
              match position {
                  Mouse::Position { x, y } => {
                      let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
                  },
                  _ => {}
              }
         }
         "center" => {
             let _ = window.center(); 
         }
         _ => {}
    }

    // 3. Show Window (and Unminimize just in case)
    let _ = window.unminimize();
    let _ = window.show();

    // 4. Force Focus immediately
    match window.set_focus() {
        Ok(_) => log::info!("Focus set immediately"),
        Err(e) => log::warn!("Failed to set focus immediately: {}", e),
    }

    // 5. Retry Focus Strategy (Async)
    // Linux WMs can be finicky. We try multiple times.
    let win_clone = window.clone();
    std::thread::spawn(move || {
        // Attempt 1: 50ms - Fast retry for responsive WMs
        std::thread::sleep(std::time::Duration::from_millis(50));
        match win_clone.set_focus() {
             Ok(_) => log::info!("Focus set (retry 1 - 50ms)"),
             Err(e) => log::warn!("Focus failed (retry 1 - 50ms): {}", e),
        }
        
        // Attempt 2: 150ms - Slower retry for sluggish WMs or animations
        std::thread::sleep(std::time::Duration::from_millis(100)); // +100ms = 150ms total
        match win_clone.set_focus() {
             Ok(_) => log::info!("Focus set (retry 2 - 150ms)"),
             Err(e) => log::warn!("Focus failed (retry 2 - 150ms): {}", e),
        }
    });
}
