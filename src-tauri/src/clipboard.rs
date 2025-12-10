use tauri::{AppHandle, Manager, Emitter};
use std::thread;
use std::time::Duration;
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::db::{DbState, ClipboardItem};
use uuid::Uuid;

pub fn start_watcher(app: AppHandle) {
    thread::spawn(move || {
        let mut last_text = String::new();
        // let mut last_image ...

        loop {
            // Check text
            let current_text = app.clipboard().read_text();
            
            if let Ok(text) = current_text {
                if text != last_text && !text.is_empty() {
                    last_text = text.clone();
                    
                    let item = ClipboardItem {
                        id: Uuid::new_v4().to_string(),
                        r#type: "text".to_string(),
                        content: text.clone(),
                        timestamp: chrono::Utc::now().timestamp_millis(), 
                        is_pinned: false,
                    };

                    let state = app.state::<DbState>();
                    state.add_item(item);
                    if let Err(e) = state.save() {
                        eprintln!("Failed to save db: {}", e);
                    }
                    
                    let history = state.get_history();
                    if let Err(e) = app.emit("clipboard-changed", history) {
                         eprintln!("Failed to emit event: {}", e);
                    }
                }
            }
            
            thread::sleep(Duration::from_millis(1000));
        }
    });
}
