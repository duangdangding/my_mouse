import { activeClick, activeTrail } from "./types";
import type { AppConfig, ClickPreset, MouseButton, TrailPreset } from "./types";

const COLOR_STEPS = 24;
const SPRITE_SIZE = 64;
const MAX_TRAIL_PARTICLES = 1400;
const MAX_CLICK_PARTICLES = 900;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseColor(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function mixColor(from: Rgb, to: Rgb, amount: number): string {
  const r = Math.round(from.r + (to.r - from.r) * amount);
  const g = Math.round(from.g + (to.g - from.g) * amount);
  const b = Math.round(from.b + (to.b - from.b) * amount);
  return `rgb(${r},${g},${b})`;
}

class GlowAtlas {
  private sprites: HTMLCanvasElement[] = [];
  private key = "";

  rebuild(fromHex: string, toHex: string): void {
    const key = `${fromHex}-${toHex}`;
    if (key === this.key) return;
    this.key = key;
    this.sprites = [];
    const from = parseColor(fromHex);
    const to = parseColor(toHex);
    for (let index = 0; index < COLOR_STEPS; index += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = SPRITE_SIZE;
      canvas.height = SPRITE_SIZE;
      const context = canvas.getContext("2d")!;
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      const color = mixColor(from, to, index / (COLOR_STEPS - 1));
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.12, color);
      gradient.addColorStop(0.38, color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      this.sprites.push(canvas);
    }
  }

  sprite(progress: number): HTMLCanvasElement {
    const index = Math.min(COLOR_STEPS - 1, Math.max(0, Math.floor(progress * COLOR_STEPS)));
    return this.sprites[index];
  }
}

class ParticlePool {
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly size: Float32Array;
  private readonly rotation: Float32Array;
  private readonly spin: Float32Array;
  count = 0;

  constructor(private readonly capacity: number) {
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.rotation = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
  }

  clear(): void {
    this.count = 0;
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    rotation: number,
    spin: number,
  ): void {
    if (this.count >= this.capacity) return;
    const index = this.count;
    this.count += 1;
    this.x[index] = x;
    this.y[index] = y;
    this.vx[index] = vx;
    this.vy[index] = vy;
    this.age[index] = 0;
    this.life[index] = life;
    this.size[index] = size;
    this.rotation[index] = rotation;
    this.spin[index] = spin;
  }

  update(deltaSeconds: number): void {
    let index = 0;
    while (index < this.count) {
      const nextAge = this.age[index] + deltaSeconds * 1000;
      if (nextAge >= this.life[index]) {
        this.remove(index);
        continue;
      }
      this.age[index] = nextAge;
      this.x[index] += this.vx[index] * deltaSeconds;
      this.y[index] += this.vy[index] * deltaSeconds;
      this.rotation[index] += this.spin[index] * deltaSeconds;
      index += 1;
    }
  }

  draw(context: CanvasRenderingContext2D, atlas: GlowAtlas, glow: number, expanding: boolean): void {
    for (let index = 0; index < this.count; index += 1) {
      const progress = this.age[index] / this.life[index];
      const size = this.size[index] * (expanding ? 0.8 + progress * 1.1 : 0.75 + progress * 0.65);
      const alpha = (1 - progress) ** 1.45 * Math.min(2, glow) * 0.72;
      context.globalAlpha = alpha;
      context.setTransform(1, 0, 0, 1, this.x[index], this.y[index]);
      context.rotate(this.rotation[index]);
      context.drawImage(atlas.sprite(progress), -size / 2, -size / 2, size, size);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
  }

  private remove(index: number): void {
    const last = this.count - 1;
    if (index !== last) {
      this.x[index] = this.x[last];
      this.y[index] = this.y[last];
      this.vx[index] = this.vx[last];
      this.vy[index] = this.vy[last];
      this.age[index] = this.age[last];
      this.life[index] = this.life[last];
      this.size[index] = this.size[last];
      this.rotation[index] = this.rotation[last];
      this.spin[index] = this.spin[last];
    }
    this.count = last;
  }
}

export class EffectsRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly trailPool = new ParticlePool(MAX_TRAIL_PARTICLES);
  private readonly clickPool = new ParticlePool(MAX_CLICK_PARTICLES);
  private readonly trailAtlas = new GlowAtlas();
  private readonly clickAtlas = new GlowAtlas();
  private config: AppConfig;
  private trailPreset: TrailPreset;
  private clickPreset: ClickPreset;
  private lastX = 0;
  private lastY = 0;
  private lastInputAt = 0;
  private hasLastPoint = false;
  private animationFrame = 0;
  private lastFrameAt = 0;
  private measuredAt = 0;
  private measuredFrames = 0;
  private measuredFps = 0;

  constructor(private readonly canvas: HTMLCanvasElement, config: AppConfig) {
    this.context = canvas.getContext("2d", { alpha: true })!;
    this.config = config;
    this.trailPreset = activeTrail(config);
    this.clickPreset = activeClick(config);
    this.rebuildAtlases();
  }

  setConfig(config: AppConfig): void {
    this.config = config;
    this.trailPreset = activeTrail(config);
    this.clickPreset = activeClick(config);
    this.rebuildAtlases();
    if (!config.masterEnabled || (!config.trailEnabled && !config.clickEnabled)) {
      this.clear();
    }
  }

  resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
    }
  }

  pointerMove(x: number, y: number): void {
    if (!this.config.masterEnabled || !this.config.trailEnabled) return;
    const now = performance.now();
    if (!this.hasLastPoint || now - this.lastInputAt > 140) {
      this.lastX = x;
      this.lastY = y;
      this.hasLastPoint = true;
      this.lastInputAt = now;
      return;
    }
    const deltaX = x - this.lastX;
    const deltaY = y - this.lastY;
    const distance = Math.hypot(deltaX, deltaY);
    const spacing = Math.max(2, this.trailPreset.spacing);
    if (distance < spacing) {
      this.lastInputAt = now;
      return;
    }
    const steps = Math.min(120, Math.floor(distance / spacing));
    const preset = this.trailPreset;
    for (let step = 1; step <= steps; step += 1) {
      const amount = step / steps;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * preset.spreadSpeed;
      this.trailPool.spawn(
        this.lastX + deltaX * amount,
        this.lastY + deltaY * amount,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        preset.lifetime * (0.82 + Math.random() * 0.18),
        preset.width * (0.75 + Math.random() * 0.5),
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * preset.rotationSpeed * 2,
      );
    }
    this.lastX = x;
    this.lastY = y;
    this.lastInputAt = now;
    this.wake();
  }

  click(x: number, y: number, button: MouseButton): void {
    if (!this.config.masterEnabled || !this.config.clickEnabled || !this.clickPreset[button]) return;
    const preset = this.clickPreset;
    const durationSeconds = preset.duration / 1000;
    for (let index = 0; index < preset.count; index += 1) {
      const angle = (index / preset.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.16;
      const speed = (preset.radius / durationSeconds) * (0.65 + Math.random() * 0.4);
      const size = Math.max(5, Math.min(18, preset.radius / Math.sqrt(preset.count)));
      this.clickPool.spawn(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        preset.duration * (0.78 + Math.random() * 0.22),
        size,
        angle,
        0,
      );
    }
    this.wake();
  }

  clear(): void {
    this.trailPool.clear();
    this.clickPool.clear();
    this.hasLastPoint = false;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.lastFrameAt = 0;
  }

  get particleCount(): number {
    return this.trailPool.count + this.clickPool.count;
  }

  get fps(): number {
    return this.measuredFps;
  }

  private rebuildAtlases(): void {
    this.trailAtlas.rebuild(this.trailPreset.startColor, this.trailPreset.endColor);
    this.clickAtlas.rebuild(this.clickPreset.color, this.clickPreset.endColor);
  }

  private wake(): void {
    if (!this.animationFrame) this.animationFrame = requestAnimationFrame(this.render);
  }

  private render = (now: number): void => {
    const interval = 1000 / this.config.fps;
    if (this.lastFrameAt && now - this.lastFrameAt + 0.25 < interval) {
      this.animationFrame = requestAnimationFrame(this.render);
      return;
    }
    const delta = this.lastFrameAt ? Math.min(0.06, (now - this.lastFrameAt) / 1000) : 1 / this.config.fps;
    this.lastFrameAt = now;
    this.trailPool.update(delta);
    this.clickPool.update(delta);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.globalCompositeOperation = "lighter";
    if (this.config.masterEnabled && this.config.trailEnabled) {
      this.trailPool.draw(this.context, this.trailAtlas, this.trailPreset.glow, false);
    }
    if (this.config.masterEnabled && this.config.clickEnabled) {
      this.clickPool.draw(this.context, this.clickAtlas, this.clickPreset.glow, true);
    }
    this.context.globalCompositeOperation = "source-over";
    this.measuredFrames += 1;
    if (!this.measuredAt) this.measuredAt = now;
    if (now - this.measuredAt >= 500) {
      this.measuredFps = Math.round((this.measuredFrames * 1000) / (now - this.measuredAt));
      this.measuredAt = now;
      this.measuredFrames = 0;
    }
    if (this.particleCount > 0) {
      this.animationFrame = requestAnimationFrame(this.render);
    } else {
      this.animationFrame = 0;
      this.lastFrameAt = 0;
      this.measuredFps = 0;
      this.measuredAt = 0;
      this.measuredFrames = 0;
    }
  };
}
