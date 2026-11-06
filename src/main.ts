import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { defaultConfig, DEFAULT_CONFIG } from "./defaults";
import { EffectsRenderer } from "./renderer";
import { activeClick, activeTrail, isTauri } from "./types";
import type { AppConfig, ClickShape, EffectShape, MouseButton, TrailShape } from "./types";
import "./style.css";

type Tab = "trail" | "click" | "general" | "about";
type SaveState = "saved" | "saving" | "error";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"><span></span><i></i></div>
        <div><strong>鼠标流光</strong><small>MOUSE GLOW</small></div>
      </div>
      <nav class="nav" aria-label="设置导航">
        <button class="nav-item active" data-tab="trail"><span class="nav-icon">✦</span>拖尾效果</button>
        <button class="nav-item" data-tab="click"><span class="nav-icon">◎</span>点击效果</button>
        <button class="nav-item" data-tab="general"><span class="nav-icon">⌁</span>通用设置</button>
        <button class="nav-item" data-tab="about"><span class="nav-icon">ⓘ</span>关于与更新</button>
      </nav>
      <div class="sidebar-note">
        <span class="status-dot"></span>
        <div><strong>轻盈运行</strong><small>空闲时自动停止绘制</small></div>
      </div>
      <div class="version" id="version">版本 0.2.0</div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div><h1 id="page-title">拖尾效果</h1><p id="page-subtitle">让每一次移动，都留下恰到好处的光。</p></div>
        <div class="save-state saved" id="save-state"><span></span><b>已自动保存</b></div>
      </header>
      <div id="content" class="content"></div>
    </main>
  </div>
  <div class="toast" id="toast" role="status"></div>
`;

const content = document.querySelector<HTMLDivElement>("#content")!;
const saveState = document.querySelector<HTMLDivElement>("#save-state")!;
let config = defaultConfig();
let desktopPlatform = "web";
let activeTab: Tab = "trail";
let saveTimer = 0;
let preview: EffectsRenderer | undefined;
let previewObserver: ResizeObserver | undefined;
let previewStatsTimer = 0;
let toastTimer = 0;

const titles: Record<Tab, [string, string]> = {
  trail: ["拖尾效果", "让每一次移动，都留下恰到好处的光。"],
  click: ["点击效果", "为每一次按下，赋予清晰而轻盈的反馈。"],
  general: ["通用设置", "调整运行方式，在效果与性能之间取得平衡。"],
  about: ["关于与更新", "保持鼠标流光始终处于最新状态。"],
};

const TRAIL_SHAPE_OPTIONS = [
  ["glow", "圆形光点"],
  ["petal", "樱花花瓣"],
  ["ribbon", "流动缎带"],
  ["spark", "四芒星火"],
  ["circuit", "电路光轨"],
  ["rune", "悬浮符文"],
] as const;
const CLICK_SHAPE_OPTIONS = [
  ["ripple", "扩散圆环"],
  ["star", "五角星芒"],
  ["firefly", "漂浮萤火"],
  ["shard", "棱镜碎片"],
  ["hex", "六边形脉冲"],
  ["magic", "旋转魔法阵"],
] as const;
const TRAIL_SHAPE_LABELS: Record<TrailShape, string> = {
  glow: "圆形光点",
  petal: "樱花花瓣",
  ribbon: "流动缎带",
  spark: "四芒星火",
  circuit: "电路光轨",
  rune: "悬浮符文",
};
const CLICK_SHAPE_LABELS: Record<ClickShape, string> = {
  ripple: "扩散圆环",
  star: "五角星芒",
  firefly: "漂浮萤火",
  shard: "棱镜碎片",
  hex: "六边形脉冲",
  magic: "旋转魔法阵",
};
const SHAPE_SYMBOLS: Record<EffectShape, string> = {
  glow: "●",
  petal: "❀",
  ribbon: "≈",
  spark: "✦",
  circuit: "⌁",
  rune: "ᚱ",
  ripple: "◎",
  star: "★",
  firefly: "•",
  shard: "◆",
  hex: "⬡",
  magic: "✥",
};

function setSaveState(state: SaveState): void {
  saveState.className = `save-state ${state}`;
  saveState.querySelector("b")!.textContent = state === "saved" ? "已自动保存" : state === "saving" ? "正在保存…" : "保存失败";
}

function toast(message: string, error = false): void {
  const element = document.querySelector<HTMLDivElement>("#toast")!;
  element.textContent = message;
  element.className = `toast show${error ? " error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (element.className = "toast"), 3200);
}

async function loadConfig(): Promise<AppConfig> {
  if (isTauri) return invoke<AppConfig>("get_config");
  const saved = localStorage.getItem("mouse-glow-config");
  if (!saved) return defaultConfig();
  const parsed = JSON.parse(saved) as AppConfig;
  for (const preset of parsed.trails) {
    preset.shape ??= DEFAULT_CONFIG.trails.find((item) => item.id === preset.id)?.shape ?? "glow";
  }
  for (const preset of parsed.clicks) {
    preset.shape ??= DEFAULT_CONFIG.clicks.find((item) => item.id === preset.id)?.shape ?? "ripple";
  }
  for (const preset of DEFAULT_CONFIG.trails) {
    if (!parsed.trails.some((item) => item.id === preset.id)) parsed.trails.push(structuredClone(preset));
  }
  for (const preset of DEFAULT_CONFIG.clicks) {
    if (!parsed.clicks.some((item) => item.id === preset.id)) parsed.clicks.push(structuredClone(preset));
  }
  return parsed;
}

async function persistConfig(): Promise<void> {
  setSaveState("saving");
  try {
    if (isTauri) {
      config = await invoke<AppConfig>("save_config", { config });
    } else {
      localStorage.setItem("mouse-glow-config", JSON.stringify(config));
    }
    setSaveState("saved");
  } catch (error) {
    console.error(error);
    setSaveState("error");
    toast(`设置保存失败：${String(error)}`, true);
  }
}

function changed(scheduleRender = false): void {
  preview?.setConfig(config);
  clearTimeout(saveTimer);
  setSaveState("saving");
  saveTimer = window.setTimeout(() => void persistConfig(), 280);
  if (scheduleRender) render();
}

function make<T extends HTMLElement>(tag: string, className = "", text = ""): T {
  const element = document.createElement(tag) as T;
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function rangeControl(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  onChange: (value: number) => void,
): HTMLElement {
  const wrapper = make<HTMLDivElement>("div", "control range-control");
  const head = make<HTMLDivElement>("div", "control-label");
  head.append(make("label", "", label));
  const number = make<HTMLInputElement>("input", "number-input");
  number.type = "number";
  number.min = String(min);
  number.max = String(max);
  number.step = String(step);
  number.value = String(value);
  const suffix = make<HTMLSpanElement>("span", "unit", unit);
  const valueBox = make<HTMLDivElement>("div", "number-box");
  valueBox.append(number, suffix);
  head.append(valueBox);
  const range = make<HTMLInputElement>("input", "range-input");
  range.type = "range";
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(value);
  const update = (raw: string) => {
    const next = Math.max(min, Math.min(max, Number(raw)));
    range.value = String(next);
    number.value = String(next);
    range.style.setProperty("--range-progress", `${((next - min) / (max - min)) * 100}%`);
    onChange(next);
  };
  range.addEventListener("input", () => update(range.value));
  number.addEventListener("change", () => update(number.value));
  range.style.setProperty("--range-progress", `${((value - min) / (max - min)) * 100}%`);
  wrapper.append(head, range);
  return wrapper;
}

function colorControl(label: string, value: string, onChange: (value: string) => void): HTMLElement {
  const wrapper = make<HTMLDivElement>("div", "control inline-control");
  wrapper.append(make("label", "", label));
  const picker = make<HTMLDivElement>("div", "color-picker");
  const input = make<HTMLInputElement>("input");
  input.type = "color";
  input.value = value;
  const code = make<HTMLSpanElement>("span", "color-code", value.toUpperCase());
  input.addEventListener("input", () => {
    code.textContent = input.value.toUpperCase();
    onChange(input.value);
  });
  picker.append(input, code);
  wrapper.append(picker);
  return wrapper;
}

function selectControl<T extends string>(
  label: string,
  value: T,
  options: ReadonlyArray<readonly [T, string]>,
  onChange: (value: T) => void,
): HTMLElement {
  const wrapper = make<HTMLDivElement>("div", "control inline-control");
  wrapper.append(make("label", "", label));
  const select = make<HTMLSelectElement>("select", "shape-select");
  for (const [optionValue, optionLabel] of options) {
    const option = make<HTMLOptionElement>("option", "", optionLabel);
    option.value = optionValue;
    option.selected = optionValue === value;
    select.append(option);
  }
  select.addEventListener("change", () => onChange(select.value as T));
  wrapper.append(select);
  return wrapper;
}

function toggleControl(
  label: string,
  description: string,
  value: boolean,
  onChange: (value: boolean) => void,
): HTMLElement {
  const wrapper = make<HTMLDivElement>("div", "toggle-row");
  const copy = make<HTMLDivElement>("div", "toggle-copy");
  copy.append(make("strong", "", label), make("small", "", description));
  const switchLabel = make<HTMLLabelElement>("label", "switch");
  const input = make<HTMLInputElement>("input");
  input.type = "checkbox";
  input.checked = value;
  input.addEventListener("change", () => onChange(input.checked));
  switchLabel.append(input, make("span", "slider"));
  wrapper.append(copy, switchLabel);
  return wrapper;
}

function previewPanel(): HTMLElement {
  const panel = make<HTMLDivElement>("div", "preview-panel");
  const head = make<HTMLDivElement>("div", "panel-heading");
  const title = make<HTMLDivElement>("div");
  title.append(make("strong", "", "实时预览"), make("small", "", "移动鼠标并点击，立即感受参数变化"));
  const stats = make<HTMLDivElement>("div", "preview-stats");
  stats.innerHTML = `<span><i></i><b id="preview-fps">0</b> FPS</span><span><b id="preview-particles">0</b> 粒子</span>`;
  head.append(title, stats);
  const stage = make<HTMLDivElement>("div", "preview-stage");
  const canvas = make<HTMLCanvasElement>("canvas", "preview-canvas");
  const hint = make<HTMLDivElement>("div", "preview-hint", "在此移动鼠标 · 点击试试");
  stage.append(canvas, hint);
  panel.append(head, stage);
  window.setTimeout(() => {
    preview?.clear();
    preview = new EffectsRenderer(canvas, config);
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const ratio = Math.min(2, devicePixelRatio || 1);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      preview?.resize(rect.width * ratio, rect.height * ratio);
    };
    previewObserver?.disconnect();
    previewObserver = new ResizeObserver(resize);
    previewObserver.observe(stage);
    resize();
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      preview?.pointerMove((event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY);
      hint.classList.add("hidden");
    });
    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const buttons: MouseButton[] = ["left", "middle", "right"];
      preview?.click(
        (event.clientX - rect.left) * (canvas.width / rect.width),
        (event.clientY - rect.top) * (canvas.height / rect.height),
        buttons[event.button] ?? "left",
      );
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    clearInterval(previewStatsTimer);
    previewStatsTimer = window.setInterval(() => {
      const fps = document.querySelector("#preview-fps");
      const particles = document.querySelector("#preview-particles");
      if (fps) fps.textContent = String(preview?.fps ?? 0);
      if (particles) particles.textContent = String(preview?.particleCount ?? 0);
    }, 500);
  });
  return panel;
}

function presetEditor(kind: "trail" | "click"): HTMLElement {
  const section = make<HTMLDivElement>("div", "effect-layout");
  const presetPanel = make<HTMLDivElement>("div", "preset-panel");
  const presetHead = make<HTMLDivElement>("div", "panel-heading");
  const presetTitle = make<HTMLDivElement>("div");
  presetTitle.append(make("strong", "", "效果预设"), make("small", "", "选择一种风格，或复制后自由调整"));
  presetHead.append(presetTitle);
  const list = make<HTMLDivElement>("div", "preset-list");
  const presets = kind === "trail" ? config.trails : config.clicks;
  const activeId = kind === "trail" ? config.activeTrailId : config.activeClickId;
  for (const preset of presets) {
    const button = make<HTMLButtonElement>("button", `preset-card${preset.id === activeId ? " active" : ""}`);
    const colors = "startColor" in preset ? [preset.startColor, preset.endColor] : [preset.color, preset.endColor];
    const shapeLabel = "startColor" in preset ? TRAIL_SHAPE_LABELS[preset.shape] : CLICK_SHAPE_LABELS[preset.shape];
    const orb = make<HTMLSpanElement>("span", `preset-orb shape-${preset.shape}`, SHAPE_SYMBOLS[preset.shape]);
    orb.style.background = `radial-gradient(circle at 35% 35%, ${colors[0]}, ${colors[1]} 65%, transparent 72%)`;
    const text = make<HTMLSpanElement>("span", "preset-name");
    const state = preset.id === activeId ? "正在使用" : "点击使用";
    text.append(make("strong", "", preset.name), make("small", "", `${shapeLabel} · ${state}`));
    button.append(orb, text, make("i", "preset-check", preset.id === activeId ? "✓" : ""));
    button.addEventListener("click", () => {
      if (kind === "trail") config.activeTrailId = preset.id;
      else config.activeClickId = preset.id;
      changed(true);
    });
    list.append(button);
  }
  const duplicate = make<HTMLButtonElement>("button", "secondary-button full", "＋ 复制当前预设");
  duplicate.addEventListener("click", () => {
    if (kind === "trail") {
      const copy = structuredClone(activeTrail(config));
      copy.id = `trail-custom-${Date.now()}`;
      copy.name = `${copy.name} 副本`;
      config.trails.push(copy);
      config.activeTrailId = copy.id;
    } else {
      const copy = structuredClone(activeClick(config));
      copy.id = `click-custom-${Date.now()}`;
      copy.name = `${copy.name} 副本`;
      config.clicks.push(copy);
      config.activeClickId = copy.id;
    }
    changed(true);
  });
  presetPanel.append(presetHead, list, duplicate);

  const editor = make<HTMLDivElement>("div", "editor-column");
  editor.append(previewPanel());
  const panel = make<HTMLDivElement>("div", "parameters-panel");
  const heading = make<HTMLDivElement>("div", "panel-heading parameter-heading");
  const nameBox = make<HTMLDivElement>("div", "preset-title-edit");
  const name = make<HTMLInputElement>("input", "preset-title-input");
  const current = kind === "trail" ? activeTrail(config) : activeClick(config);
  name.value = current.name;
  name.maxLength = 16;
  name.addEventListener("change", () => {
    current.name = name.value.trim() || "未命名效果";
    changed(true);
  });
  nameBox.append(name, make("span", "edit-badge", "当前预设"));
  const reset = make<HTMLButtonElement>("button", "text-button", "恢复默认");
  reset.addEventListener("click", () => {
    if (kind === "trail") {
      const index = config.trails.findIndex((item) => item.id === config.activeTrailId);
      const original = DEFAULT_CONFIG.trails.find((item) => item.id === config.activeTrailId) ?? DEFAULT_CONFIG.trails[0];
      const replacement = { ...structuredClone(original), id: config.trails[index].id };
      config.trails[index] = replacement;
    } else {
      const index = config.clicks.findIndex((item) => item.id === config.activeClickId);
      const original = DEFAULT_CONFIG.clicks.find((item) => item.id === config.activeClickId) ?? DEFAULT_CONFIG.clicks[0];
      const replacement = { ...structuredClone(original), id: config.clicks[index].id };
      config.clicks[index] = replacement;
    }
    changed(true);
    toast("已恢复此预设的默认参数");
  });
  heading.append(nameBox, reset);
  const grid = make<HTMLDivElement>("div", "controls-grid");
  if (kind === "trail") {
    const preset = activeTrail(config);
    grid.append(
      selectControl<TrailShape>("粒子形状", preset.shape, TRAIL_SHAPE_OPTIONS, (value) => { preset.shape = value; changed(true); }),
      rangeControl("拖尾宽度", preset.width, 4, 64, 1, "px", (value) => { preset.width = value; changed(); }),
      rangeControl("存续时间", preset.lifetime, 150, 2500, 50, "ms", (value) => { preset.lifetime = value; changed(); }),
      rangeControl("辉光强度", preset.glow, 0.2, 2, 0.1, "×", (value) => { preset.glow = value; changed(); }),
      rangeControl("粒子间距", preset.spacing, 2, 40, 1, "px", (value) => { preset.spacing = value; changed(); }),
      rangeControl("扩散速度", preset.spreadSpeed, 0, 120, 1, "px/s", (value) => { preset.spreadSpeed = value; changed(); }),
      rangeControl("旋转速度", preset.rotationSpeed, 0, 12, 0.2, "rad/s", (value) => { preset.rotationSpeed = value; changed(); }),
      colorControl("起始颜色", preset.startColor, (value) => { preset.startColor = value; changed(); }),
      colorControl("结束颜色", preset.endColor, (value) => { preset.endColor = value; changed(); }),
    );
  } else {
    const preset = activeClick(config);
    grid.append(
      selectControl<ClickShape>("点击形状", preset.shape, CLICK_SHAPE_OPTIONS, (value) => { preset.shape = value; changed(true); }),
      rangeControl("扩散范围", preset.radius, 30, 300, 5, "px", (value) => { preset.radius = value; changed(); }),
      rangeControl("持续时间", preset.duration, 150, 2000, 50, "ms", (value) => { preset.duration = value; changed(); }),
      rangeControl("辉光强度", preset.glow, 0.2, 2, 0.1, "×", (value) => { preset.glow = value; changed(); }),
      rangeControl("元素数量", preset.count, 6, 96, 1, "个", (value) => { preset.count = value; changed(); }),
      colorControl("主题色", preset.color, (value) => { preset.color = value; changed(); }),
      colorControl("消散颜色", preset.endColor, (value) => { preset.endColor = value; changed(); }),
    );
  }
  panel.append(heading, grid);
  if (kind === "click") {
    const preset = activeClick(config);
    const buttons = make<HTMLDivElement>("div", "mouse-buttons");
    buttons.append(make("label", "section-label", "响应鼠标按键"));
    const group = make<HTMLDivElement>("div", "button-group");
    for (const [key, label, symbol] of [["left", "左键", "◖"], ["right", "右键", "◗"], ["middle", "中键", "●"]] as const) {
      const button = make<HTMLButtonElement>("button", `mouse-button${preset[key] ? " active" : ""}`);
      button.innerHTML = `<span>${symbol}</span>${label}<i>${preset[key] ? "✓" : ""}</i>`;
      button.addEventListener("click", () => {
        preset[key] = !preset[key];
        changed(true);
      });
      group.append(button);
    }
    buttons.append(group);
    panel.append(buttons);
  }
  editor.append(panel);
  section.append(presetPanel, editor);
  return section;
}

function generalSettings(): HTMLElement {
  const wrapper = make<HTMLDivElement>("div", "general-layout");
  const performance = make<HTMLDivElement>("div", "settings-card");
  const performanceHead = make<HTMLDivElement>("div", "settings-card-head");
  const performanceTitle = make<HTMLDivElement>("div");
  performanceTitle.append(make("strong", "", "性能与效果"), make("small", "", "限制绘制帧率可进一步降低 GPU 与 CPU 占用"));
  performanceHead.append(performanceTitle, make("span", "settings-icon", "⌁"));
  performance.append(performanceHead);
  performance.append(
    toggleControl("启用鼠标特效", "关闭后立即清空粒子并停止绘制", config.masterEnabled, (value) => { config.masterEnabled = value; changed(); }),
    toggleControl("启用拖尾", "独立控制鼠标移动拖尾", config.trailEnabled, (value) => { config.trailEnabled = value; changed(); }),
    toggleControl("启用点击效果", "独立控制鼠标点击反馈", config.clickEnabled, (value) => { config.clickEnabled = value; changed(); }),
  );
  const fpsRow = make<HTMLDivElement>("div", "fps-row");
  const fpsCopy = make<HTMLDivElement>("div", "toggle-copy");
  fpsCopy.append(make("strong", "", "渲染帧率"), make("small", "", "日常推荐 60 FPS，低负载设备可选择 30 FPS"));
  const fpsGroup = make<HTMLDivElement>("div", "fps-options");
  for (const fps of [30, 45, 60, 90, 120]) {
    const button = make<HTMLButtonElement>("button", config.fps === fps ? "active" : "", String(fps));
    button.addEventListener("click", () => { config.fps = fps; changed(true); });
    fpsGroup.append(button);
  }
  fpsRow.append(fpsCopy, fpsGroup);
  performance.append(fpsRow);

  const startup = make<HTMLDivElement>("div", "settings-card");
  const startupHead = make<HTMLDivElement>("div", "settings-card-head");
  const startupTitle = make<HTMLDivElement>("div");
  startupTitle.append(make("strong", "", "启动与后台"), make("small", "", "关闭设置窗口不会退出，特效将继续在后台运行"));
  startupHead.append(startupTitle, make("span", "settings-icon", "↻"));
  startup.append(
    startupHead,
    toggleControl("开机自动启动", "登录系统后自动运行鼠标流光", config.launchAtStartup, (value) => { config.launchAtStartup = value; changed(); }),
    toggleControl("静默启动", "开机启动时不显示设置窗口，仅显示托盘图标", config.silentStart, (value) => { config.silentStart = value; changed(); }),
  );
  wrapper.append(performance, startup);
  if (desktopPlatform === "macos") {
    const permission = make<HTMLDivElement>("div", "settings-card permission-card");
    const heading = make<HTMLDivElement>("div", "settings-card-head");
    const title = make<HTMLDivElement>("div");
    title.append(make("strong", "", "macOS 输入监控权限"), make("small", "", "只读监听鼠标移动和按键，不会拦截系统事件"));
    heading.append(title, make("span", "settings-icon", "⌘"));
    const row = make<HTMLDivElement>("div", "permission-row");
    const status = make<HTMLDivElement>("div", "toggle-copy");
    status.append(make("strong", "", "正在检查权限…"), make("small", "", "授权后需要退出并重新打开鼠标流光"));
    const button = make<HTMLButtonElement>("button", "secondary-button", "打开权限设置");
    button.addEventListener("click", async () => {
      await invoke("open_input_settings");
      toast("请在“输入监控”中启用鼠标流光，然后重启应用");
    });
    row.append(status, button);
    permission.append(heading, row);
    wrapper.append(permission);
    void invoke<boolean>("input_permission_granted").then((granted) => {
      status.querySelector("strong")!.textContent = granted ? "权限已授予" : "需要输入监控权限";
    });
  }
  const tip = make<HTMLDivElement>("div", "performance-tip");
  tip.innerHTML = `<span>✦</span><div><strong>低开销设计</strong><p>鼠标事件按 120 Hz 合并，粒子使用固定对象池；无特效时没有绘制循环。高回报率鼠标也不会直接触发逐事件渲染。</p></div>`;
  wrapper.append(tip);
  return wrapper;
}

function aboutSettings(): HTMLElement {
  const wrapper = make<HTMLDivElement>("div", "about-layout");
  const card = make<HTMLDivElement>("div", "about-card");
  const mark = make<HTMLDivElement>("div", "about-mark", "✦");
  const title = make<HTMLHeadingElement>("h2", "", "鼠标流光");
  const version = make<HTMLParagraphElement>("p", "about-version", `Mouse Glow · 版本 ${app.dataset.version ?? "0.2.0"}`);
  const description = make<HTMLParagraphElement>("p", "about-description", "一款轻盈、低占用的 Windows／macOS 鼠标拖尾与点击特效工具。设置保存在本机，不上传任何鼠标轨迹或点击数据。");
  const updateButton = make<HTMLButtonElement>("button", "primary-button", "检查更新");
  const status = make<HTMLDivElement>("div", "update-status", "更新由签名安装包保护，下载前会验证发布信息。");
  const progress = make<HTMLProgressElement>("progress");
  progress.max = 100;
  progress.hidden = true;
  updateButton.addEventListener("click", async () => {
    if (!isTauri) {
      toast("网页预览不支持软件更新，请在桌面应用中使用");
      return;
    }
    updateButton.setAttribute("disabled", "");
    status.textContent = "正在检查更新…";
    progress.hidden = true;
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        status.textContent = "当前已是最新版本。";
        return;
      }
      status.textContent = `发现新版本 ${update.version}，正在下载…`;
      progress.hidden = false;
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) total = event.data.contentLength;
        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total) progress.value = (downloaded / total) * 100;
        }
        if (event.event === "Finished") status.textContent = "更新已下载，正在安装并重启…";
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) {
      console.error(error);
      status.textContent = `更新失败：${String(error)}`;
    } finally {
      updateButton.removeAttribute("disabled");
    }
  });
  card.append(mark, title, version, description, updateButton, progress, status);
  const privacy = make<HTMLDivElement>("div", "privacy-card");
  privacy.innerHTML = `<strong>本地优先</strong><p>配置仅保存在当前用户的应用数据目录。程序不需要网络权限，只有手动检查更新时才会访问发布服务器。</p>`;
  wrapper.append(card, privacy);
  return wrapper;
}

function render(): void {
  previewObserver?.disconnect();
  clearInterval(previewStatsTimer);
  preview?.clear();
  preview = undefined;
  document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === activeTab);
  });
  document.querySelector("#page-title")!.textContent = titles[activeTab][0];
  document.querySelector("#page-subtitle")!.textContent = titles[activeTab][1];
  content.replaceChildren();
  if (activeTab === "trail" || activeTab === "click") content.append(presetEditor(activeTab));
  else if (activeTab === "general") content.append(generalSettings());
  else content.append(aboutSettings());
}

document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    activeTab = button.dataset.tab as Tab;
    render();
  });
});

addEventListener("beforeunload", () => {
  clearTimeout(saveTimer);
  if (isTauri) void invoke("save_config", { config });
});

config = await loadConfig();
if (isTauri) {
  [app.dataset.version, desktopPlatform] = await Promise.all([
    getVersion(),
    invoke<string>("get_platform"),
  ]);
  document.querySelector("#version")!.textContent = `版本 ${app.dataset.version}`;
  await listen("input-permission-required", () => {
    toast("请在 macOS“输入监控”中授权，然后重启鼠标流光", true);
  });
}
render();
