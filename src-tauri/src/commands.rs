use tauri::{AppHandle, State, Window, Manager, Emitter};
use crate::db::{DbState, ClipboardItem};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

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
        } else if item.r#type == "image" {
             // Decode base64
             use base64::Engine;
             let b64 = item.content.clone();
             // Remove prefix if present (e.g. "data:image/png;base64,")
             let b64_clean = if let Some(idx) = b64.find(',') {
                 &b64[idx+1..]
             } else {
                 &b64
             };

             if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64_clean) {
                 if let Ok(img) = image::load_from_memory(&bytes) {
                     let rgba_img = img.to_rgba8();
                     let (width, height) = rgba_img.dimensions();
                     let pixels = rgba_img.into_raw();
                     
                     let tauri_image = tauri::image::Image::new(&pixels, width, height);
                     let _ = clip.write_image(&tauri_image);
                 }
             }
        }

        // Hide window
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.hide();
        }

        // Simulate Paste
        tauri::async_runtime::spawn(async move {
            std::thread::sleep(std::time::Duration::from_millis(100)); // wait for focus switch
             let shell = app.shell();
             
             // Detect active window class
             let output = shell.command("xdotool")
                .args(["getactivewindow", "getwindowclassname"])
                .output()
                .await;
                
             let mut is_terminal = false;
             if let Ok(out) = output {
                 if out.status.success() {
                     let class_name = String::from_utf8_lossy(&out.stdout).to_lowercase();
                     // Common terminal class names
                     if class_name.contains("term") || 
                        class_name.contains("alacritty") || 
                        class_name.contains("kitty") ||
                        class_name.contains("konsole") {
                            is_terminal = true;
                     }
                 }
             }

             if is_terminal {
                 let _ = shell.command("xdotool")
                     .args(["key", "--clearmodifiers", "ctrl+shift+v"])
                     .spawn();
             } else {
                 let _ = shell.command("xdotool")
                     .args(["key", "--clearmodifiers", "ctrl+v"])
                     .spawn();
             }
        });
    }
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> crate::db::Settings {
    state.get_settings()
}

#[tauri::command]
pub fn update_setting(app: AppHandle, state: State<DbState>, key: String, value: serde_json::Value) -> crate::db::Settings {
    // 1. Update State
    state.update_setting(key.clone(), value.clone());
    let _ = state.save();
    
    // 2. Handle Side Effects
    if key == "useInternalShortcut" {
        if let Some(enabled) = value.as_bool() {
             let shortcut_str = if cfg!(target_os = "macos") { "Command+Control+V" } else { "Super+Control+V" };
             if let Ok(shortcut) = shortcut_str.parse::<Shortcut>() {
                 if enabled {
                     if let Err(e) = app.global_shortcut().register(shortcut) {
                         eprintln!("Failed to register internal shortcut: {}", e);
                     }
                 } else {
                     let _ = app.global_shortcut().unregister(shortcut);
                 }
             }
        }
    }

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
     
     tauri::async_runtime::spawn(async move {
            std::thread::sleep(std::time::Duration::from_millis(100)); 
             let shell = app.shell();
             
             // Detect active window class
             let output = shell.command("xdotool")
                .args(["getactivewindow", "getwindowclassname"])
                .output()
                .await;
                
             let mut is_terminal = false;
             if let Ok(out) = output {
                 if out.status.success() {
                     let class_name = String::from_utf8_lossy(&out.stdout).to_lowercase();
                     if class_name.contains("term") || 
                        class_name.contains("alacritty") || 
                        class_name.contains("kitty") ||
                        class_name.contains("konsole") {
                            is_terminal = true;
                     }
                 }
             }

             if is_terminal {
                 let _ = shell.command("xdotool")
                     .args(["key", "--clearmodifiers", "ctrl+shift+v"])
                     .spawn();
             } else {
                 let _ = shell.command("xdotool")
                     .args(["key", "--clearmodifiers", "ctrl+v"])
                     .spawn();
                 // Double paste hack? keeping it consistent with previous code if it was intentional, 
                 // but previous code had double paste only in paste_content. 
                 // I'll assume single paste is correct unless user complained about missed pastes.
                 // The previous code had TWO spawn calls for ctrl+v in paste_content. 
                 // I will mimic that just in case, but usually one is enough. 
                 // Actually, looking at previous code, it spawned twice. 
                 // Let's spawn once for now, simpler is better.
             }
    });
}

#[tauri::command]
pub fn get_app_path() -> String {
    if let Ok(app_image) = std::env::var("APPIMAGE") {
        return app_image;
    }
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
    // 1. Explicit Unminimize (Vital for Linux)
    // Ensures window isn't in a hidden state internally by the WM
    let _ = window.unminimize();

    // 2. Force AlwaysOnTop logic
    let _ = window.set_always_on_top(true);
    
    // 3. Calculate and Set Position BEFORE showing
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

    // 4. Show Window
    let _ = window.show();

    // 5. Force Focus immediately
    let _ = window.set_focus();

    // NUCLEAR OPTION: xdotool
    // Force WM to activate window using xdotool
    let shell = window.app_handle().shell();
    let _ = shell.command("xdotool")
        .args(["search", "--name", "Linux Clipboard", "windowactivate"])
        .spawn();

    // EMIT FORCE FOCUS EVENT (Immediate)
    let _ = window.emit("force-focus", ());

    // 6. Aggressive Focus Strategy (Async "Reinforcement")
    // Schedule a second attempt after 100ms to catch up with WM animations/composition
    let win_clone = window.clone();
    
    tauri::async_runtime::spawn(async move {
        std::thread::sleep(std::time::Duration::from_millis(100));
        let _ = win_clone.set_focus();
        
        let shell = win_clone.app_handle().shell();
        let _ = shell.command("xdotool")
            .args(["search", "--name", "Linux Clipboard", "windowactivate"])
            .spawn();

        // EMIT FORCE FOCUS EVENT (Delayed)
        let _ = win_clone.emit("force-focus", ());
    });
}
