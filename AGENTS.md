# AGENTS.md

## 项目约定

- 本项目是 Windows 本地鼠标特效工具，使用 Tauri 2、Vanilla TypeScript 和 Rust，主包管理器为 npm。
- 注释、界面文案和 Release notes 使用中文；前端不随意引入 UI 框架。
- 设置窗口与 `overlay` 特效覆盖层保持分离。覆盖层必须鼠标穿透、不抢焦点，不能截获用户输入。
- 鼠标钩子回调只做必要的数据记录；新增绘制逻辑不得引入逐帧对象分配、实时阴影或无空闲停止的永久动画循环。
- 新预设字段需同步更新 TypeScript 类型、Rust 配置、默认值、边界校验和 README。
- 配置保存在 `%LOCALAPPDATA%/MouseGlow/`，不得上传鼠标轨迹或点击数据。

## 提交前检查

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
npm run release:check
```

桌面交互改动需要真机验证，网页预览不能替代全局钩子、托盘、覆盖层和启动项验收。

不得在本地生成 Windows 安装包；安装包只由 GitHub Actions 标签发版构建。本地允许前端构建、Rust 测试、Clippy、`cargo check` 和不带 bundle 的桌面调试构建。

不得提交私钥、密码、token、用户配置、日志、`node_modules/`、`dist/`、`target/` 或 `.mouse-glow/`。更新密钥必须为本项目独立密钥，不得复用其他项目。
