# 鼠标流光（Mouse Glow）

基于 **Tauri 2 + 原生 TypeScript + Rust** 的 Windows 鼠标拖尾与点击特效工具。设置窗口和透明特效覆盖层相互独立，覆盖层鼠标穿透、不抢占焦点，并支持多显示器虚拟桌面。

## 功能

- 4 组拖尾预设：宽度、存续时间、辉光强度、粒子间距、起始／结束颜色、扩散速度、旋转速度均可调整。
- 4 组点击预设：扩散范围、持续时间、辉光强度、元素数量、主题色、消散颜色，以及左／右／中键独立开关。
- 30／45／60／90／120 FPS 限帧，预设复制、重置和自动保存。
- 托盘驻留、关闭设置窗口不退出、单实例、开机启动和静默启动。
- 接入 Tauri 签名更新，关于页可检查、下载、安装并重启。

## 低开销策略

- Windows 低级鼠标钩子只保存最新坐标；独立线程最多按 120 Hz 合并发送，避免高回报率鼠标逐事件渲染。
- 拖尾按移动距离补点；粒子使用固定容量 TypedArray 对象池，容量分别为 1400／900。
- 辉光使用预生成贴图，不在逐帧绘制中创建渐变或使用实时阴影。
- 只有存在存活粒子时才运行 `requestAnimationFrame`，空闲时停止绘制。
- 参数在后端再次限制范围，避免异常配置导致过度分配或超高帧率。

## 开发

```bash
npm install
npm run dev                 # 网页预览
npm run build               # TypeScript + Vite
npm run tauri dev           # 完整桌面应用
npm test                    # Rust 配置测试
npm run clippy              # Rust 严格检查
```

桌面调试构建（不生成安装包）：

```bash
npm run tauri build -- --debug --no-bundle
```

配置保存在 `%LOCALAPPDATA%/MouseGlow/config.json`。网页预览的配置仅保存在浏览器 `localStorage`，不支持全局鼠标钩子、托盘和软件更新。

## 发布与更新

Windows 安装包只通过 GitHub Actions 标签发版构建，不在本地生成。发布前同步 `package.json`、`package-lock.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 的版本号，然后运行：

```bash
npm run build
npm test
npm run clippy
npm run release:check -- v0.1.0
```

推送 `v*` 标签后，工作流会构建 NSIS 安装包、更新压缩包、签名和 `latest.json`。仓库需要配置：

- `TAURI_SIGNING_PRIVATE_KEY`：本项目独立 minisign 私钥。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：私钥密码；当前本地生成的密钥为空密码时留空。

更新公钥仅写入 `src-tauri/tauri.conf.json`，endpoint 为 `duangdangding/my_mouse` 的 `latest.json`。本地私钥位于已忽略的 `.mouse-glow/updater/`，不得提交、打印或复用其他项目的密钥。若发布仓库地址改变，必须同步修改 endpoint。

## 验收说明

网页预览只用于检查设置界面和渲染参数，不能替代桌面验收。全局钩子、鼠标穿透、多显示器、托盘、开机启动和更新需要在 Windows 桌面应用中验证。
