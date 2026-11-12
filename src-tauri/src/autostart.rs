use crate::config::AppConfig;

#[cfg(windows)]
pub fn apply(config: &AppConfig) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        // 调试程序依赖 Vite 开发服务器，不能在登录系统时独立运行。
        let _ = config;
        remove_debug_autostart()
    }
    #[cfg(not(debug_assertions))]
    {
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
}

#[cfg(all(windows, debug_assertions))]
pub fn remove_debug_autostart() -> Result<(), String> {
    use std::env;
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let executable = env::current_exe().map_err(|error| format!("无法确定程序路径：{error}"))?;
    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    let run = current_user
        .open_subkey_with_flags(
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            winreg::enums::KEY_QUERY_VALUE | winreg::enums::KEY_SET_VALUE,
        )
        .map_err(|error| format!("无法打开启动项注册表：{error}"))?;
    let command: String = match run.get_value("MouseGlow") {
        Ok(command) => command,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("无法读取开机启动项：{error}")),
    };
    if command_targets_executable(&command, &executable) {
        run.delete_value("MouseGlow")
            .map_err(|error| format!("无法移除调试版开机启动项：{error}"))?;
    }
    Ok(())
}

#[cfg(all(windows, debug_assertions))]
fn command_targets_executable(command: &str, executable: &std::path::Path) -> bool {
    let executable = executable.to_string_lossy().replace('"', "");
    let quoted = format!("\"{executable}\"");
    command == executable
        || command.strip_prefix(&quoted).is_some_and(|arguments| {
            arguments.is_empty()
                || arguments
                    .chars()
                    .next()
                    .is_some_and(|character| character.is_whitespace())
        })
}

#[cfg(target_os = "macos")]
pub fn apply(config: &AppConfig) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        // 调试程序依赖 Vite 开发服务器，不能在登录系统时独立运行。
        let _ = config;
        remove_debug_autostart()
    }
    #[cfg(not(debug_assertions))]
    {
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
}

#[cfg(all(target_os = "macos", debug_assertions))]
pub fn remove_debug_autostart() -> Result<(), String> {
    use std::{env, fs};

    let path = dirs::home_dir()
        .ok_or_else(|| "无法确定用户主目录".to_string())?
        .join("Library/LaunchAgents/com.mouseglow.desktop.plist");
    let content = match fs::read_to_string(&path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(format!("无法读取登录启动项：{error}")),
    };
    let executable = env::current_exe()
        .map_err(|error| format!("无法确定程序路径：{error}"))?
        .to_string_lossy()
        .to_string();
    let marker = format!("<string>{}</string>", xml_escape(&executable));
    if content.contains(&marker) {
        fs::remove_file(path).map_err(|error| format!("无法移除调试版登录启动项：{error}"))?;
    }
    Ok(())
}

#[cfg(not(any(
    all(windows, debug_assertions),
    all(target_os = "macos", debug_assertions)
)))]
pub fn remove_debug_autostart() -> Result<(), String> {
    Ok(())
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

#[cfg(all(test, windows, debug_assertions))]
mod tests {
    use super::command_targets_executable;
    use std::path::Path;

    #[test]
    fn 只匹配当前调试程序的启动命令() {
        let executable = Path::new(r"F:\project\target\debug\mouse-glow.exe");
        assert!(command_targets_executable(
            &format!("\"{}\" --silent", executable.display()),
            executable
        ));
        assert!(command_targets_executable(
            &executable.to_string_lossy(),
            executable
        ));
        assert!(!command_targets_executable(
            r#""C:\Program Files\MouseGlow\mouse-glow.exe" --silent"#,
            executable
        ));
        assert!(!command_targets_executable(
            r#""F:\project\target\debug\mouse-glow.exe.backup" --silent"#,
            executable
        ));
    }
}
