"""Verify delivery strips against the unchanged, audited reading raster."""
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'src/data/qingming-tiles.json').read_text(encoding='utf-8'))
assert manifest == json.loads((root / 'public/data/image-processing/gg-qmsh-tiles-2026-09-17.json').read_text(encoding='utf-8'))
source_path = root / 'public' / manifest['source'].lstrip('/')
assert sha256(source_path.read_bytes()).hexdigest() == manifest['sourceSha256']
source_record = json.loads((root / 'public' / manifest['sourceProcessingManifest'].lstrip('/')).read_text(encoding='utf-8'))
assert manifest['sourceSha256'] == source_record['detail']['sha256']
assert source_record['tileDeliveryManifest'] == '/data/image-processing/gg-qmsh-tiles-2026-09-17.json'
assert manifest['artifactId'] == 'gg-qmsh' and not manifest['upscaled'] and not manifest['aiGenerated'] and not manifest['retouched']
overview = manifest['overview']
overview_path = root / 'public' / overview['src'].lstrip('/')
assert sha256(overview_path.read_bytes()).hexdigest() == overview['sha256'] and overview_path.stat().st_size == overview['bytes']
with Image.open(overview_path) as overview_image:
    assert overview_image.size == (overview['width'], overview['height']) == (2400, 116)
with Image.open(source_path) as source:
    assert source.size == (manifest['width'], manifest['height'])
    cursor = 0
    for tile in manifest['tiles']:
        assert tile['index'] == cursor // 800 and tile['x'] == cursor and tile['height'] == source.height
        crop = source.crop((cursor, 0, cursor + tile['width'], source.height)).convert('RGB')
        for format_name in ['webp', 'jpeg']:
            info = tile[format_name]
            path = root / 'public' / info['src'].lstrip('/')
            payload = path.read_bytes()
            assert len(payload) == info['bytes'] and sha256(payload).hexdigest() == info['sha256']
            with Image.open(path) as derived:
                assert derived.size == crop.size
                difference = ImageStat.Stat(ImageChops.difference(crop, derived.convert('RGB'))).mean
                assert max(difference) < 12, (tile['index'], format_name, difference)
        cursor += tile['width']
    assert cursor == source.width == 16000
print(f"verified {len(manifest['tiles'])} contiguous original-scale tiles and both encoded fallbacks")
