import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { defaultConfig } from "./defaults";
import { EffectsRenderer } from "./renderer";
import { isTauri } from "./types";
import type { AppConfig, InputFrame, MouseButton, ScreenBounds } from "./types";

const canvas = document.querySelector<HTMLCanvasElement>("#effects")!;
let bounds: ScreenBounds = { x: 0, y: 0, width: innerWidth, height: innerHeight };
let renderer: EffectsRenderer;

function resize(): void {
  renderer?.resize(bounds.width, bounds.height);
}

if (isTauri) {
  const [config, initialBounds] = await Promise.all([
    invoke<AppConfig>("get_config"),
    invoke<ScreenBounds>("sync_overlay_bounds"),
  ]);
  bounds = initialBounds;
  renderer = new EffectsRenderer(canvas, config);
  resize();
  await listen<InputFrame>("mouse-input", (event) => {
    const x = event.payload.x - bounds.x;
    const y = event.payload.y - bounds.y;
    renderer.pointerMove(x, y);
    for (const click of event.payload.clicks) {
      renderer.click(click.x - bounds.x, click.y - bounds.y, click.button);
    }
  });
  await listen<AppConfig>("config-changed", (event) => renderer.setConfig(event.payload));
  await listen<ScreenBounds>("overlay-bounds", (event) => {
    bounds = event.payload;
    resize();
    renderer.clear();
  });
} else {
  const config = defaultConfig();
  renderer = new EffectsRenderer(canvas, config);
  const browserResize = () => {
    const ratio = devicePixelRatio || 1;
    bounds = { x: 0, y: 0, width: innerWidth * ratio, height: innerHeight * ratio };
    resize();
  };
  browserResize();
  addEventListener("resize", browserResize);
  addEventListener("pointermove", (event) => {
    const ratio = devicePixelRatio || 1;
    renderer.pointerMove(event.clientX * ratio, event.clientY * ratio);
  });
  addEventListener("pointerdown", (event) => {
    const ratio = devicePixelRatio || 1;
    const buttons: MouseButton[] = ["left", "middle", "right"];
    renderer.click(event.clientX * ratio, event.clientY * ratio, buttons[event.button] ?? "left");
  });
  addEventListener("contextmenu", (event) => event.preventDefault());
}
