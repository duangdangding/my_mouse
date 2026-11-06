# 鼠标流光（Mouse Glow）

基于 **Tauri 2 + 原生 TypeScript + Rust** 的 Windows／macOS 鼠标拖尾与点击特效工具。设置窗口和透明特效覆盖层相互独立，覆盖层鼠标穿透、不抢占焦点，并支持多显示器虚拟桌面。

## 功能

- 6 组拖尾预设：圆形光点、旋转飘落的花瓣、沿移动方向展开的流动缎带、四芒星火、带节点的量子电路光轨和漂浮秘法符文；形状、宽度、存续时间、辉光强度、粒子间距、颜色、扩散及旋转速度均可调整。
- 6 组点击预设：扩散圆环、五角星芒、漂浮萤火、棱镜碎片、六边形矩阵脉冲和带六芒星及符文刻度的旋转魔法阵；形状、扩散范围、持续时间、辉光强度、元素数量、颜色，以及左／右／中键独立开关均可调整。
- 拖尾与点击均可使用爱心、雪花、菱形、最多 4 个字符／Emoji，或导入本地 SVG／PNG／WebP 作为粒子图案；图片可保留原色或随预设渐变色染色。
- 点击自定义图片可开启“单个图案显示”，在点击位置完整显示一张魔法阵等图案，并调整图案大小、持续时间、辉光、旋转速度和淡出曲线；旋转速度默认为 0.8 rad/s，设为 0 时静止，负值反向旋转，关闭单图后恢复多粒子散开效果。
- 支持大小随机、重力、漂浮幅度和淡出曲线；拖尾可选择是否跟随鼠标移动方向。图片最大 512 KB、宽高最大 1024 像素，导入后保存在本机，离线可用。
- 30／45／60／90／120 FPS 限帧，预设复制、删除副本、重置和自动保存。
- 全部配置默认保存在程序目录的 `config.json`，可在通用设置中更改或恢复目录；程序目录无写入权限时回退到系统用户目录。切换目录会复制全部配置并保留旧文件，路径记录和完整备份确保软件更新后自动沿用并恢复配置。
- 托盘驻留、关闭设置窗口不退出、单实例、开机启动和静默启动。
- 接入 Tauri 签名更新，关于页可检查、下载、安装并重启。
- Windows x64、macOS Apple Silicon 和 macOS Intel 使用同一份更新清单，各自下载对应架构的更新产物。

## 低开销策略

- Windows 低级鼠标钩子和 macOS 只读 `CGEventTap` 只记录最新坐标或点击；独立线程最多按 120 Hz 合并发送，避免高回报率鼠标逐事件渲染。
- 拖尾按移动距离补点；粒子使用固定容量 TypedArray 对象池，容量分别为 1400／900。
- 辉光、字符和导入图片使用预生成贴图，不在逐帧绘制中创建渐变、解析 SVG、绘制文字、解码图片或使用实时阴影。
- SVG 导入时移除脚本、事件属性、外部资源及主动内容；图片仅在导入时读取和校验，运行过程不请求网络。
- 只有存在存活粒子时才运行 `requestAnimationFrame`，空闲时停止绘制。
- 参数在后端再次限制范围，避免异常配置导致过度分配或超高帧率。

## macOS 使用

分别提供 Apple Silicon（`aarch64`）和 Intel（`x64`）DMG。首次使用时，在“系统设置 → 隐私与安全性 → 输入监控”中允许鼠标流光监听鼠标事件，然后重新打开应用；也可在通用设置中检查权限并打开设置页。事件监听为只读，不会拦截或修改鼠标输入。

当前 macOS 版本未购买 Apple Developer 签名，也未经过 Apple 公证。首次打开如被 Gatekeeper 拦截，可在 Finder 中右键应用选择“打开”并按系统提示确认；如仍被拦截，在“系统设置 → 隐私与安全性”中允许打开。更新包仍使用项目独立的 Tauri 更新签名。

开机启动通过 `~/Library/LaunchAgents/com.mouseglow.desktop.plist` 配置，启用后下一次登录生效，静默启动会向程序传入 `--silent`。

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

桌面端默认将完整配置写入程序所在目录的 `config.json`，可在“通用设置 → 配置文件”中打开所在目录、选择其他目录或恢复默认。程序目录无写入权限时，Windows 回退到 `%LOCALAPPDATA%/MouseGlow/config.json`，macOS 回退到 `~/Library/Application Support/MouseGlow/config.json`。用户目录中的 `config-location` 记录自定义路径，`config-backup.json` 保存完整备份；更新后启动时会自动沿用原路径，主配置缺失或损坏时从备份恢复。网页预览的配置仅保存在浏览器 `localStorage`，不支持全局鼠标监听、托盘和软件更新。

## 发布与更新

安装包只通过 GitHub Actions 标签发版构建，不在本地生成 Windows 安装包。发布前同步 `package.json`、`package-lock.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 的版本号，然后运行：

```bash
npm run build
npm test
npm run clippy
npm run release:check -- v0.2.0
```

推送 `v*` 标签后，工作流分别构建：

- Windows x64：NSIS 安装包，以及可直接更新的安装包或 `.nsis.zip`。
- macOS Apple Silicon：DMG、`.app.tar.gz` 更新包和签名。
- macOS Intel：DMG、`.app.tar.gz` 更新包和签名。

三个构建任务先上传产物，最后的发布任务合并 `latest.json`，再统一创建 GitHub Release；缺少任一平台或其签名时不会发布。仓库需要配置：

- `TAURI_SIGNING_PRIVATE_KEY`：本项目独立 minisign 私钥。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：私钥密码；当前本地生成的密钥为空密码时留空。

更新公钥仅写入 `src-tauri/tauri.conf.json`，endpoint 为 `duangdangding/my_mouse` 的 `latest.json`。本地私钥位于已忽略的 `.mouse-glow/updater/`，不得提交、打印或复用其他项目的密钥。若发布仓库地址改变，必须同步修改 endpoint 和 `scripts/update-manifest.mjs`。

## 验收说明

网页预览只用于检查设置界面和渲染参数，不能替代桌面验收。全局输入监听、鼠标穿透、多显示器、托盘、开机启动和更新需要在 Windows 与 macOS 桌面应用中分别验证。Windows 构建通过不代表 macOS 分支已编译或运行通过。
