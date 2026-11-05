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

#[cfg(not(windows))]
pub fn apply(_config: &AppConfig) -> Result<(), String> {
    Ok(())
}
