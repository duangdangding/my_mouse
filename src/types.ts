export type MouseButton = "left" | "right" | "middle";
export type TrailShape = "glow" | "petal" | "ribbon" | "spark" | "circuit" | "rune";
export type ClickShape = "ripple" | "star" | "firefly" | "shard" | "hex" | "magic";
export type EffectShape = TrailShape | ClickShape;

export interface TrailPreset {
  id: string;
  name: string;
  shape: TrailShape;
  width: number;
  lifetime: number;
  glow: number;
  spacing: number;
  startColor: string;
  endColor: string;
  spreadSpeed: number;
  rotationSpeed: number;
}

export interface ClickPreset {
  id: string;
  name: string;
  shape: ClickShape;
  radius: number;
  duration: number;
  glow: number;
  count: number;
  color: string;
  endColor: string;
  left: boolean;
  right: boolean;
  middle: boolean;
}

export interface AppConfig {
  masterEnabled: boolean;
  trailEnabled: boolean;
  clickEnabled: boolean;
  fps: number;
  activeTrailId: string;
  activeClickId: string;
  launchAtStartup: boolean;
  silentStart: boolean;
  trails: TrailPreset[];
  clicks: ClickPreset[];
}

export interface InputFrame {
  x: number;
  y: number;
  clicks: Array<{ x: number; y: number; button: MouseButton }>;
}

export interface ScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const isTauri = "__TAURI_INTERNALS__" in window;

export function activeTrail(config: AppConfig): TrailPreset {
  return config.trails.find((item) => item.id === config.activeTrailId) ?? config.trails[0];
}

export function activeClick(config: AppConfig): ClickPreset {
  return config.clicks.find((item) => item.id === config.activeClickId) ?? config.clicks[0];
}
