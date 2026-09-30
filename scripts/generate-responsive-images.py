from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

from PIL import Image, ImageOps, features


CARD_WIDTHS = (240, 400, 640, 960)
DETAIL_WIDTHS = (480, 800, 1200, 1600)
PROFILES = {
    "card": {"widths": CARD_WIDTHS, "quality": 82},
    "detail": {"widths": DETAIL_WIDTHS, "quality": 88},
    "scroll-detail": {"widths": None, "quality": 92},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def candidate_widths(source_width: int, profile: str) -> list[int]:
    targets = PROFILES[profile]["widths"]
    if targets is None:
        return [source_width]
    cap = targets[-1]
    values = {width for width in targets if width < source_width}
    values.add(min(source_width, cap))
    return sorted(values)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create non-destructive responsive WebP artifact derivatives.")
    parser.add_argument("--root", required=True)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args()

    if not features.check("webp"):
        raise RuntimeError("This Pillow build has no WebP encoder support.")

    root = Path(args.root).resolve()
    public = (root / "public").resolve()
    output = Path(args.output).resolve()
    manifest_path = Path(args.manifest).resolve()
    if output != (public / "artifact-responsive").resolve():
        raise RuntimeError(f"Refusing unexpected output directory: {output}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    source_cache: dict[str, dict] = {}
    derivative_cache: dict[tuple[str, str, int], dict] = {}
    outputs: list[dict] = []
    artifacts: dict[str, dict] = {}

    def inspect_source(src: str) -> tuple[Path, dict]:
        if not src.startswith("/") or ".." in Path(src).parts:
            raise RuntimeError(f"Unsafe source path: {src}")
        local = (public / src.lstrip("/")).resolve()
        if public not in local.parents or not local.is_file():
            raise RuntimeError(f"Missing production image: {src}")
        cached = source_cache.get(src)
        if cached:
            return local, cached
        with Image.open(local) as image:
            width, height = ImageOps.exif_transpose(image).size
            image_format = image.format
        cached = {
            "src": src,
            "sha256": sha256(local),
            "bytes": local.stat().st_size,
            "width": width,
            "height": height,
            "format": image_format,
        }
        source_cache[src] = cached
        return local, cached

    def derive(src: str, profile: str) -> dict:
        local, source = inspect_source(src)
        candidates: list[dict] = []
        for width in candidate_widths(source["width"], profile):
            cache_key = (source["sha256"], profile, width)
            cached = derivative_cache.get(cache_key)
            if cached is None:
                height = max(1, round(source["height"] * width / source["width"]))
                filename = f'{source["sha256"][:16]}-{profile}-w{width}.webp'
                target = output / filename
                with Image.open(local) as opened:
                    image = ImageOps.exif_transpose(opened)
                    if width != source["width"]:
                        image = image.resize((width, height), Image.Resampling.LANCZOS)
                    if image.mode not in ("RGB", "RGBA"):
                        image = image.convert("RGBA" if "transparency" in image.info else "RGB")
                    image.save(target, "WEBP", quality=PROFILES[profile]["quality"], method=6, exact=True)
                cached = {
                    "src": f"/artifact-responsive/{filename}",
                    "width": width,
                    "height": height,
                    "bytes": target.stat().st_size,
                    "sha256": sha256(target),
                    "format": "WEBP",
                    "inputSrc": src,
                    "inputSha256": source["sha256"],
                    "profile": profile,
                    "quality": PROFILES[profile]["quality"],
                    "operations": ["EXIF orientation normalization", "WebP encoding"] + ([] if width == source["width"] else ["Lanczos proportional downscale"]),
                    "cropped": False,
                    "upscaled": False,
                    "aiGenerated": False,
                }
                derivative_cache[cache_key] = cached
                outputs.append(cached)
            candidates.append({key: cached[key] for key in ("src", "width", "height")})
        return {
            "originalSrc": src,
            "originalWidth": source["width"],
            "originalHeight": source["height"],
            "format": "image/webp",
            "candidates": candidates,
        }

    for artifact_id, artifact_plan in plan["artifacts"].items():
        artifact_entry = {"hold": artifact_plan["hold"], "shape": artifact_plan["shape"], "roles": {}}
        for role, role_plan in artifact_plan["roles"].items():
            profile = role_plan["profile"]
            entry = {
                "primary": derive(role_plan["primary"]["src"], profile),
                "primaryKind": role_plan["primary"]["kind"],
            }
            if role_plan.get("fallback"):
                entry["fallback"] = derive(role_plan["fallback"]["src"], profile)
                entry["fallbackKind"] = role_plan["fallback"]["kind"]
            artifact_entry["roles"][role] = entry
        artifacts[artifact_id] = artifact_entry

    source_bytes = sum(item["bytes"] for item in source_cache.values())
    derivative_bytes = sum(item["bytes"] for item in outputs)
    manifest = {
        "version": 1,
        "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "policy": {
            "format": "WebP",
            "originalFallback": True,
            "cardWidths": CARD_WIDTHS,
            "detailWidths": DETAIL_WIDTHS,
            "scrollDetail": "same pixel dimensions as selected original; WebP transcode only",
            "noCrop": True,
            "noUpscale": True,
            "noAiEnhancement": True,
        },
        "artifacts": artifacts,
        "sources": source_cache,
        "outputs": sorted(outputs, key=lambda item: item["src"]),
        "summary": {
            "artifactRecords": len(artifacts),
            "eligibleArtifacts": sum(bool(item["roles"]) for item in artifacts.values()),
            "heldArtifacts": sum(item["hold"] for item in artifacts.values()),
            "sourceAssets": len(source_cache),
            "sourceBytes": source_bytes,
            "derivatives": len(outputs),
            "derivativeBytes": derivative_bytes,
            "largestSourceBytes": max(item["bytes"] for item in source_cache.values()),
            "largestDerivativeBytes": max(item["bytes"] for item in outputs),
        },
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
