#!/usr/bin/env python3
"""Scan the photo inbox and write a manifest the import pipeline can work from.

Usage (bundled Python has Pillow):
    <python> scripts/photo-inbox-manifest.py inbox/hubei

For every image it records: file name, byte size, pixel dimensions, sha256 (dedup key),
camera / lens / shot time when EXIF provides them, and — importantly — whether the file
still carries GPS coordinates. Privacy rule: GPS presence is reported, never copied
into the manifest, and the import step re-encodes pixels so EXIF never ships.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

from PIL import ExifTags, Image

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".bmp"}
TAG_NAMES = {value: key for key, value in ExifTags.TAGS.items()}


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def exif_summary(image: Image.Image) -> dict:
    try:
        raw = image.getexif()
    except Exception:  # pragma: no cover - defensive for odd files
        return {"hasGps": "no"}
    if not raw:
        return {"hasGps": "no"}
    summary: dict[str, str] = {}
    for tag, value in raw.items():
        name = ExifTags.TAGS.get(tag, str(tag))
        if name in {"Make", "Model", "DateTime", "DateTimeOriginal", "LensModel", "Software"}:
            summary[name] = str(value).strip()
        elif name == "GPSInfo":
            summary["hasGps"] = "yes"
    if "GPSInfo" not in summary:
        summary["hasGps"] = "no"
    return summary


def main() -> int:
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "inbox/hubei")
    if not folder.exists():
        print(f"folder not found: {folder}")
        return 1

    entries = []
    seen: dict[str, str] = {}
    for path in sorted(folder.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in EXTS:
            continue
        digest = sha256_of(path)
        record: dict[str, object] = {
            "file": path.name,
            "relativePath": str(path.relative_to(folder)).replace("\\", "/"),
            "bytes": path.stat().st_size,
            "sha256": digest,
            "duplicateOf": seen.get(digest),
        }
        seen.setdefault(digest, path.name)
        try:
            with Image.open(path) as image:
                record["width"], record["height"] = image.size
                record["format"] = image.format
                record["exif"] = exif_summary(image)
        except Exception as error:  # pragma: no cover - report rather than crash
            record["error"] = f"{type(error).__name__}: {error}"
        entries.append(record)

    output = {
        "folder": str(folder),
        "scannedAt": datetime.now().isoformat(timespec="seconds"),
        "count": len(entries),
        "duplicates": sum(1 for entry in entries if entry.get("duplicateOf")),
        "withGps": sum(1 for entry in entries if (entry.get("exif") or {}).get("hasGps") == "yes"),
        "entries": entries,
    }
    target = folder / "manifest.json"
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"scanned folder : {folder}")
    print(f"images         : {output['count']}")
    print(f"duplicates     : {output['duplicates']}")
    print(f"still with GPS : {output['withGps']}  (import re-encodes pixels and drops EXIF)")
    print(f"manifest       : {target}")
    for entry in entries:
        exif = entry.get("exif") or {}
        camera = " ".join(part for part in [exif.get("Make", ""), exif.get("Model", "")] if part).strip()
        shot = exif.get("DateTimeOriginal") or exif.get("DateTime") or ""
        print(f"  {entry['file'][:44]:<46} {entry.get('width', '?')}x{entry.get('height', '?')}  gps={exif.get('hasGps', '?')}  {camera} {shot}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
