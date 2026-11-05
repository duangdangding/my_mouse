# AGENTS.md

## 项目约定

- 本项目是 Windows／macOS 本地鼠标特效工具，使用 Tauri 2、Vanilla TypeScript 和 Rust，主包管理器为 npm。
- 注释、界面文案和 Release notes 使用中文；前端不随意引入 UI 框架。
- 设置窗口与 `overlay` 特效覆盖层保持分离。覆盖层必须鼠标穿透、不抢焦点，不能截获用户输入。
- 鼠标回调只做必要的数据记录；新增绘制逻辑不得引入逐帧对象分配、实时阴影或无空闲停止的永久动画循环。
- Windows 使用低级鼠标钩子；macOS 使用只读 `CGEventTap`，需要输入监控权限，不得拦截事件。
- macOS 登录启动项使用 `~/Library/LaunchAgents/com.mouseglow.desktop.plist`，修改后下一次登录生效。
- 新预设字段需同步更新 TypeScript 类型、Rust 配置、默认值、边界校验和 README。
- 配置保存在 Windows 的 `%LOCALAPPDATA%/MouseGlow/`，macOS 的 `~/Library/Application Support/com.mouseglow.desktop/`，不得上传鼠标轨迹或点击数据。

## 提交前检查

```bash
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
npm run release:check
```

桌面交互改动需要对应系统的真机验证，网页预览和 Windows 构建不能替代 macOS 事件监听、权限、覆盖层和启动项验收。

不得在本地生成 Windows 安装包；安装包只由 GitHub Actions 标签发版构建。本地允许前端构建、Rust 测试、Clippy、`cargo check` 和不带 bundle 的桌面调试构建。

发布工作流分别构建 Windows x64、macOS Apple Silicon 和 macOS Intel，再合并同一份 `latest.json`。三平台产物和签名必须齐全才能创建 Release。macOS 当前为未签名、未公证发行，Release notes 必须保留这一说明。

不得提交私钥、密码、token、用户配置、日志、`node_modules/`、`dist/`、`target/` 或 `.mouse-glow/`。更新密钥必须为本项目独立密钥，不得复用其他项目。
