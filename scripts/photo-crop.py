#!/usr/bin/env python3
"""Crop one region of one photo and upscale it, for transcribing a museum label exactly.

Usage:
    <python> scripts/photo-crop.py <image> <out.jpg> --box=x0,y0,x1,y1 [--width=1600]
Box fractions are relative to the image size (0-1). Default box targets the lower label band.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = dict(item[2:].split("=", 1) for item in sys.argv[1:] if item.startswith("--"))
    source = Path(args[0])
    target = Path(args[1]) if len(args) > 1 else Path('.tmp/crop.jpg')
    box = [float(value) for value in flags.get('box', '0.05,0.60,0.95,0.95').split(',')]
    width = int(flags.get('width', 1600))

    with Image.open(source) as image:
        image = image.convert('RGB')
        w, h = image.size
        crop = image.crop((int(w * box[0]), int(h * box[1]), int(w * box[2]), int(h * box[3])))
        scale = width / crop.width
        crop = crop.resize((width, max(1, int(crop.height * scale))), Image.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        crop.save(target, 'JPEG', quality=93)
    print(f'{target}  {crop.width}x{crop.height}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
