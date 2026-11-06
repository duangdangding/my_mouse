const MAX_FILE_BYTES = 512 * 1024;
const MAX_IMAGE_SIZE = 1024;
const SVG_NS = "http://www.w3.org/2000/svg";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function sanitizeSvg(source: string): string {
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.localName !== "svg") {
    throw new Error("SVG 格式无效");
  }
  const forbidden = "script,foreignObject,iframe,object,embed,audio,video,canvas,meta,link,style,image,animate,animateMotion,animateTransform,set";
  document.querySelectorAll(forbidden).forEach((element) => element.remove());
  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const externalUrl = /url\(\s*['"]?\s*(?!#)/i.test(value);
      if (
        name.startsWith("on")
        || name === "src"
        || /javascript:|data:text\/html/i.test(value)
        || externalUrl
        || (name === "style" && /expression\s*\(/i.test(value))
        || ((name === "href" || name.endsWith(":href")) && !value.startsWith("#"))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  if (!document.documentElement.getAttribute("xmlns")) {
    document.documentElement.setAttribute("xmlns", SVG_NS);
  }
  return new XMLSerializer().serializeToString(document.documentElement);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("无法读取图片文件"));
    reader.readAsDataURL(file);
  });
}

function validateDimensions(source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > MAX_IMAGE_SIZE || image.naturalHeight > MAX_IMAGE_SIZE) {
        reject(new Error("图片宽高不能超过 1024 像素"));
      } else {
        resolve();
      }
    };
    image.onerror = () => reject(new Error("图片无法解码或内容无效"));
    image.src = source;
  });
}

export async function readCustomImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("图片文件不能超过 512 KB");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const type = file.type.toLowerCase() || (extension === "svg" ? "image/svg+xml" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "");
  let source: string;
  if (type === "image/svg+xml") {
    const sanitized = sanitizeSvg(await file.text());
    source = `data:image/svg+xml;base64,${toBase64(sanitized)}`;
  } else if (type === "image/png" || type === "image/webp") {
    source = await readAsDataUrl(file);
    if (!source.startsWith(`data:${type};base64,`)) throw new Error("图片格式无效");
  } else {
    throw new Error("仅支持 SVG、PNG 和 WebP 图片");
  }
  await validateDimensions(source);
  if (source.length > 700_000) throw new Error("图片编码后过大，请换用更简洁的图标");
  return source;
}
