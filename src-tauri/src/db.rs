use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardItem {
    pub id: String,
    pub r#type: String, // "text" or "image"
    pub content: String,
    #[serde(default)]
    pub thumbnail: Option<String>,
    pub timestamp: i64,
    pub is_pinned: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub position: String,
    pub grouping: String,
    pub zoom: i32,
    pub theme: String,
    pub language: Option<String>,
    #[serde(default)]
    pub use_internal_shortcut: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            position: "cursor".to_string(),
            grouping: "categorized".to_string(),
            zoom: 100,
            theme: "dark".to_string(),
            language: Some("en".to_string()),
            use_internal_shortcut: false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Database {
    pub history: Vec<ClipboardItem>,
    pub settings: Settings,
}

pub struct DbState {
    pub db: Mutex<Database>,
    pub path: PathBuf,
    pub media_dir: PathBuf,
}

impl DbState {
    pub fn new(app: &AppHandle) -> Self {
        let app_config = app.path().app_config_dir().expect("failed to get app config dir");
        let path = app_config.join("db.json");
        let media_dir = app_config.join("media");
        let _ = fs::create_dir_all(&media_dir);

        let mut db: Database = if path.exists() {
            let content = fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Database::default()
        };
        if db.settings.language.is_none() {
            db.settings.language = Some("en".to_string());
        }

        // Automatic migration: offload heavy base64 images from db.json into media files & thumbnails,
        // and sanitize image paths so they are always referenced against current media_dir
        let mut needs_save = false;
        for item in &mut db.history {
            if item.r#type == "image" {
                // Check if path is pointing to an old snap revision directory or needs re-anchoring
                if !item.content.starts_with("data:image") && item.content.len() < 1000 {
                    if let Some(file_name) = Path::new(&item.content).file_name() {
                        let current_path = media_dir.join(file_name);
                        if current_path.exists() && item.content != current_path.to_string_lossy().as_ref() {
                            item.content = current_path.to_string_lossy().to_string();
                            needs_save = true;
                        }
                    }
                }

                if item.thumbnail.is_none() || item.content.starts_with("data:image") || item.content.len() > 1000 {
                    let b64_clean = if let Some(idx) = item.content.find(',') {
                        &item.content[idx+1..]
                    } else {
                        &item.content
                    };

                    use base64::Engine;
                    if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64_clean) {
                        let file_path = media_dir.join(format!("{}.png", item.id));
                        let _ = fs::write(&file_path, &bytes);

                        if let Ok(img) = image::load_from_memory(&bytes) {
                            let thumb = img.thumbnail(360, 200);
                            let mut thumb_bytes = Vec::new();
                            let mut cursor = std::io::Cursor::new(&mut thumb_bytes);
                            if thumb.to_rgb8().write_to(&mut cursor, image::ImageFormat::Jpeg).is_ok() {
                                let b64 = base64::engine::general_purpose::STANDARD.encode(&thumb_bytes);
                                item.thumbnail = Some(format!("data:image/jpeg;base64,{}", b64));
                            } else {
                                thumb_bytes.clear();
                                let mut cursor = std::io::Cursor::new(&mut thumb_bytes);
                                let _ = thumb.write_to(&mut cursor, image::ImageFormat::Png);
                                let b64 = base64::engine::general_purpose::STANDARD.encode(&thumb_bytes);
                                item.thumbnail = Some(format!("data:image/png;base64,{}", b64));
                            }
                        }

                        item.content = file_path.to_string_lossy().to_string();
                        needs_save = true;
                    }
                }
            }
        }

        let state = Self {
            db: Mutex::new(db),
            path,
            media_dir,
        };

        if needs_save {
            let _ = state.save();
        }

        state
    }

    pub fn save(&self) -> Result<(), String> {
        let db = self.db.lock().map_err(|_| "Failed to lock db")?;
        let content = serde_json::to_string_pretty(&*db).map_err(|e| e.to_string())?;
        
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        
        fs::write(&self.path, content).map_err(|e| e.to_string())?;
        Ok(())
    }
    
    pub fn get_history(&self) -> Vec<ClipboardItem> {
        let db = self.db.lock().unwrap();
        db.history.clone()
    }
    
    pub fn add_item(&self, item: ClipboardItem) {
        let mut db = self.db.lock().unwrap();
        // Dedup
        if let Some(first) = db.history.first() {
            if first.content == item.content && first.r#type == item.r#type {
                return;
            }
        }
        db.history.insert(0, item);
        if db.history.len() > 100 {
            let removed = db.history.split_off(100);
            for r in removed {
                if r.r#type == "image" {
                    if let Some(file_name) = Path::new(&r.content).file_name() {
                        let _ = fs::remove_file(self.media_dir.join(file_name));
                    }
                }
            }
        }
    }

    pub fn delete_item(&self, id: &str) {
        let mut db = self.db.lock().unwrap();
        if let Some(index) = db.history.iter().position(|x| x.id == id) {
            let item = db.history.remove(index);
            if item.r#type == "image" {
                if let Some(file_name) = Path::new(&item.content).file_name() {
                    let _ = fs::remove_file(self.media_dir.join(file_name));
                }
            }
        }
    }

    pub fn clear_all(&self) {
        let mut db = self.db.lock().unwrap();
        db.history.retain(|x| {
            if !x.is_pinned {
                if x.r#type == "image" {
                    if let Some(file_name) = Path::new(&x.content).file_name() {
                        let _ = fs::remove_file(self.media_dir.join(file_name));
                    }
                }
                false
            } else {
                true
            }
        });
    }
    
    pub fn toggle_pin(&self, id: &str) {
         let mut db = self.db.lock().unwrap();
         if let Some(item) = db.history.iter_mut().find(|x| x.id == id) {
             item.is_pinned = !item.is_pinned;
         }
    }

    pub fn get_settings(&self) -> Settings {
        let db = self.db.lock().unwrap();
        db.settings.clone()
    }

    pub fn update_setting(&self, key: String, value: serde_json::Value) {
        let mut db = self.db.lock().unwrap();
        // Use serde_json to update generic value if possible, or match key
        match key.as_str() {
            "zoom" => {
                if let Some(v) = value.as_i64() {
                    db.settings.zoom = v as i32;
                }
            }
            "position" => {
                if let Some(v) = value.as_str() {
                    db.settings.position = v.to_string();
                }
            }
            "grouping" => {
                if let Some(v) = value.as_str() {
                    db.settings.grouping = v.to_string();
                }
            }
            "theme" => {
                if let Some(v) = value.as_str() {
                    db.settings.theme = v.to_string();
                }
            }
            "language" => {
                if let Some(v) = value.as_str() {
                    db.settings.language = Some(v.to_string());
                } else if value.is_null() {
                    db.settings.language = None;
                }
            }

            "useInternalShortcut" => {
                 if let Some(v) = value.as_bool() {
                     db.settings.use_internal_shortcut = v;
                 }
            }
            _ => {}
        }
    }

    pub fn reorder_items(&self, active_id: &str, over_id: &str) {
        let mut db = self.db.lock().unwrap();
        let old_index = db.history.iter().position(|r| r.id == active_id);
        let new_index = db.history.iter().position(|r| r.id == over_id);

        if let (Some(old), Some(new)) = (old_index, new_index) {
            let item = db.history.remove(old);
            db.history.insert(new, item);
        }
    }
}
