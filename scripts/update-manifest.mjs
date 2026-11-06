import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const [command, ...args] = process.argv.slice(2);
const repository = "duangdangding/my_mouse";
const requiredPlatforms = ["windows-x86_64", "darwin-aarch64", "darwin-x86_64"];

function createManifest(tag, platform, directory, output) {
  if (!requiredPlatforms.includes(platform)) throw new Error(`未知平台：${platform}`);
  const files = readdirSync(directory);
  let artifact = platform === "windows-x86_64"
    ? files.find((name) => name.endsWith(".nsis.zip")) ?? files.find((name) => name.endsWith("-setup.exe"))
    : files.find((name) => name.endsWith(".app.tar.gz"));
  if (!artifact) throw new Error(`${directory} 中找不到 ${platform} 更新产物`);
  let signaturePath = join(directory, `${artifact}.sig`);
  if (!existsSync(signaturePath)) throw new Error(`找不到更新签名：${signaturePath}`);
  if (platform.startsWith("darwin-")) {
    const architecture = platform === "darwin-aarch64" ? "aarch64" : "x64";
    if (!artifact.endsWith(`_${architecture}.app.tar.gz`)) {
      const renamed = artifact.replace(/\.app\.tar\.gz$/, `_${architecture}.app.tar.gz`);
      renameSync(join(directory, artifact), join(directory, renamed));
      renameSync(signaturePath, join(directory, `${renamed}.sig`));
      artifact = renamed;
      signaturePath = join(directory, `${artifact}.sig`);
    }
  }
  const manifest = {
    version: tag.replace(/^v/, ""),
    notes: `鼠标流光 ${tag.replace(/^v/, "")}`,
    pub_date: new Date().toISOString(),
    platforms: {
      [platform]: {
        signature: readFileSync(signaturePath, "utf8").trim(),
        url: `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(artifact)}`,
      },
    },
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${platform} 更新产物：${artifact}`);
}

function manifestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return manifestFiles(path);
    return entry.name.startsWith("manifest-") && entry.name.endsWith(".json") ? [path] : [];
  });
}

function artifactNames(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? artifactNames(path) : [entry.name];
  });
}

function mergeManifests(directory, output) {
  const files = manifestFiles(directory);
  if (!files.length) throw new Error("找不到任何平台更新清单片段");
  const manifests = files.map((file) => JSON.parse(readFileSync(file, "utf8")));
  const latest = {
    version: manifests[0].version,
    notes: manifests[0].notes,
    pub_date: manifests.map((item) => item.pub_date).sort().at(-1),
    platforms: Object.assign({}, ...manifests.map((item) => item.platforms)),
  };
  const artifacts = artifactNames(directory);
  for (const platform of requiredPlatforms) {
    if (!latest.platforms[platform]) throw new Error(`更新清单缺少平台：${platform}`);
    if (!latest.platforms[platform].signature || !latest.platforms[platform].url) {
      throw new Error(`${platform} 更新签名或地址为空`);
    }
    const artifact = decodeURIComponent(latest.platforms[platform].url.split("/").at(-1));
    if (!artifacts.includes(artifact) || !artifacts.includes(`${artifact}.sig`)) {
      throw new Error(`${platform} 的实际更新包或签名缺失：${artifact}`);
    }
  }
  for (const architecture of ["aarch64", "x64"]) {
    if (!artifacts.some((name) => name.endsWith(`_${architecture}.dmg`))) {
      throw new Error(`发布目录缺少 ${architecture} macOS DMG 安装包`);
    }
  }
  if (!artifacts.some((name) => name.endsWith("-setup.exe"))) {
    throw new Error("发布目录缺少 Windows NSIS 安装包");
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(latest, null, 2)}\n`);
  console.log(`已合并 ${files.length} 个平台清单，并确认三平台安装包、更新包和签名齐全`);
}

function copyReleaseNotes(tag, destination) {
  const source = `release-notes-${tag.replace(/^v/, "")}.md`;
  if (!existsSync(source)) throw new Error(`找不到 Release 说明：${source}`);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

if (command === "create") {
  createManifest(...args);
} else if (command === "merge") {
  mergeManifests(...args);
} else if (command === "notes") {
  copyReleaseNotes(...args);
} else {
  throw new Error("用法：create <标签> <平台> <产物目录> <输出>；merge <输入目录> <输出>；notes <标签> <输出>");
}
