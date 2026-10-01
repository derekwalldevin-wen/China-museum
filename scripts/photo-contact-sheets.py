#!/usr/bin/env python3
"""Build numbered contact sheets from the photo inbox so batches can be reviewed at a glance.

Usage:
    <python> scripts/photo-contact-sheets.py <folder> <outdir> [--cols 3] [--rows 3] [--cell 460]
Each cell is labelled with the 1-based index and the HHMMSS from the file name.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"}


def load_font(size: int):
    for candidate in [
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    folder = Path(args[0]) if args else Path("inbox/hubei")
    outdir = Path(args[1]) if len(args) > 1 else Path(".tmp/contact-sheets")

    def flag(name: str, default: int) -> int:
        for item in flags:
            if item.startswith(f"--{name}="):
                return int(item.split("=", 1)[1])
        return default

    cols, rows, cell = flag("cols", 3), flag("rows", 3), flag("cell", 460)
    outdir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTS)
    font = load_font(26)
    per_sheet = cols * rows
    sheets = []
    for start in range(0, len(files), per_sheet):
        chunk = files[start:start + per_sheet]
        sheet = Image.new("RGB", (cols * cell, rows * cell), (18, 18, 20))
        draw = ImageDraw.Draw(sheet)
        for offset, path in enumerate(chunk):
            index = start + offset + 1
            col, row = offset % cols, offset // cols
            with Image.open(path) as image:
                image = image.convert("RGB")
                image.thumbnail((cell - 12, cell - 12))
                x = col * cell + (cell - image.width) // 2
                y = row * cell + (cell - image.height) // 2
                sheet.paste(image, (x, y))
            stamp = path.stem.split("_")[-1] if "_" in path.stem else ""
            label = f"#{index}  {stamp}"
            draw.rectangle([col * cell + 4, row * cell + 4, col * cell + 250, row * cell + 36], fill=(0, 0, 0))
            draw.text((col * cell + 10, row * cell + 6), label, fill=(255, 235, 120), font=font)
            draw.rectangle([col * cell, row * cell, col * cell + cell - 1, row * cell + cell - 1], outline=(70, 70, 76))
        target = outdir / f"sheet-{start // per_sheet + 1:02d}.jpg"
        sheet.save(target, quality=88)
        sheets.append((target, chunk[0].name, chunk[-1].name))

    print(f"images: {len(files)} | sheets: {len(sheets)} | grid: {cols}x{rows} cell {cell}px")
    for target, first, last in sheets:
        print(f"  {target.name}  {first}  →  {last}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
