#!/usr/bin/env python3
"""Crop the label (展签) strip from photos and stack several per sheet so the text is readable.

Usage:
    <python> scripts/photo-label-strips.py <folder> <outdir> --from=1 --to=12 --per-sheet=4
The strip is taken from the bottom band of each photo (where museum labels usually sit) and
upscaled so the Chinese name and the English line stay legible after the reader downscales.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def load_font(size: int):
    for candidate in [r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"]:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = dict(item[2:].split("=", 1) for item in sys.argv[1:] if item.startswith("--"))
    folder = Path(args[0]) if args else Path("inbox/hubei")
    outdir = Path(args[1]) if len(args) > 1 else Path(".tmp/label-strips")
    start = int(flags.get("from", 1))
    end = int(flags.get("to", 10 ** 6))
    per_sheet = int(flags.get("per-sheet", 5))
    band_top = float(flags.get("band-top", 0.60))
    band_bottom = float(flags.get("band-bottom", 0.92))
    outdir.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTS)
    selection = [(index, path) for index, path in enumerate(files, start=1) if start <= index <= end]
    font = load_font(30)
    sheets = []
    for offset in range(0, len(selection), per_sheet):
        chunk = selection[offset:offset + per_sheet]
        strips = []
        for index, path in chunk:
            with Image.open(path) as image:
                image = image.convert("RGB")
                width, height = image.size
                crop = image.crop((int(width * 0.05), int(height * band_top), int(width * 0.95), int(height * band_bottom)))
                scale = 1500 / crop.width
                crop = crop.resize((1500, max(1, int(crop.height * scale))), Image.LANCZOS)
                strips.append((index, crop))
        total_height = sum(strip.height + 42 for _, strip in strips)
        sheet = Image.new("RGB", (1500, total_height), (12, 12, 14))
        draw = ImageDraw.Draw(sheet)
        y = 0
        for index, strip in strips:
            draw.rectangle([0, y, 1500, y + 40], fill=(0, 0, 0))
            draw.text((10, y + 4), f"#{index}", fill=(255, 220, 90), font=font)
            y += 42
            sheet.paste(strip, (0, y))
            y += strip.height
        target = outdir / f"labels-{start:02d}-{end:02d}-{offset // per_sheet + 1:02d}.jpg"
        sheet.save(target, quality=92)
        sheets.append(target)
    print(f"photos in range: {len(selection)} | sheets: {len(sheets)}")
    for target in sheets:
        print(f"  {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
