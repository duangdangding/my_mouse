from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src-tauri" / "icons"
OUTPUT.mkdir(parents=True, exist_ok=True)
SIZE = 1024
image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((64, 64, 960, 960), radius=230, fill=(126, 106, 239, 255))
for index, (x, y, radius, alpha) in enumerate([
    (185, 315, 42, 60),
    (265, 280, 50, 100),
    (350, 245, 58, 170),
]):
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(185, 235, 255, alpha))
points = [(420, 215), (720, 680), (555, 615), (505, 790), (425, 755), (472, 585), (345, 555)]
draw.polygon(points, fill=(255, 255, 255, 255))
image.resize((256, 256), Image.Resampling.LANCZOS).save(OUTPUT / "icon.png")
image.save(OUTPUT / "icon.icns", sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
image.save(OUTPUT / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(OUTPUT)
