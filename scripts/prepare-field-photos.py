#!/usr/bin/env python3
"""Re-encode user field photos into site assets: strip EXIF/GPS, bound the long edge, emit sha256.

Usage:
    <python> scripts/prepare-field-photos.py <id>=<source> [<id>=<source> ...] --outdir public/artifact-sources/user-hubei
Creates <id>-detail.jpg (long edge 2048) and <id>-card.jpg (long edge 900) and prints a JSON
summary the caller can paste into src/data/images.json provenance records.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = dict(item[2:].split("=", 1) for item in sys.argv[1:] if item.startswith("--"))
    outdir = Path(flags.get("outdir", "public/artifact-sources/user-hubei"))
    outdir.mkdir(parents=True, exist_ok=True)
    pairs = [item.split("=", 1) for item in args if "=" in item]

    summary = []
    for artifact_id, source in pairs:
        source_path = Path(source)
        with Image.open(source_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            record = {"artifactId": artifact_id, "sourceFile": source_path.name, "sourcePixels": f"{width}x{height}", "sourceSha256": sha256_of(source_path), "outputs": {}}
            for role, long_edge, quality in (("detail", 2048, 90), ("card", 900, 88)):
                copy = image.copy()
                scale = long_edge / max(copy.width, copy.height)
                if scale < 1:
                    copy = copy.resize((max(1, round(copy.width * scale)), max(1, round(copy.height * scale))), Image.LANCZOS)
                target = outdir / f"{artifact_id}-{role}.jpg"
                copy.save(target, "JPEG", quality=quality, progressive=True, optimize=True)
                record["outputs"][role] = {
                    "src": f"/{target.as_posix().split('public/', 1)[1]}",
                    "pixels": f"{copy.width}x{copy.height}",
                    "bytes": target.stat().st_size,
                    "sha256": sha256_of(target),
                }
        summary.append(record)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
