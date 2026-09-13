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
                        thumbnail: None,
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
                     let (width, height) = (image.width(), image.height());
                     let rgba = image.rgba();
                     
                     if let Some(img_buffer) = image::RgbaImage::from_raw(width, height, rgba.to_vec()) {
                         use std::hash::{Hash, Hasher};
                         let mut hasher = std::collections::hash_map::DefaultHasher::new();
                         img_buffer.as_raw().hash(&mut hasher);
                         let current_hash = hasher.finish().to_string();

                         if current_hash != last_image {
                             last_image = current_hash;

                             let state = app.state::<DbState>();
                             let item_id = Uuid::new_v4().to_string();
                             let file_path = state.media_dir.join(format!("{}.png", item_id));

                             let dyn_img = image::DynamicImage::ImageRgba8(img_buffer);
                             let _ = dyn_img.save(&file_path);

                             let thumb = dyn_img.thumbnail(360, 200);
                             use std::io::Cursor;
                             use base64::Engine;
                             let mut thumb_bytes: Vec<u8> = Vec::new();
                             let mut cursor = Cursor::new(&mut thumb_bytes);

                             let thumb_b64 = if thumb.to_rgb8().write_to(&mut cursor, image::ImageFormat::Jpeg).is_ok() {
                                 let b64 = base64::engine::general_purpose::STANDARD.encode(&thumb_bytes);
                                 format!("data:image/jpeg;base64,{}", b64)
                             } else {
                                 thumb_bytes.clear();
                                 let mut cursor = Cursor::new(&mut thumb_bytes);
                                 let _ = thumb.write_to(&mut cursor, image::ImageFormat::Png);
                                 let b64 = base64::engine::general_purpose::STANDARD.encode(&thumb_bytes);
                                 format!("data:image/png;base64,{}", b64)
                             };

                             let item = ClipboardItem {
                                id: item_id,
                                r#type: "image".to_string(),
                                content: file_path.to_string_lossy().to_string(),
                                thumbnail: Some(thumb_b64),
                                timestamp: chrono::Utc::now().timestamp_millis(),
                                is_pinned: false,
                             };

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
                },
                Err(_) => {} // No image or error reading
            }
            
            thread::sleep(Duration::from_millis(1000));
        }
    });
}
