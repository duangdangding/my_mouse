use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TrailPreset {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub shape: String,
    pub width: f32,
    pub lifetime: u32,
    pub glow: f32,
    pub spacing: f32,
    pub start_color: String,
    pub end_color: String,
    pub spread_speed: f32,
    pub rotation_speed: f32,
    pub custom_text: String,
    pub custom_image: String,
    pub original_color: bool,
    pub size_jitter: f32,
    pub gravity: f32,
    pub wander: f32,
    pub fade_power: f32,
    pub follow_movement: bool,
}

impl Default for TrailPreset {
    fn default() -> Self {
        Self {
            id: "trail-nebula".into(),
            name: "星云蓝".into(),
            shape: "glow".into(),
            width: 18.0,
            lifetime: 900,
            glow: 1.4,
            spacing: 7.0,
            start_color: "#62E8FF".into(),
            end_color: "#7657FF".into(),
            spread_speed: 18.0,
            rotation_speed: 1.8,
            custom_text: "✦".into(),
            custom_image: String::new(),
            original_color: false,
            size_jitter: 0.25,
            gravity: 0.0,
            wander: 0.0,
            fade_power: 1.45,
            follow_movement: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ClickPreset {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub shape: String,
    pub radius: f32,
    pub duration: u32,
    pub glow: f32,
    pub count: u16,
    pub color: String,
    pub end_color: String,
    pub left: bool,
    pub right: bool,
    pub middle: bool,
    pub custom_text: String,
    pub custom_image: String,
    pub original_color: bool,
    pub size_jitter: f32,
    pub gravity: f32,
    pub wander: f32,
    pub fade_power: f32,
}

impl Default for ClickPreset {
    fn default() -> Self {
        Self {
            id: "click-ripple".into(),
            name: "涟漪蓝".into(),
            shape: "ripple".into(),
            radius: 100.0,
            duration: 650,
            glow: 1.4,
            count: 28,
            color: "#7DE8FF".into(),
            end_color: "#4B5FFF".into(),
            left: true,
            right: false,
            middle: false,
            custom_text: "✦".into(),
            custom_image: String::new(),
            original_color: false,
            size_jitter: 0.25,
            gravity: 0.0,
            wander: 0.0,
            fade_power: 1.45,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppConfig {
    pub master_enabled: bool,
    pub trail_enabled: bool,
    pub click_enabled: bool,
    pub fps: u16,
    pub active_trail_id: String,
    pub active_click_id: String,
    pub launch_at_startup: bool,
    pub silent_start: bool,
    pub trails: Vec<TrailPreset>,
    pub clicks: Vec<ClickPreset>,
}

impl Default for AppConfig {
    fn default() -> Self {
        let trail = TrailPreset::default();
        let click = ClickPreset {
            fade_power: 1.65,
            ..ClickPreset::default()
        };
        Self {
            master_enabled: true,
            trail_enabled: true,
            click_enabled: true,
            fps: 60,
            active_trail_id: trail.id.clone(),
            active_click_id: click.id.clone(),
            launch_at_startup: false,
            silent_start: true,
            trails: vec![
                trail,
                TrailPreset {
                    id: "trail-sakura".into(),
                    name: "樱花粉".into(),
                    shape: "petal".into(),
                    width: 24.0,
                    lifetime: 1400,
                    glow: 1.2,
                    spacing: 15.0,
                    start_color: "#FFD0E8".into(),
                    end_color: "#FF4D9D".into(),
                    spread_speed: 24.0,
                    rotation_speed: 2.4,
                    wander: 9.0,
                    fade_power: 1.2,
                    ..TrailPreset::default()
                },
                TrailPreset {
                    id: "trail-aurora".into(),
                    name: "极光绿".into(),
                    shape: "ribbon".into(),
                    width: 18.0,
                    lifetime: 750,
                    glow: 1.6,
                    spacing: 5.0,
                    start_color: "#A8FFDC".into(),
                    end_color: "#24C8A5".into(),
                    spread_speed: 4.0,
                    rotation_speed: 0.2,
                    follow_movement: true,
                    fade_power: 1.05,
                    ..TrailPreset::default()
                },
                TrailPreset {
                    id: "trail-sunset".into(),
                    name: "落日橙".into(),
                    shape: "spark".into(),
                    width: 20.0,
                    lifetime: 850,
                    glow: 1.3,
                    spacing: 11.0,
                    start_color: "#FFE29A".into(),
                    end_color: "#FF5C38".into(),
                    spread_speed: 42.0,
                    rotation_speed: 4.8,
                    follow_movement: true,
                    gravity: 32.0,
                    ..TrailPreset::default()
                },
                TrailPreset {
                    id: "trail-quantum".into(),
                    name: "量子光轨".into(),
                    shape: "circuit".into(),
                    width: 18.0,
                    lifetime: 950,
                    glow: 1.7,
                    spacing: 12.0,
                    start_color: "#8FFFF4".into(),
                    end_color: "#3578FF".into(),
                    spread_speed: 6.0,
                    rotation_speed: 0.2,
                    follow_movement: true,
                    fade_power: 1.15,
                    ..TrailPreset::default()
                },
                TrailPreset {
                    id: "trail-arcane".into(),
                    name: "秘法符文".into(),
                    shape: "rune".into(),
                    width: 20.0,
                    lifetime: 1250,
                    glow: 1.6,
                    spacing: 17.0,
                    start_color: "#F4C4FF".into(),
                    end_color: "#8B5CF6".into(),
                    spread_speed: 12.0,
                    rotation_speed: 1.2,
                    wander: 4.0,
                    fade_power: 1.2,
                    ..TrailPreset::default()
                },
            ],
            clicks: vec![
                click,
                ClickPreset {
                    id: "click-stars".into(),
                    name: "星芒紫".into(),
                    shape: "star".into(),
                    radius: 130.0,
                    duration: 800,
                    glow: 1.6,
                    count: 36,
                    color: "#F0B4FF".into(),
                    end_color: "#7C3AED".into(),
                    left: true,
                    right: true,
                    middle: false,
                    ..ClickPreset::default()
                },
                ClickPreset {
                    id: "click-firefly".into(),
                    name: "萤火绿".into(),
                    shape: "firefly".into(),
                    radius: 85.0,
                    duration: 1100,
                    glow: 1.3,
                    count: 24,
                    color: "#E7FF9B".into(),
                    end_color: "#22C55E".into(),
                    left: true,
                    right: false,
                    middle: false,
                    wander: 16.0,
                    ..ClickPreset::default()
                },
                ClickPreset {
                    id: "click-gold".into(),
                    name: "熔金橙".into(),
                    shape: "shard".into(),
                    radius: 110.0,
                    duration: 700,
                    glow: 1.5,
                    count: 32,
                    color: "#FFF0A6".into(),
                    end_color: "#FF5A36".into(),
                    left: true,
                    right: true,
                    middle: true,
                    gravity: 110.0,
                    ..ClickPreset::default()
                },
                ClickPreset {
                    id: "click-matrix".into(),
                    name: "矩阵脉冲".into(),
                    shape: "hex".into(),
                    radius: 120.0,
                    duration: 800,
                    glow: 1.7,
                    count: 32,
                    color: "#8FFFF4".into(),
                    end_color: "#3578FF".into(),
                    left: true,
                    right: true,
                    middle: false,
                    fade_power: 1.65,
                    ..ClickPreset::default()
                },
                ClickPreset {
                    id: "click-arcane".into(),
                    name: "秘法魔阵".into(),
                    shape: "magic".into(),
                    radius: 95.0,
                    duration: 1400,
                    glow: 1.6,
                    count: 32,
                    color: "#F4C4FF".into(),
                    end_color: "#8B5CF6".into(),
                    left: true,
                    right: true,
                    middle: false,
                    fade_power: 1.1,
                    ..ClickPreset::default()
                },
            ],
        }
    }
}

impl AppConfig {
    pub fn normalize(&mut self) {
        self.fps = match self.fps {
            0..=37 => 30,
            38..=52 => 45,
            53..=74 => 60,
            75..=104 => 90,
            _ => 120,
        };
        if self.trails.is_empty() {
            self.trails = AppConfig::default().trails;
        }
        if self.clicks.is_empty() {
            self.clicks = AppConfig::default().clicks;
        }
        let defaults = AppConfig::default();
        for preset in &defaults.trails {
            if !self.trails.iter().any(|item| item.id == preset.id) {
                self.trails.push(preset.clone());
            }
        }
        for preset in &defaults.clicks {
            if !self.clicks.iter().any(|item| item.id == preset.id) {
                self.clicks.push(preset.clone());
            }
        }
        self.trails.truncate(24);
        self.clicks.truncate(24);
        for preset in &mut self.trails {
            preset.name = clean_name(&preset.name);
            if preset.shape.is_empty() {
                preset.shape = match preset.id.as_str() {
                    "trail-sakura" => "petal",
                    "trail-aurora" => "ribbon",
                    "trail-sunset" => "spark",
                    "trail-quantum" => "circuit",
                    "trail-arcane" => "rune",
                    _ => "glow",
                }
                .into();
            }
            clean_trail_shape(&mut preset.shape);
            preset.width = finite(preset.width, 18.0).clamp(4.0, 64.0);
            preset.lifetime = preset.lifetime.clamp(150, 2500);
            preset.glow = finite(preset.glow, 1.0).clamp(0.2, 2.0);
            preset.spacing = finite(preset.spacing, 7.0).clamp(2.0, 40.0);
            preset.spread_speed = finite(preset.spread_speed, 18.0).clamp(0.0, 120.0);
            preset.rotation_speed = finite(preset.rotation_speed, 1.8).clamp(0.0, 12.0);
            preset.custom_text = clean_particle_text(&preset.custom_text);
            clean_custom_image(&mut preset.custom_image);
            preset.size_jitter = finite(preset.size_jitter, 0.25).clamp(0.0, 0.75);
            preset.gravity = finite(preset.gravity, 0.0).clamp(-120.0, 240.0);
            preset.wander = finite(preset.wander, 0.0).clamp(0.0, 60.0);
            preset.fade_power = finite(preset.fade_power, 1.45).clamp(0.6, 3.0);
            clean_color(&mut preset.start_color, "#62E8FF");
            clean_color(&mut preset.end_color, "#7657FF");
        }
        for preset in &mut self.clicks {
            preset.name = clean_name(&preset.name);
            if preset.shape.is_empty() {
                preset.shape = match preset.id.as_str() {
                    "click-stars" => "star",
                    "click-firefly" => "firefly",
                    "click-gold" => "shard",
                    "click-matrix" => "hex",
                    "click-arcane" => "magic",
                    _ => "ripple",
                }
                .into();
            }
            clean_click_shape(&mut preset.shape);
            preset.radius = finite(preset.radius, 100.0).clamp(30.0, 300.0);
            preset.duration = preset.duration.clamp(150, 2000);
            preset.glow = finite(preset.glow, 1.0).clamp(0.2, 2.0);
            preset.count = preset.count.clamp(6, 96);
            preset.custom_text = clean_particle_text(&preset.custom_text);
            clean_custom_image(&mut preset.custom_image);
            preset.size_jitter = finite(preset.size_jitter, 0.25).clamp(0.0, 0.75);
            preset.gravity = finite(preset.gravity, 0.0).clamp(-120.0, 240.0);
            preset.wander = finite(preset.wander, 0.0).clamp(0.0, 60.0);
            preset.fade_power = finite(preset.fade_power, 1.45).clamp(0.6, 3.0);
            clean_color(&mut preset.color, "#7DE8FF");
            clean_color(&mut preset.end_color, "#4B5FFF");
        }
        if !self.trails.iter().any(|item| item.id == self.active_trail_id) {
            self.active_trail_id = self.trails[0].id.clone();
        }
        if !self.clicks.iter().any(|item| item.id == self.active_click_id) {
            self.active_click_id = self.clicks[0].id.clone();
        }
    }
}

fn finite(value: f32, fallback: f32) -> f32 {
    if value.is_finite() { value } else { fallback }
}

fn clean_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        "未命名效果".into()
    } else {
        trimmed.chars().take(16).collect()
    }
}

fn clean_trail_shape(shape: &mut String) {
    if !matches!(
        shape.as_str(),
        "glow" | "petal" | "ribbon" | "spark" | "circuit" | "rune" | "heart" | "snowflake" | "diamond" | "text" | "image"
    ) {
        *shape = "glow".into();
    }
}

fn clean_click_shape(shape: &mut String) {
    if !matches!(
        shape.as_str(),
        "ripple" | "star" | "firefly" | "shard" | "hex" | "magic" | "heart" | "snowflake" | "diamond" | "text" | "image"
    ) {
        *shape = "ripple".into();
    }
}

fn clean_particle_text(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        "✦".into()
    } else {
        trimmed.chars().take(4).collect()
    }
}

fn clean_custom_image(image: &mut String) {
    if image.is_empty() {
        return;
    }
    let valid_prefix = [
        "data:image/png;base64,",
        "data:image/webp;base64,",
        "data:image/svg+xml;base64,",
    ]
    .iter()
    .any(|prefix| image.starts_with(prefix));
    let valid_payload = image
        .split_once(',')
        .map(|(_, payload)| {
            !payload.is_empty()
                && payload.bytes().all(|byte| {
                    byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/' | b'=')
                })
        })
        .unwrap_or(false);
    if image.len() > 700_000 || !valid_prefix || !valid_payload {
        image.clear();
    }
}

fn clean_color(color: &mut String, fallback: &str) {
    let valid = color.len() == 7
        && color.starts_with('#')
        && color[1..].chars().all(|character| character.is_ascii_hexdigit());
    if !valid {
        *color = fallback.into();
    } else {
        color.make_ascii_uppercase();
    }
}

pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn new() -> Result<Self, String> {
        let directory = dirs::data_local_dir()
            .ok_or_else(|| "无法确定本机应用数据目录".to_string())?
            .join("MouseGlow");
        fs::create_dir_all(&directory).map_err(|error| format!("无法创建配置目录：{error}"))?;
        Ok(Self {
            path: directory.join("config.json"),
        })
    }

    pub fn load(&self) -> AppConfig {
        let mut config = fs::read_to_string(&self.path)
            .ok()
            .and_then(|content| serde_json::from_str::<AppConfig>(&content).ok())
            .unwrap_or_default();
        config.normalize();
        config
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let content = serde_json::to_string_pretty(config)
            .map_err(|error| format!("无法序列化设置：{error}"))?;
        let temporary = self.path.with_extension("json.tmp");
        fs::write(&temporary, content).map_err(|error| format!("无法写入设置：{error}"))?;
        if self.path.exists() {
            fs::remove_file(&self.path).map_err(|error| format!("无法替换旧设置：{error}"))?;
        }
        fs::rename(temporary, &self.path).map_err(|error| format!("无法保存设置：{error}"))
    }

    #[cfg(test)]
    fn path(&self) -> &PathBuf {
        &self.path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_include_six_presets_each() {
        let config = AppConfig::default();
        assert_eq!(config.trails.len(), 6);
        assert_eq!(config.clicks.len(), 6);
        assert_eq!(config.fps, 60);
        assert!(config.master_enabled);
    }

    #[test]
    fn legacy_presets_receive_distinct_shapes() {
        let mut config = AppConfig::default();
        config.trails.retain(|preset| !matches!(preset.id.as_str(), "trail-quantum" | "trail-arcane"));
        config.clicks.retain(|preset| !matches!(preset.id.as_str(), "click-matrix" | "click-arcane"));
        for preset in &mut config.trails {
            preset.shape.clear();
        }
        for preset in &mut config.clicks {
            preset.shape.clear();
        }
        config.normalize();
        assert_eq!(config.trails.len(), 6);
        assert_eq!(config.clicks.len(), 6);
        assert_eq!(config.trails[0].shape, "glow");
        assert_eq!(config.trails[1].shape, "petal");
        assert_eq!(config.trails[2].shape, "ribbon");
        assert_eq!(config.trails[3].shape, "spark");
        assert_eq!(config.trails[4].shape, "circuit");
        assert_eq!(config.trails[5].shape, "rune");
        assert_eq!(config.clicks[0].shape, "ripple");
        assert_eq!(config.clicks[1].shape, "star");
        assert_eq!(config.clicks[2].shape, "firefly");
        assert_eq!(config.clicks[3].shape, "shard");
        assert_eq!(config.clicks[4].shape, "hex");
        assert_eq!(config.clicks[5].shape, "magic");
        config.trails[0].shape = "invalid".into();
        config.clicks[0].shape = "invalid".into();
        config.normalize();
        assert_eq!(config.trails[0].shape, "glow");
        assert_eq!(config.clicks[0].shape, "ripple");
    }

    #[test]
    fn normalization_limits_expensive_values() {
        let mut config = AppConfig::default();
        config.fps = 1000;
        config.trails[0].width = 5000.0;
        config.trails[0].spacing = 0.0;
        config.clicks[0].count = 5000;
        config.clicks[0].duration = 0;
        config.normalize();
        assert_eq!(config.fps, 120);
        assert_eq!(config.trails[0].width, 64.0);
        assert_eq!(config.trails[0].spacing, 2.0);
        assert_eq!(config.clicks[0].count, 96);
        assert_eq!(config.clicks[0].duration, 150);
    }

    #[test]
    fn normalization_repairs_invalid_selection_and_colors() {
        let mut config = AppConfig::default();
        config.active_trail_id = "missing".into();
        config.trails[0].start_color = "red".into();
        config.clicks[0].color = "javascript:alert(1)".into();
        config.normalize();
        assert_eq!(config.active_trail_id, "trail-nebula");
        assert_eq!(config.trails[0].start_color, "#62E8FF");
        assert_eq!(config.clicks[0].color, "#7DE8FF");
    }

    #[test]
    fn custom_particles_are_normalized_and_bounded() {
        let mut config = AppConfig::default();
        config.trails[0].shape = "image".into();
        config.trails[0].custom_text = "  🌸🌸🌸🌸🌸  ".into();
        config.trails[0].custom_image = "https://example.com/icon.svg".into();
        config.trails[0].size_jitter = 5.0;
        config.trails[0].gravity = f32::NAN;
        config.trails[0].wander = -10.0;
        config.trails[0].fade_power = 20.0;
        config.clicks[0].shape = "snowflake".into();
        config.clicks[0].custom_image = "data:image/png;base64,AA==".into();
        config.normalize();
        assert_eq!(config.trails[0].shape, "image");
        assert_eq!(config.trails[0].custom_text, "🌸🌸🌸🌸");
        assert!(config.trails[0].custom_image.is_empty());
        assert_eq!(config.trails[0].size_jitter, 0.75);
        assert_eq!(config.trails[0].gravity, 0.0);
        assert_eq!(config.trails[0].wander, 0.0);
        assert_eq!(config.trails[0].fade_power, 3.0);
        assert_eq!(config.clicks[0].shape, "snowflake");
        assert_eq!(config.clicks[0].custom_image, "data:image/png;base64,AA==");
    }

    #[test]
    fn legacy_custom_fields_use_safe_defaults() {
        let preset: TrailPreset = serde_json::from_str(r#"{"shape":"text"}"#)
            .expect("旧版预设应可读取");
        assert_eq!(preset.custom_text, "✦");
        assert!(preset.custom_image.is_empty());
        assert_eq!(preset.size_jitter, 0.25);
        assert_eq!(preset.fade_power, 1.45);
        assert!(!preset.original_color);
    }

    #[test]
    fn config_uses_user_local_data_directory() {
        let store = ConfigStore::new().expect("配置目录应可创建");
        assert!(store
            .path()
            .ends_with(PathBuf::from("MouseGlow").join("config.json")));
    }
}
