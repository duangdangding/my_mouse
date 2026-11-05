mod autostart;
mod config;
mod input;

use config::{AppConfig, ConfigStore};
use serde::Serialize;
use std::sync::RwLock;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WindowEvent,
};

struct SharedConfig {
    value: RwLock<AppConfig>,
    store: ConfigStore,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[tauri::command]
fn get_config(state: State<'_, SharedConfig>) -> Result<AppConfig, String> {
    state
        .value
        .read()
        .map(|config| config.clone())
        .map_err(|_| "无法读取设置".to_string())
}

#[tauri::command]
fn save_config(
    app: AppHandle,
    state: State<'_, SharedConfig>,
    mut config: AppConfig,
) -> Result<AppConfig, String> {
    config.normalize();
    autostart::apply(&config)?;
    state.store.save(&config)?;
    input::update_config(&config);
    {
        let mut current = state
            .value
            .write()
            .map_err(|_| "无法更新设置".to_string())?;
        *current = config.clone();
    }
    let _ = app.emit("config-changed", &config);
    Ok(config)
}

#[tauri::command]
fn show_settings(app: AppHandle) -> Result<(), String> {
    show_main(&app);
    Ok(())
}

#[tauri::command]
fn sync_overlay_bounds(app: AppHandle) -> Result<ScreenBounds, String> {
    let bounds = virtual_screen_bounds();
    let overlay = app
        .get_webview_window("overlay")
        .ok_or_else(|| "找不到特效覆盖层".to_string())?;
    overlay
        .set_position(PhysicalPosition::new(bounds.x, bounds.y))
        .map_err(|error| format!("无法设置覆盖层位置：{error}"))?;
    overlay
        .set_size(PhysicalSize::new(bounds.width, bounds.height))
        .map_err(|error| format!("无法设置覆盖层尺寸：{error}"))?;
    overlay
        .set_ignore_cursor_events(true)
        .map_err(|error| format!("无法设置鼠标穿透：{error}"))?;
    overlay
        .show()
        .map_err(|error| format!("无法显示特效覆盖层：{error}"))?;
    let _ = app.emit("overlay-bounds", bounds);
    Ok(bounds)
}

#[cfg(windows)]
fn virtual_screen_bounds() -> ScreenBounds {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN,
    };
    unsafe {
        ScreenBounds {
            x: GetSystemMetrics(SM_XVIRTUALSCREEN),
            y: GetSystemMetrics(SM_YVIRTUALSCREEN),
            width: GetSystemMetrics(SM_CXVIRTUALSCREEN).max(1) as u32,
            height: GetSystemMetrics(SM_CYVIRTUALSCREEN).max(1) as u32,
        }
    }
}

#[cfg(not(windows))]
fn virtual_screen_bounds() -> ScreenBounds {
    ScreenBounds {
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
    }
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn quit(app: &AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.destroy();
    }
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let store = ConfigStore::new().unwrap_or_else(|error| panic!("{error}"));
    let config = store.load();
    input::update_config(&config);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _working_directory| {
            show_main(app);
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(SharedConfig {
            value: RwLock::new(config),
            store,
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            show_settings,
            sync_overlay_bounds
        ])
        .setup(|app| {
            let show = MenuItemBuilder::with_id("show", "打开设置").build(app)?;
            let exit = MenuItemBuilder::with_id("exit", "退出鼠标流光").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show, &exit]).build()?;
            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("鼠标流光 · 右键打开菜单")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_main(app),
                    "exit" => quit(app),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            let handle = app.handle().clone();
            input::start(handle.clone());
            if let Err(error) = sync_overlay_bounds(handle) {
                eprintln!("覆盖层初始化失败：{error}");
            }
            let silent = std::env::args().any(|argument| argument == "--silent");
            if !silent {
                show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("鼠标流光启动失败");
}
