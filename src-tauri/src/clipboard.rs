use tauri::{AppHandle, Manager, Emitter};
use std::thread;
use std::time::Duration;
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::db::{DbState, ClipboardItem};
use uuid::Uuid;

pub fn start_watcher(app: AppHandle) {
    thread::spawn(move || {
        let mut last_text = String::new();
        let mut last_image = String::new();

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

            // Check image
            match app.clipboard().read_image() {
                Ok(image) => {
                     // Convert to base64
                     // image is tauri::image::Image
                     let (width, height) = (image.width(), image.height());
                     let rgba = image.rgba();
                     
                     if let Some(img_buffer) = image::RgbaImage::from_raw(width, height, rgba.to_vec()) {
                         use std::io::Cursor;
                         let mut bytes: Vec<u8> = Vec::new();
                         let mut cursor = Cursor::new(&mut bytes);
                         
                         if let Ok(_) = img_buffer.write_to(&mut cursor, image::ImageFormat::Png) {
                             use base64::Engine;
                             let base64_image = base64::engine::general_purpose::STANDARD.encode(&bytes);
                             
                             if base64_image != last_image && !base64_image.is_empty() {
                                 last_image = base64_image.clone();

                                 let item = ClipboardItem {
                                    id: Uuid::new_v4().to_string(),
                                    r#type: "image".to_string(),
                                    content: base64_image,
                                    timestamp: chrono::Utc::now().timestamp_millis(),
                                    is_pinned: false,
                                 };

                                 let state = app.state::<DbState>();
                                 state.add_item(item);
                                 if let Err(e) = state.save() {
                                     eprintln!("Failed to save db (image): {}", e);
                                 }

                                 let history = state.get_history();
                                 if let Err(e) = app.emit("clipboard-changed", history) {
                                     eprintln!("Failed to emit event (image): {}", e);
                                 }
                             }
                         }
                     }
                },
                Err(_) => {} // No image or error reading
            }
            
            thread::sleep(Duration::from_millis(1000));
        }
    });
}
