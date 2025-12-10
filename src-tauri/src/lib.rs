use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    image::Image, // IMPORTANTE: Adicionado para carregar o ícone manualmente
};
use tauri_plugin_global_shortcut::{ShortcutState, Shortcut, GlobalShortcutExt};
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
                let _ = window.hide();
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
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
            
            let state = DbState::new(app.handle());
            app.manage(state);
            
            clipboard::start_watcher(app.handle().clone());
            
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Clipboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let shortcut_str = if cfg!(target_os = "macos") { "Command+Shift+V" } else { "Super+V" };

            // PROTEÇÃO 1: Registro de atalho seguro (sem unwrap)
            if let Ok(shortcut) = shortcut_str.parse::<Shortcut>() {
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
                
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    log::error!("Erro ao registrar atalho global: {}", e);
                }
            } else {
                log::error!("Formato de atalho inválido: {}", shortcut_str);
            }

            // PROTEÇÃO 2: Carregamento do Ícone Embutido (Resolve o crash e o ícone quebrado)
            // Carrega os bytes do PNG em tempo de compilação
            let icon_bytes = include_bytes!("../icons/icon.png");
            // Decodifica a imagem usando a crate 'image'
            let icon_img = image::load_from_memory(icon_bytes).expect("Falha ao decodificar ícone embutido");
            let (width, height) = (icon_img.width(), icon_img.height());
            let rgba_bytes = icon_img.into_rgba8().into_vec();

            let icon = Image::new_owned(rgba_bytes, width, height);

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(icon) // Usa o ícone carregado da memória
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => app.exit(0),
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                 commands::show_window(win);
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
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