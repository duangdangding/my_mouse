import ctypes
from ctypes import wintypes
import os
from pathlib import Path
import subprocess
import time
from PIL import ImageGrab

ROOT = Path(__file__).resolve().parents[1]
EXE = ROOT / "src-tauri" / "target" / "debug" / "mouse-glow.exe"
OUTPUT = ROOT / ".validation"
OUTPUT.mkdir(exist_ok=True)
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

EnumWindowsProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

def windows_named(title):
    found = []
    def callback(hwnd, _):
        length = user32.GetWindowTextLengthW(hwnd)
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, length + 1)
        if buffer.value == title:
            found.append(hwnd)
        return True
    user32.EnumWindows(EnumWindowsProc(callback), 0)
    return found

def wait_window(title, visible=True, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        for hwnd in windows_named(title):
            if not visible or user32.IsWindowVisible(hwnd):
                return hwnd
        time.sleep(0.2)
    return 0

def stop(process):
    if process.poll() is None:
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True)
    process.wait(timeout=10)

def normal_launch():
    process = subprocess.Popen([str(EXE)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        main = wait_window("鼠标流光")
        overlay = wait_window("鼠标流光覆盖层")
        if not main or not overlay or process.poll() is not None:
            raise RuntimeError("正常启动后未找到可见主窗口或覆盖层")
        user32.SetForegroundWindow(main)
        time.sleep(1)
        rect = wintypes.RECT()
        user32.GetWindowRect(main, ctypes.byref(rect))
        image = ImageGrab.grab(bbox=(rect.left, rect.top, rect.right, rect.bottom), all_screens=True)
        image.save(OUTPUT / "settings.png")
        for index in range(32):
            user32.SetCursorPos(rect.left + 520 + index * 11, rect.top + 270 + (index % 8) * 4)
            time.sleep(0.012)
        user32.mouse_event(0x0002, 0, 0, 0, 0)
        user32.mouse_event(0x0004, 0, 0, 0, 0)
        time.sleep(0.04)
        effects = ImageGrab.grab(bbox=(rect.left, rect.top, rect.right, rect.bottom), all_screens=True)
        effects.save(OUTPUT / "effects.png")
        extended_style = user32.GetWindowLongW(overlay, -20)
        click_through = bool(extended_style & 0x20)
        if not click_through:
            raise RuntimeError("覆盖层未设置鼠标穿透")
        print(f"正常启动：通过；主窗口和覆盖层可见；覆盖层穿透：{click_through}")
    finally:
        stop(process)

def silent_launch():
    process = subprocess.Popen([str(EXE), "--silent"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        overlay = wait_window("鼠标流光覆盖层")
        time.sleep(2)
        visible_main = any(user32.IsWindowVisible(hwnd) for hwnd in windows_named("鼠标流光"))
        if not overlay or visible_main or process.poll() is not None:
            raise RuntimeError("静默启动状态不符合预期")
        print("静默启动：通过；覆盖层运行，设置窗口保持隐藏")
    finally:
        stop(process)

normal_launch()
silent_launch()
print(f"验证截图：{OUTPUT / 'settings.png'}")
