import { readFileSync } from "node:fs";

const expected = process.argv[2];
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const cargo = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const tauri = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const cargoVersion = cargo.match(/^version = "([^"]+)"$/m)?.[1];
const versions = [packageJson.version, cargoVersion, tauri.version];
const errors = [];

if (new Set(versions).size !== 1) errors.push(`版本号不一致：${versions.join(" / ")}`);
if (expected && `v${packageJson.version}` !== expected) errors.push(`标签 ${expected} 与版本 ${packageJson.version} 不一致`);
if (!tauri.plugins?.updater?.pubkey || tauri.plugins.updater.pubkey.includes("REPLACE")) errors.push("更新公钥未配置");
if (!tauri.plugins?.updater?.endpoints?.[0]?.endsWith("/latest.json")) errors.push("更新 endpoint 必须指向 latest.json");
if (!tauri.bundle?.createUpdaterArtifacts) errors.push("未启用更新产物");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`发布检查通过：v${packageJson.version}`);
