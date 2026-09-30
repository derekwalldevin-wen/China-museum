"""Read-only source inspection; only small review previews are written in the project."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("directory")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / "assets" / "user-qingming"
out.mkdir(parents=True, exist_ok=True)
Image.MAX_IMAGE_PIXELS = None  # User-selected large JPEGs; decode at JPEG draft resolution.
records = []
previews = []
for file in sorted(Path(args.directory).glob("*.jpg"), key=lambda p: int(p.stem.rsplit("_", 1)[1])):
    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    with Image.open(file) as image:
        size = image.size
        exif = image.getexif()
        metadata = {str(tag): str(exif[tag]) for tag in (270, 305, 315, 33432) if tag in exif}
        image.draft("RGB", (1800, 280))
        image.thumbnail((1800, 280), Image.Resampling.LANCZOS)
        preview = image.convert("RGB")
        number = file.stem.rsplit("_", 1)[1]
        preview.save(out / f"preview-{number}.jpg", quality=88)
        previews.append((number, preview.copy()))
    records.append({"filename": file.name, "width": size[0], "height": size[1], "bytes": file.stat().st_size,
                    "sha256": digest.hexdigest(), "metadata": metadata})
sheet = Image.new("RGB", (1840, len(previews) * 330), "#eee5d0")
draw = ImageDraw.Draw(sheet)
for index, (number, image) in enumerate(previews):
    draw.text((20, index * 330 + 8), f"FILE {number}", fill="black")
    sheet.paste(image, (20, index * 330 + 32))
sheet.save(out / "contact-sheet.jpg", quality=90)
(out / "source-inventory.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"files": len(records), "preview": str(out / "contact-sheet.jpg")}, ensure_ascii=True))
