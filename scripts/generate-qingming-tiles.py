"""Losslessly crop the existing reading raster into independently delivered strips.

The source, original eight files, and provenance record are never overwritten.
WebP is a delivery encoding; same-pixel JPEG strips are kept as browser fallbacks.
"""
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/artifact-sources/user-qingming/gg-qmsh-reading.jpg'
OUTPUT = ROOT / 'public/artifact-scroll-tiles/gg-qmsh'
MANIFEST = ROOT / 'src/data/qingming-tiles.json'
PUBLIC_MANIFEST = ROOT / 'public/data/image-processing/gg-qmsh-tiles-2026-09-17.json'
SOURCE_SHA = '52420153f1afc0c982a173354ed60cf56f8ca3685fe395956a349589e813b7c6'
TILE_WIDTH = 800


def digest(data):
    return sha256(data).hexdigest()


def main():
    assert digest(SOURCE.read_bytes()) == SOURCE_SHA, 'Source changed: refuse to derive tiles'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    tiles = []
    with Image.open(SOURCE) as source:
        assert source.size == (16000, 770), source.size
        overview = source.resize((2400, 116), Image.Resampling.LANCZOS)
        overview_buffer = BytesIO()
        overview.save(overview_buffer, format='WEBP', quality=72)
        overview_payload = overview_buffer.getvalue()
        overview_name = f'overview-{digest(overview_payload)[:16]}.webp'
        (OUTPUT / overview_name).write_bytes(overview_payload)
        for index, x in enumerate(range(0, source.width, TILE_WIDTH)):
            width = min(TILE_WIDTH, source.width - x)
            tile = source.crop((x, 0, x + width, source.height))
            files = {}
            for extension, fmt in [('webp', 'WEBP'), ('jpg', 'JPEG')]:
                buffer = BytesIO()
                tile.save(buffer, format=fmt, quality=92)
                payload = buffer.getvalue()
                name = f'{index:02d}-{digest(payload)[:16]}.{extension}'
                (OUTPUT / name).write_bytes(payload)
                files[extension] = {'src': f'/artifact-scroll-tiles/gg-qmsh/{name}', 'bytes': len(payload), 'sha256': digest(payload)}
            tiles.append({'index': index, 'x': x, 'width': width, 'height': source.height, 'webp': files['webp'], 'jpeg': files['jpg']})
    manifest = {
        'version': 1, 'artifactId': 'gg-qmsh',
        'source': '/artifact-sources/user-qingming/gg-qmsh-reading.jpg',
        'sourceSha256': SOURCE_SHA, 'sourceProcessingManifest': '/data/image-processing/gg-qmsh-user-2026-09-16.json',
        'width': 16000, 'height': 770, 'operations': ['crop existing reading raster at original pixel coordinates', 'WebP/JPEG quality 92 delivery encoding'],
        'overview': {'src': f'/artifact-scroll-tiles/gg-qmsh/{overview_name}', 'width': 2400, 'height': 116, 'bytes': len(overview_payload), 'sha256': digest(overview_payload), 'role': 'temporary low-resolution placeholder; never presented as high-resolution detail'},
        'upscaled': False, 'aiGenerated': False, 'retouched': False, 'tiles': tiles,
    }
    encoded = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
    MANIFEST.write_text(encoded, encoding='utf-8')
    PUBLIC_MANIFEST.write_text(encoded, encoding='utf-8')
    print(f'{len(tiles)} tiles; first WebP {tiles[0]["webp"]["bytes"]} bytes; total WebP {sum(t["webp"]["bytes"] for t in tiles)} bytes')


if __name__ == '__main__':
    main()
