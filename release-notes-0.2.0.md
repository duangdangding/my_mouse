# 鼠标流光 0.2.0

## 新增

- 新增 macOS 版本，分别提供 Apple Silicon（`aarch64`）和 Intel（`x86_64`）安装包。
- macOS 使用只读事件监听实现全局拖尾和左／右／中键点击特效，不拦截鼠标输入。
- Windows 与 macOS 均支持开机启动、静默启动和签名更新。
- macOS 支持多显示器边界、跨桌面显示，以及输入监控权限检查和设置入口。

## 下载

- Windows：`MouseGlow_0.2.0_x64-setup.exe`
- Apple Silicon macOS：下载名称包含 `aarch64` 的 DMG。
- Intel macOS：下载名称包含 `x64` 的 DMG。

## macOS 使用说明

首次使用时，请在“系统设置 → 隐私与安全性 → 输入监控”中允许鼠标流光监听鼠标事件，然后重新打开应用。也可以在应用的通用设置中检查权限并打开对应设置页。

本次 macOS 版本未购买 Apple Developer 签名，也未经过 Apple 公证。首次打开如被 Gatekeeper 拦截，请在 Finder 中右键应用并选择“打开”，按系统提示确认；如仍被拦截，请在“系统设置 → 隐私与安全性”中允许打开。更新包仍使用本项目独立的 Tauri 更新签名验证。

macOS 的全局输入监听、覆盖层、多显示器和登录启动仍需在对应设备上验收。
