use crate::config::AppConfig;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::AppHandle;

static MOVE_ENABLED: AtomicBool = AtomicBool::new(true);
static CLICK_ENABLED: AtomicBool = AtomicBool::new(true);

pub fn update_config(config: &AppConfig) {
    MOVE_ENABLED.store(config.master_enabled && config.trail_enabled, Ordering::Release);
    CLICK_ENABLED.store(config.master_enabled && config.click_enabled, Ordering::Release);
}

#[cfg(any(windows, target_os = "macos"))]
mod common {
    use super::*;
    use serde::Serialize;
    use std::{
        sync::{
            atomic::{AtomicI32, AtomicU64},
            Condvar, Mutex,
        },
        thread,
        time::{Duration, Instant},
    };
    use tauri::Emitter;

    #[derive(Clone, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ClickEvent {
        x: i32,
        y: i32,
        button: &'static str,
    }

    #[derive(Clone, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct InputFrame {
        x: i32,
        y: i32,
        clicks: Vec<ClickEvent>,
    }

    static X: AtomicI32 = AtomicI32::new(0);
    static Y: AtomicI32 = AtomicI32::new(0);
    static SEQUENCE: AtomicU64 = AtomicU64::new(0);
    static CLICKS: Mutex<Vec<ClickEvent>> = Mutex::new(Vec::new());
    static SIGNAL_LOCK: Mutex<()> = Mutex::new(());
    static SIGNAL: Condvar = Condvar::new();

    pub fn record_move(x: i32, y: i32) {
        if !MOVE_ENABLED.load(Ordering::Acquire) {
            return;
        }
        X.store(x, Ordering::Relaxed);
        Y.store(y, Ordering::Relaxed);
        SEQUENCE.fetch_add(1, Ordering::Release);
        SIGNAL.notify_one();
    }

    pub fn record_click(x: i32, y: i32, button: &'static str) {
        if !CLICK_ENABLED.load(Ordering::Acquire) {
            return;
        }
        let mut clicks = CLICKS.lock().unwrap_or_else(|error| error.into_inner());
        if clicks.len() < 32 {
            clicks.push(ClickEvent { x, y, button });
        }
        drop(clicks);
        SIGNAL.notify_one();
    }

    pub fn spawn_emitter(app: AppHandle) {
        thread::spawn(move || emit_loop(app));
    }

    fn emit_loop(app: AppHandle) {
        const FRAME_INTERVAL: Duration = Duration::from_millis(8);
        let mut last_sequence = SEQUENCE.load(Ordering::Acquire);
        let mut last_emit = Instant::now() - FRAME_INTERVAL;
        loop {
            let mut guard = SIGNAL_LOCK.lock().unwrap_or_else(|error| error.into_inner());
            if SEQUENCE.load(Ordering::Acquire) == last_sequence && CLICKS.lock().unwrap().is_empty() {
                guard = SIGNAL.wait(guard).unwrap_or_else(|error| error.into_inner());
            }
            let remaining = FRAME_INTERVAL.saturating_sub(last_emit.elapsed());
            if !remaining.is_zero() {
                let (next_guard, _) = SIGNAL
                    .wait_timeout(guard, remaining)
                    .unwrap_or_else(|error| error.into_inner());
                guard = next_guard;
            }
            drop(guard);

            let sequence = SEQUENCE.load(Ordering::Acquire);
            let mut clicks = CLICKS.lock().unwrap_or_else(|error| error.into_inner());
            let pending_clicks = std::mem::take(&mut *clicks);
            drop(clicks);
            let moved = sequence != last_sequence;
            if !moved && pending_clicks.is_empty() {
                continue;
            }
            last_sequence = sequence;
            last_emit = Instant::now();
            let frame = InputFrame {
                x: X.load(Ordering::Relaxed),
                y: Y.load(Ordering::Relaxed),
                clicks: pending_clicks,
            };
            let _ = app.emit_to("overlay", "mouse-input", frame);
        }
    }
}

#[cfg(windows)]
mod platform {
    use super::*;
    use std::thread;
    use windows::Win32::{
        Foundation::{HMODULE, LPARAM, LRESULT, WPARAM},
        UI::WindowsAndMessaging::{
            CallNextHookEx, GetMessageW, SetWindowsHookExW, MSLLHOOKSTRUCT, MSG, WH_MOUSE_LL,
            WM_LBUTTONDOWN, WM_MBUTTONDOWN, WM_MOUSEMOVE, WM_RBUTTONDOWN,
        },
    };

    pub fn start(app: AppHandle) {
        super::common::spawn_emitter(app);
        thread::spawn(|| unsafe {
            let hook = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_hook), HMODULE::default(), 0)
                .expect("无法安装全局鼠标钩子");
            let mut message = MSG::default();
            while GetMessageW(&mut message, None, 0, 0).into() {}
            let _ = windows::Win32::UI::WindowsAndMessaging::UnhookWindowsHookEx(hook);
        });
    }

    pub fn permission_granted() -> bool {
        true
    }

    unsafe extern "system" fn mouse_hook(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && lparam.0 != 0 {
            let data = &*(lparam.0 as *const MSLLHOOKSTRUCT);
            let message = wparam.0 as u32;
            if message == WM_MOUSEMOVE {
                super::common::record_move(data.pt.x, data.pt.y);
            } else {
                let button = match message {
                    WM_LBUTTONDOWN => Some("left"),
                    WM_RBUTTONDOWN => Some("right"),
                    WM_MBUTTONDOWN => Some("middle"),
                    _ => None,
                };
                if let Some(button) = button {
                    super::common::record_click(data.pt.x, data.pt.y, button);
                }
            }
        }
        CallNextHookEx(None, code, wparam, lparam)
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use super::*;
    use core_foundation::runloop::CFRunLoop;
    use core_graphics::event::{
        CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
        CallbackResult,
    };
    use std::thread;
    use tauri::Emitter;

    pub fn start(app: AppHandle) {
        super::common::spawn_emitter(app.clone());
        thread::spawn(move || {
            let result = CGEventTap::with_enabled(
                CGEventTapLocation::HID,
                CGEventTapPlacement::HeadInsertEventTap,
                CGEventTapOptions::ListenOnly,
                vec![
                    CGEventType::MouseMoved,
                    CGEventType::LeftMouseDragged,
                    CGEventType::RightMouseDragged,
                    CGEventType::OtherMouseDragged,
                    CGEventType::LeftMouseDown,
                    CGEventType::RightMouseDown,
                    CGEventType::OtherMouseDown,
                ],
                |_proxy, event_type, event| {
                    let location = event.location();
                    let x = location.x.round() as i32;
                    let y = location.y.round() as i32;
                    match event_type {
                        CGEventType::MouseMoved
                        | CGEventType::LeftMouseDragged
                        | CGEventType::RightMouseDragged
                        | CGEventType::OtherMouseDragged => {
                            super::common::record_move(x, y);
                        }
                        CGEventType::LeftMouseDown => {
                            super::common::record_click(x, y, "left");
                        }
                        CGEventType::RightMouseDown => {
                            super::common::record_click(x, y, "right");
                        }
                        CGEventType::OtherMouseDown => {
                            super::common::record_click(x, y, "middle");
                        }
                        _ => {}
                    }
                    CallbackResult::Keep
                },
                CFRunLoop::run_current,
            );
            if result.is_err() {
                let _ = app.emit("input-permission-required", ());
            }
        });
    }

    pub fn permission_granted() -> bool {
        CGEventTap::new(
            CGEventTapLocation::HID,
            CGEventTapPlacement::HeadInsertEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::MouseMoved],
            |_proxy, _event_type, _event| CallbackResult::Keep,
        )
        .is_ok()
    }
}

#[cfg(not(any(windows, target_os = "macos")))]
mod platform {
    use super::*;

    pub fn start(_app: AppHandle) {}

    pub fn permission_granted() -> bool {
        true
    }
}

pub use platform::{permission_granted, start};
