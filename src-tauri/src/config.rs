use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TrailPreset {
    pub id: String,
    pub name: String,
    pub width: f32,
    pub lifetime: u32,
    pub glow: f32,
    pub spacing: f32,
    pub start_color: String,
    pub end_color: String,
    pub spread_speed: f32,
    pub rotation_speed: f32,
}

impl Default for TrailPreset {
    fn default() -> Self {
        Self {
            id: "trail-nebula".into(),
            name: "星云蓝".into(),
            width: 18.0,
            lifetime: 900,
            glow: 1.4,
            spacing: 7.0,
            start_color: "#62E8FF".into(),
            end_color: "#7657FF".into(),
            spread_speed: 18.0,
            rotation_speed: 1.8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ClickPreset {
    pub id: String,
    pub name: String,
    pub radius: f32,
    pub duration: u32,
    pub glow: f32,
    pub count: u16,
    pub color: String,
    pub end_color: String,
    pub left: bool,
    pub right: bool,
    pub middle: bool,
}

impl Default for ClickPreset {
    fn default() -> Self {
        Self {
            id: "click-ripple".into(),
            name: "涟漪蓝".into(),
            radius: 100.0,
            duration: 650,
            glow: 1.4,
            count: 28,
            color: "#7DE8FF".into(),
            end_color: "#4B5FFF".into(),
            left: true,
            right: false,
            middle: false,
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
        let click = ClickPreset::default();
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
                    width: 22.0,
                    lifetime: 1100,
                    glow: 1.2,
                    spacing: 8.0,
                    start_color: "#FFD0E8".into(),
                    end_color: "#FF4D9D".into(),
                    spread_speed: 22.0,
                    rotation_speed: 2.4,
                },
                TrailPreset {
                    id: "trail-aurora".into(),
                    name: "极光绿".into(),
                    width: 16.0,
                    lifetime: 1000,
                    glow: 1.6,
                    spacing: 6.0,
                    start_color: "#A8FFDC".into(),
                    end_color: "#24C8A5".into(),
                    spread_speed: 14.0,
                    rotation_speed: 1.2,
                },
                TrailPreset {
                    id: "trail-sunset".into(),
                    name: "落日橙".into(),
                    width: 26.0,
                    lifetime: 800,
                    glow: 1.3,
                    spacing: 9.0,
                    start_color: "#FFE29A".into(),
                    end_color: "#FF5C38".into(),
                    spread_speed: 28.0,
                    rotation_speed: 3.0,
                },
            ],
            clicks: vec![
                click,
                ClickPreset {
                    id: "click-stars".into(),
                    name: "星芒紫".into(),
                    radius: 130.0,
                    duration: 800,
                    glow: 1.6,
                    count: 36,
                    color: "#F0B4FF".into(),
                    end_color: "#7C3AED".into(),
                    left: true,
                    right: true,
                    middle: false,
                },
                ClickPreset {
                    id: "click-firefly".into(),
                    name: "萤火绿".into(),
                    radius: 85.0,
                    duration: 900,
                    glow: 1.3,
                    count: 24,
                    color: "#E7FF9B".into(),
                    end_color: "#22C55E".into(),
                    left: true,
                    right: false,
                    middle: false,
                },
                ClickPreset {
                    id: "click-gold".into(),
                    name: "熔金橙".into(),
                    radius: 110.0,
                    duration: 700,
                    glow: 1.5,
                    count: 32,
                    color: "#FFF0A6".into(),
                    end_color: "#FF5A36".into(),
                    left: true,
                    right: true,
                    middle: true,
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
        self.trails.truncate(24);
        self.clicks.truncate(24);
        for preset in &mut self.trails {
            preset.name = clean_name(&preset.name);
            preset.width = finite(preset.width, 18.0).clamp(4.0, 64.0);
            preset.lifetime = preset.lifetime.clamp(150, 2500);
            preset.glow = finite(preset.glow, 1.0).clamp(0.2, 2.0);
            preset.spacing = finite(preset.spacing, 7.0).clamp(2.0, 40.0);
            preset.spread_speed = finite(preset.spread_speed, 18.0).clamp(0.0, 120.0);
            preset.rotation_speed = finite(preset.rotation_speed, 1.8).clamp(0.0, 12.0);
            clean_color(&mut preset.start_color, "#62E8FF");
            clean_color(&mut preset.end_color, "#7657FF");
        }
        for preset in &mut self.clicks {
            preset.name = clean_name(&preset.name);
            preset.radius = finite(preset.radius, 100.0).clamp(30.0, 300.0);
            preset.duration = preset.duration.clamp(150, 2000);
            preset.glow = finite(preset.glow, 1.0).clamp(0.2, 2.0);
            preset.count = preset.count.clamp(6, 96);
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
    fn defaults_include_four_presets_each() {
        let config = AppConfig::default();
        assert_eq!(config.trails.len(), 4);
        assert_eq!(config.clicks.len(), 4);
        assert_eq!(config.fps, 60);
        assert!(config.master_enabled);
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
    fn config_uses_user_local_data_directory() {
        let store = ConfigStore::new().expect("配置目录应可创建");
        assert!(store.path().ends_with("MouseGlow\\config.json"));
    }
}
