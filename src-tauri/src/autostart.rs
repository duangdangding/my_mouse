use crate::config::AppConfig;

#[cfg(windows)]
pub fn apply(config: &AppConfig) -> Result<(), String> {
    use std::env;
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    let run = current_user
        .open_subkey_with_flags(
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            winreg::enums::KEY_SET_VALUE,
        )
        .map_err(|error| format!("无法打开启动项注册表：{error}"))?;
    if config.launch_at_startup {
        let executable = env::current_exe()
            .map_err(|error| format!("无法确定程序路径：{error}"))?
            .to_string_lossy()
            .replace('"', "");
        let arguments = if config.silent_start { " --silent" } else { "" };
        run.set_value("MouseGlow", &format!("\"{executable}\"{arguments}"))
            .map_err(|error| format!("无法写入开机启动项：{error}"))
    } else {
        match run.delete_value("MouseGlow") {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(format!("无法移除开机启动项：{error}")),
        }
    }
}

#[cfg(target_os = "macos")]
pub fn apply(config: &AppConfig) -> Result<(), String> {
    use std::{env, fs};

    let directory = dirs::home_dir()
        .ok_or_else(|| "无法确定用户主目录".to_string())?
        .join("Library/LaunchAgents");
    let path = directory.join("com.mouseglow.desktop.plist");
    if !config.launch_at_startup {
        match fs::remove_file(path) {
            Ok(()) => return Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
            Err(error) => return Err(format!("无法移除登录启动项：{error}")),
        }
    }
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建启动项目录：{error}"))?;
    let executable = env::current_exe()
        .map_err(|error| format!("无法确定程序路径：{error}"))?
        .to_string_lossy()
        .to_string();
    let silent_argument = if config.silent_start {
        "    <string>--silent</string>\n"
    } else {
        ""
    };
    let plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.mouseglow.desktop</string>
  <key>ProgramArguments</key>
  <array>
    <string>{}</string>
{}  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
"#,
        xml_escape(&executable),
        silent_argument
    );
    fs::write(path, plist).map_err(|error| format!("无法写入登录启动项：{error}"))
}

#[cfg(target_os = "macos")]
fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(not(any(windows, target_os = "macos")))]
pub fn apply(_config: &AppConfig) -> Result<(), String> {
    Ok(())
}
