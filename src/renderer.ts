import { activeClick, activeTrail } from "./types";
import type { AppConfig, ClickPreset, EffectShape, MouseButton, TrailPreset } from "./types";

const COLOR_STEPS = 24;
const SPRITE_SIZE = 64;
const ATLAS_PADDING = 24;
const ATLAS_SIZE = SPRITE_SIZE + ATLAS_PADDING * 2;
const ATLAS_SCALE = ATLAS_SIZE / SPRITE_SIZE;
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

function traceStar(context: CanvasRenderingContext2D, points: number, outer: number, inner: number): void {
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const x = 32 + Math.cos(angle) * radius;
    const y = 32 + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function tracePetal(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(32, 57);
  context.bezierCurveTo(8, 46, 11, 15, 32, 7);
  context.bezierCurveTo(53, 15, 56, 46, 32, 57);
  context.closePath();
}

function traceShard(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(32, 2);
  context.lineTo(46, 32);
  context.lineTo(32, 62);
  context.lineTo(18, 32);
  context.closePath();
}

function traceCircuit(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(3, 32);
  context.lineTo(19, 32);
  context.lineTo(27, 24);
  context.lineTo(44, 24);
  context.lineTo(51, 17);
  context.lineTo(61, 17);
  context.moveTo(19, 32);
  context.lineTo(27, 40);
  context.lineTo(46, 40);
  context.lineTo(53, 47);
  context.lineTo(61, 47);
  context.moveTo(35, 24);
  context.lineTo(35, 12);
  context.lineTo(45, 12);
  context.moveTo(35, 40);
  context.lineTo(35, 52);
  context.lineTo(25, 52);
}

function traceHexagon(context: CanvasRenderingContext2D): void {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    const x = 32 + Math.cos(angle) * 26;
    const y = 32 + Math.sin(angle) * 26;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function traceRune(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(32, 7);
  context.lineTo(32, 57);
  context.moveTo(32, 14);
  context.lineTo(48, 25);
  context.lineTo(32, 37);
  context.moveTo(32, 25);
  context.lineTo(18, 35);
  context.moveTo(32, 42);
  context.lineTo(47, 52);
  context.moveTo(27, 8);
  context.lineTo(32, 3);
  context.lineTo(37, 8);
  context.lineTo(32, 13);
  context.closePath();
}

function traceMagicCircle(context: CanvasRenderingContext2D): void {
  context.beginPath();
  for (const radius of [29, 24, 8]) {
    context.moveTo(32 + radius, 32);
    context.arc(32, 32, radius, 0, Math.PI * 2);
  }
  for (let triangle = 0; triangle < 2; triangle += 1) {
    for (let index = 0; index < 3; index += 1) {
      const angle = -Math.PI / 2 + triangle * Math.PI / 3 + index * Math.PI * 2 / 3;
      const x = 32 + Math.cos(angle) * 19;
      const y = 32 + Math.sin(angle) * 19;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = index * Math.PI / 6;
    const inner = index % 2 === 0 ? 25 : 26.5;
    context.moveTo(32 + Math.cos(angle) * inner, 32 + Math.sin(angle) * inner);
    context.lineTo(32 + Math.cos(angle) * 28, 32 + Math.sin(angle) * 28);
  }
}

function traceHeart(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(32, 57);
  context.bezierCurveTo(25, 49, 7, 37, 7, 23);
  context.bezierCurveTo(7, 8, 26, 5, 32, 18);
  context.bezierCurveTo(38, 5, 57, 8, 57, 23);
  context.bezierCurveTo(57, 37, 39, 49, 32, 57);
  context.closePath();
}

function traceSnowflake(context: CanvasRenderingContext2D): void {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index * Math.PI) / 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    context.moveTo(32, 32);
    context.lineTo(32 + cos * 28, 32 + sin * 28);
    for (const distance of [17, 23]) {
      const x = 32 + cos * distance;
      const y = 32 + sin * distance;
      for (const side of [-1, 1]) {
        const branchAngle = angle + Math.PI + side * Math.PI / 4;
        context.moveTo(x, y);
        context.lineTo(x + Math.cos(branchAngle) * 7, y + Math.sin(branchAngle) * 7);
      }
    }
  }
}

function traceDiamond(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(32, 2);
  context.lineTo(54, 32);
  context.lineTo(32, 62);
  context.lineTo(10, 32);
  context.closePath();
}

interface CustomPaint {
  text: string;
  image?: HTMLImageElement;
  originalColor: boolean;
}

const customImageCache = new Map<string, HTMLImageElement>();
const customImageWaiters = new Map<string, Array<() => void>>();
const failedCustomImages = new Set<string>();

function requestCustomImage(source: string, onReady: () => void): void {
  if (!source || customImageCache.has(source) || failedCustomImages.has(source)) return;
  const existing = customImageWaiters.get(source);
  if (existing) {
    existing.push(onReady);
    return;
  }
  customImageWaiters.set(source, [onReady]);
  const image = new Image();
  image.onload = () => {
    customImageCache.set(source, image);
    const callbacks = customImageWaiters.get(source) ?? [];
    customImageWaiters.delete(source);
    for (const callback of callbacks) callback();
  };
  image.onerror = () => {
    failedCustomImages.add(source);
    const callbacks = customImageWaiters.get(source) ?? [];
    customImageWaiters.delete(source);
    for (const callback of callbacks) callback();
  };
  image.src = source;
}

function paintShape(
  context: CanvasRenderingContext2D,
  shape: EffectShape,
  color: string,
  custom: CustomPaint,
): void {
  context.save();
  if (shape === "glow" || shape === "firefly") {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(shape === "firefly" ? 0.2 : 0.12, color);
    gradient.addColorStop(shape === "firefly" ? 0.34 : 0.38, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  } else if (shape === "text") {
    context.fillStyle = color;
    context.globalAlpha = 0.96;
    context.font = '600 45px "Segoe UI Emoji", "Apple Color Emoji", "Microsoft YaHei UI", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(custom.text || "✦", 32, 34, 58);
  } else if (shape === "image" && custom.image) {
    const image = custom.image;
    const scale = Math.min(56 / image.naturalWidth, 56 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.globalAlpha = 0.98;
    context.drawImage(image, (SPRITE_SIZE - width) / 2, (SPRITE_SIZE - height) / 2, width, height);
    if (!custom.originalColor) {
      context.globalCompositeOperation = "source-in";
      context.fillStyle = color;
      context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
  } else if (shape === "heart" || shape === "diamond") {
    const gradient = context.createLinearGradient(18, 5, 46, 60);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.32, color);
    gradient.addColorStop(1, color);
    context.strokeStyle = color;
    context.globalAlpha = 0.16;
    context.lineWidth = 7;
    if (shape === "heart") traceHeart(context);
    else traceDiamond(context);
    context.stroke();
    context.globalAlpha = 0.94;
    context.fillStyle = gradient;
    if (shape === "heart") traceHeart(context);
    else traceDiamond(context);
    context.fill();
  } else if (shape === "snowflake") {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    for (const [lineWidth, alpha] of [[8, 0.16], [2.7, 0.9], [0.8, 0.75]] as const) {
      context.globalAlpha = alpha;
      context.lineWidth = lineWidth;
      context.strokeStyle = lineWidth === 0.8 ? "#ffffff" : color;
      traceSnowflake(context);
      context.stroke();
    }
  } else if (shape === "petal") {
    context.strokeStyle = color;
    context.globalAlpha = 0.16;
    context.lineWidth = 8;
    tracePetal(context);
    context.stroke();
    const gradient = context.createLinearGradient(22, 8, 42, 58);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, color);
    context.globalAlpha = 0.92;
    context.fillStyle = gradient;
    tracePetal(context);
    context.fill();
    context.globalAlpha = 0.48;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(32, 49);
    context.quadraticCurveTo(25, 31, 32, 15);
    context.stroke();
  } else if (shape === "ribbon") {
    const gradient = context.createLinearGradient(0, 0, SPRITE_SIZE, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(0.5, "#ffffff");
    gradient.addColorStop(0.8, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(2, 32);
    context.quadraticCurveTo(16, 20, 32, 23);
    context.quadraticCurveTo(48, 26, 62, 32);
    context.quadraticCurveTo(48, 38, 32, 41);
    context.quadraticCurveTo(16, 44, 2, 32);
    context.closePath();
    context.fill();
  } else if (shape === "spark" || shape === "star") {
    const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, color);
    context.strokeStyle = color;
    context.globalAlpha = 0.16;
    context.lineWidth = 7;
    traceStar(context, shape === "star" ? 5 : 4, 29, shape === "star" ? 12 : 6);
    context.stroke();
    context.globalAlpha = 0.95;
    context.fillStyle = gradient;
    traceStar(context, shape === "star" ? 5 : 4, 29, shape === "star" ? 12 : 6);
    context.fill();
  } else if (shape === "shard") {
    context.strokeStyle = color;
    context.globalAlpha = 0.18;
    context.lineWidth = 7;
    traceShard(context);
    context.stroke();
    const gradient = context.createLinearGradient(22, 4, 42, 60);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.35, color);
    gradient.addColorStop(1, color);
    context.globalAlpha = 0.94;
    context.fillStyle = gradient;
    traceShard(context);
    context.fill();
    context.globalAlpha = 0.55;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(32, 8);
    context.lineTo(26, 32);
    context.lineTo(32, 55);
    context.stroke();
  } else if (shape === "circuit") {
    context.lineCap = "square";
    context.lineJoin = "miter";
    context.strokeStyle = color;
    context.globalAlpha = 0.18;
    context.lineWidth = 7;
    traceCircuit(context);
    context.stroke();
    context.globalAlpha = 0.9;
    context.lineWidth = 2.4;
    traceCircuit(context);
    context.stroke();
    context.globalAlpha = 0.68;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 0.8;
    traceCircuit(context);
    context.stroke();
    for (const [x, y] of [[19, 32], [35, 24], [46, 40], [53, 47], [45, 12], [25, 52]] as const) {
      context.globalAlpha = 0.95;
      context.fillStyle = color;
      context.fillRect(x - 3, y - 3, 6, 6);
      context.fillStyle = "#ffffff";
      context.fillRect(x - 1, y - 1, 2, 2);
    }
  } else if (shape === "hex") {
    context.strokeStyle = color;
    for (const [lineWidth, alpha] of [[9, 0.14], [3.5, 0.78], [1, 0.95]] as const) {
      context.globalAlpha = alpha;
      context.lineWidth = lineWidth;
      traceHexagon(context);
      context.stroke();
    }
    context.globalAlpha = 0.75;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 0.7;
    traceHexagon(context);
    context.stroke();
    context.fillStyle = color;
    for (let index = 0; index < 6; index += 1) {
      const angle = (index * Math.PI) / 3;
      const x = 32 + Math.cos(angle) * 26;
      const y = 32 + Math.sin(angle) * 26;
      context.globalAlpha = 0.9;
      context.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
  } else if (shape === "rune") {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.globalAlpha = 0.18;
    context.lineWidth = 8;
    traceRune(context);
    context.stroke();
    context.globalAlpha = 0.94;
    context.lineWidth = 3;
    traceRune(context);
    context.stroke();
    context.globalAlpha = 0.72;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 0.9;
    traceRune(context);
    context.stroke();
  } else if (shape === "magic") {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    for (const [lineWidth, alpha] of [[7, 0.15], [2.1, 0.88], [0.7, 0.9]] as const) {
      context.globalAlpha = alpha;
      context.lineWidth = lineWidth;
      traceMagicCircle(context);
      context.stroke();
    }
    context.globalAlpha = 0.72;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 0.55;
    traceMagicCircle(context);
    context.stroke();
    context.fillStyle = color;
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const x = 32 + Math.cos(angle) * 24;
      const y = 32 + Math.sin(angle) * 24;
      context.globalAlpha = 0.9;
      context.beginPath();
      context.arc(x, y, 1.8, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    context.strokeStyle = color;
    for (const [lineWidth, alpha] of [[9, 0.12], [4, 0.72], [1.2, 0.9]] as const) {
      context.globalAlpha = alpha;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.arc(32, 32, 25, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 0.85;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 0.8;
    context.beginPath();
    context.arc(32, 32, 25, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

class ShapeAtlas {
  private sprites: HTMLCanvasElement[] = [];
  private key = "";
  shape: EffectShape = "glow";
  fadePower = 1.45;

  rebuild(
    fromHex: string,
    toHex: string,
    shape: EffectShape,
    glow: number,
    fadePower: number,
    customText: string,
    customImage: string,
    originalColor: boolean,
    onImageReady: () => void,
  ): void {
    const image = shape === "image" ? customImageCache.get(customImage) : undefined;
    if (shape === "image" && customImage && !image) requestCustomImage(customImage, onImageReady);
    const renderShape: EffectShape = shape === "image" && !image ? "glow" : shape;
    const key = [
      fromHex,
      toHex,
      shape,
      glow.toFixed(2),
      fadePower.toFixed(2),
      customText,
      customImage,
      originalColor,
      image ? "ready" : "empty",
    ].join("|");
    if (key === this.key) return;
    this.key = key;
    this.shape = shape;
    this.fadePower = fadePower;
    this.sprites = [];
    const from = parseColor(fromHex);
    const to = parseColor(toHex);
    const steps = shape === "image" && originalColor && image ? 1 : COLOR_STEPS;
    const custom: CustomPaint = { text: customText, image, originalColor };
    for (let index = 0; index < steps; index += 1) {
      const sprite = document.createElement("canvas");
      sprite.width = SPRITE_SIZE;
      sprite.height = SPRITE_SIZE;
      const spriteContext = sprite.getContext("2d")!;
      const color = mixColor(from, to, steps === 1 ? 0 : index / (steps - 1));
      paintShape(spriteContext, renderShape, color, custom);

      // 字符、图片与光晕只在配置变化时预渲染，逐帧绘制不解析资源或启用阴影。
      const canvas = document.createElement("canvas");
      canvas.width = ATLAS_SIZE;
      canvas.height = ATLAS_SIZE;
      const context = canvas.getContext("2d")!;
      context.filter = `blur(${(2 + glow * 5).toFixed(1)}px)`;
      context.globalAlpha = Math.min(0.85, 0.18 + glow * 0.27);
      context.drawImage(sprite, ATLAS_PADDING, ATLAS_PADDING);
      context.filter = "none";
      context.globalAlpha = 1;
      context.drawImage(sprite, ATLAS_PADDING, ATLAS_PADDING);
      this.sprites.push(canvas);
    }
  }

  sprite(progress: number): HTMLCanvasElement {
    const index = Math.min(this.sprites.length - 1, Math.max(0, Math.floor(progress * this.sprites.length)));
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

  update(deltaSeconds: number, gravity = 0, wander = 0): void {
    let index = 0;
    while (index < this.count) {
      const nextAge = this.age[index] + deltaSeconds * 1000;
      if (nextAge >= this.life[index]) {
        this.remove(index);
        continue;
      }
      this.age[index] = nextAge;
      this.vy[index] += gravity * deltaSeconds;
      this.x[index] += this.vx[index] * deltaSeconds;
      this.y[index] += this.vy[index] * deltaSeconds;
      if (wander > 0) {
        const phase = nextAge * 0.006 + this.rotation[index];
        this.x[index] += Math.cos(phase) * wander * deltaSeconds;
        this.y[index] += Math.sin(phase * 1.31) * wander * deltaSeconds;
      }
      this.rotation[index] += this.spin[index] * deltaSeconds;
      index += 1;
    }
  }

  draw(context: CanvasRenderingContext2D, atlas: ShapeAtlas): void {
    for (let index = 0; index < this.count; index += 1) {
      const progress = this.age[index] / this.life[index];
      const baseSize = this.size[index];
      let size = baseSize * (0.75 + progress * 0.65);
      let scaleX = 1;
      let scaleY = 1;
      let alpha = (1 - progress) ** atlas.fadePower * 0.9;
      if (atlas.shape === "petal") {
        size = baseSize * (0.88 + progress * 0.3);
        scaleX = 0.82;
        scaleY = 1.16;
        alpha = (1 - progress) ** atlas.fadePower * 0.9;
      } else if (atlas.shape === "ribbon") {
        size = baseSize * (0.9 + progress * 0.3);
        scaleX = 2.65;
        scaleY = 0.62;
        alpha = (1 - progress) ** atlas.fadePower * 0.82;
      } else if (atlas.shape === "circuit") {
        size = baseSize * (0.9 + progress * 0.25);
        scaleX = 1.75;
        scaleY = 0.9;
        alpha = (1 - progress) ** atlas.fadePower * 0.92;
        alpha *= 0.88 + Math.sin(this.age[index] * 0.02 + this.rotation[index]) * 0.12;
      } else if (atlas.shape === "rune") {
        size = baseSize * (0.85 + progress * 0.4);
        scaleX = 0.9;
        scaleY = 1.1;
        alpha = (1 - progress) ** atlas.fadePower * 0.92;
      } else if (atlas.shape === "spark") {
        size = baseSize * (0.8 + progress * 0.5);
        scaleX = 0.85;
        scaleY = 1.25;
      } else if (atlas.shape === "ripple" || atlas.shape === "hex") {
        size = baseSize * (0.28 + progress * 0.88);
        alpha = (1 - progress) ** atlas.fadePower * 0.94;
      } else if (atlas.shape === "magic") {
        size = baseSize * (0.55 + progress * 0.45);
        alpha = (1 - progress) ** atlas.fadePower * 0.88 * Math.min(1, 0.15 + progress * 10);
      } else if (atlas.shape === "star") {
        size = baseSize * (0.7 + progress * 0.9);
      } else if (atlas.shape === "firefly") {
        size = baseSize * (0.8 + progress * 0.5);
        alpha *= 0.72 + Math.sin(this.age[index] * 0.018 + this.rotation[index]) * 0.28;
      } else if (atlas.shape === "shard" || atlas.shape === "diamond") {
        size = baseSize * (0.9 + progress * 0.35);
        scaleX = atlas.shape === "diamond" ? 0.78 : 0.65;
        scaleY = atlas.shape === "diamond" ? 1.25 : 1.5;
      }
      const width = size * scaleX * ATLAS_SCALE;
      const height = size * scaleY * ATLAS_SCALE;
      context.globalAlpha = alpha;
      context.setTransform(1, 0, 0, 1, this.x[index], this.y[index]);
      context.rotate(this.rotation[index]);
      context.drawImage(atlas.sprite(progress), -width / 2, -height / 2, width, height);
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
  private readonly trailAtlas = new ShapeAtlas();
  private readonly clickAtlas = new ShapeAtlas();
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
    const shape = preset.shape ?? "glow";
    const movementAngle = Math.atan2(deltaY, deltaX);
    for (let step = 1; step <= steps; step += 1) {
      const amount = step / steps;
      const angle = shape === "petal"
        ? Math.PI / 2 + (Math.random() - 0.5) * 2.4
        : Math.random() * Math.PI * 2;
      const speed = Math.random() * preset.spreadSpeed;
      let rotation = Math.random() * Math.PI * 2;
      if (preset.followMovement) {
        const jitter = shape === "ribbon" ? 0.08 : shape === "spark" ? 0.5 : 0;
        rotation = movementAngle + (Math.random() - 0.5) * jitter;
      }
      const sizeJitter = 1 + (Math.random() * 2 - 1) * preset.sizeJitter;
      this.trailPool.spawn(
        this.lastX + deltaX * amount,
        this.lastY + deltaY * amount,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        preset.lifetime * (0.82 + Math.random() * 0.18),
        preset.width * sizeJitter,
        rotation,
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
    const shape = preset.shape ?? "ripple";
    const durationSeconds = preset.duration / 1000;
    if (shape === "ripple" || shape === "hex") {
      const rings = Math.max(2, Math.min(5, Math.round(preset.count / 8)));
      for (let index = 0; index < rings; index += 1) {
        this.clickPool.spawn(
          x,
          y,
          0,
          0,
          preset.duration * (0.84 + index * 0.06),
          preset.radius * 2.5 * (0.65 + index * 0.18),
          0,
          0,
        );
      }
      this.wake();
      return;
    }
    if (shape === "magic") {
      for (let index = 0; index < 2; index += 1) {
        this.clickPool.spawn(
          x,
          y,
          0,
          0,
          preset.duration * (1 + index * 0.08),
          preset.radius * 1.8 * (1 + index * 0.18),
          index * Math.PI / 6,
          index === 0 ? 0.85 : -0.55,
        );
      }
      this.wake();
      return;
    }
    for (let index = 0; index < preset.count; index += 1) {
      const angle = shape === "firefly"
        ? Math.random() * Math.PI * 2
        : (index / preset.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.16;
      const speedScale = shape === "firefly"
        ? 0.18 + Math.random() * 0.32
        : shape === "shard"
          ? 0.9 + Math.random() * 0.5
          : 0.65 + Math.random() * 0.45;
      const speed = (preset.radius / durationSeconds) * speedScale;
      const baseSize = preset.radius / Math.sqrt(preset.count);
      const sizeJitter = 1 + (Math.random() * 2 - 1) * preset.sizeJitter;
      const size = (shape === "firefly"
        ? Math.max(5, Math.min(11, baseSize * 0.75))
        : shape === "star"
          ? Math.max(8, Math.min(26, baseSize * 1.25))
          : Math.max(8, Math.min(24, baseSize * 1.2))) * sizeJitter;
      const spin = shape === "star"
        ? (Math.random() - 0.5) * 3
        : shape === "shard"
          ? (Math.random() - 0.5) * 8
          : 0;
      this.clickPool.spawn(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        preset.duration * (shape === "firefly" ? 0.85 + Math.random() * 0.35 : 0.78 + Math.random() * 0.22),
        size,
        shape === "star" || shape === "firefly" ? Math.random() * Math.PI * 2 : angle,
        spin,
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
    const onImageReady = () => this.rebuildAtlases();
    this.trailAtlas.rebuild(
      this.trailPreset.startColor,
      this.trailPreset.endColor,
      this.trailPreset.shape ?? "glow",
      this.trailPreset.glow,
      this.trailPreset.fadePower,
      this.trailPreset.customText,
      this.trailPreset.customImage,
      this.trailPreset.originalColor,
      onImageReady,
    );
    this.clickAtlas.rebuild(
      this.clickPreset.color,
      this.clickPreset.endColor,
      this.clickPreset.shape ?? "ripple",
      this.clickPreset.glow,
      this.clickPreset.fadePower,
      this.clickPreset.customText,
      this.clickPreset.customImage,
      this.clickPreset.originalColor,
      onImageReady,
    );
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
    this.trailPool.update(delta, this.trailPreset.gravity, this.trailPreset.wander);
    this.clickPool.update(delta, this.clickPreset.gravity, this.clickPreset.wander);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.globalCompositeOperation = "lighter";
    if (this.config.masterEnabled && this.config.trailEnabled) {
      this.trailPool.draw(this.context, this.trailAtlas);
    }
    if (this.config.masterEnabled && this.config.clickEnabled) {
      this.clickPool.draw(this.context, this.clickAtlas);
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
