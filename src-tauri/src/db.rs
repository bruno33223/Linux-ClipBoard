use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardItem {
    pub id: String,
    pub r#type: String, // "text" or "image"
    pub content: String,
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
            language: None,
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
}

impl DbState {
    pub fn new(app: &AppHandle) -> Self {
        let path = app.path().app_config_dir().expect("failed to get app config dir").join("db.json");
        let db = if path.exists() {
            let content = fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Database::default()
        };
        Self {
            db: Mutex::new(db),
            path,
        }
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
            db.history.truncate(100);
        }
    }

    pub fn delete_item(&self, id: &str) {
        let mut db = self.db.lock().unwrap();
        if let Some(index) = db.history.iter().position(|x| x.id == id) {
            db.history.remove(index);
        }
    }

    pub fn clear_all(&self) {
        let mut db = self.db.lock().unwrap();
        db.history.retain(|x| x.is_pinned);
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
