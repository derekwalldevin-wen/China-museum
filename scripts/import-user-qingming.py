"""Derive a bounded web reading copy from inspected user originals, without touching inputs."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('directory')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source_dir = Path(args.directory)
inventory = json.loads((root / 'assets/user-qingming/source-inventory.json').read_text(encoding='utf-8'))
Image.MAX_IMAGE_PIXELS = None
target = root / 'public/artifact-sources/user-qingming'
target.mkdir(parents=True, exist_ok=True)

def sha256(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

sources = []
parts = []
card = None
crop_widths = [50000, 38778, 50000, 19000]
total_width = sum(crop_widths)
height = round(7595 * 16000 / total_width)
joined = Image.new('RGB', (16000, height))
x = 0
for number, crop_width in zip((7, 8, 9, 10), crop_widths):
    record = next(row for row in inventory if row['filename'].endswith(f'_{number}.jpg'))
    file = source_dir / record['filename']
    assert sha256(file) == record['sha256'], f'Original changed: {file.name}'
    with Image.open(file) as opened:
        assert opened.size == (record['width'], record['height'])
        opened.draft('RGB', (100, 100))
        decoded = opened.convert('RGB')
        sx, sy = decoded.width / record['width'], decoded.height / record['height']
        crop = decoded.crop((0, 0, round(crop_width * sx), decoded.height))
        next_x = round(sum(crop_widths[:len(sources)+1]) * 16000 / total_width)
        joined.paste(crop.resize((next_x-x, height), Image.Resampling.LANCZOS), (x, 0))
        if number == 8:
            card_box = [27000, 160, 36500, 7440]
            card = decoded.crop(tuple(round(v * (sx if i % 2 == 0 else sy)) for i, v in enumerate(card_box)))
            card.thumbnail((960, 960), Image.Resampling.LANCZOS)
        sources.append({**record, 'selectedCrop': [0, 0, crop_width, record['height']]})
        parts.append({'sourceSha256': record['sha256'], 'sourceCrop': [0, 0, crop_width, record['height']],
                      'outputX': x, 'outputWidth': next_x-x, 'outputHeight': height})
        x = next_x
detail_file = target / 'gg-qmsh-reading.jpg'
card_file = target / 'gg-qmsh-hongqiao-card.jpg'
joined.save(detail_file, 'JPEG', quality=92, subsampling=0, optimize=True)
card.save(card_file, 'JPEG', quality=92, subsampling=0, optimize=True)

def output(file, size, operations):
    return {'src': '/' + file.relative_to(root / 'public').as_posix(), 'width': size[0], 'height': size[1],
            'bytes': file.stat().st_size, 'sha256': sha256(file), 'operations': operations,
            'upscaled': False, 'aiGenerated': False, 'retouched': False}

manifest = {
    'version': 1, 'artifactId': 'gg-qmsh', 'importedAt': '2026-09-16',
    'origin': 'User supplied local files; no source URL or license documentation supplied',
    'authorizationStatus': 'pending', 'assetMatchStatus': 'pending',
    'originalsPreserved': True, 'sources': sources,
    'coverage': 'Painting image from files 7-10 with small mounting margins; not the complete mounted scroll or inscriptions. Files 3 and 6 were not supplied.',
    'seamReview': '7/8, 8/9 and 9/10 visually reviewed with boundary previews; no gap filling, mirroring, overlap blending or invented details.',
    'detail': output(detail_file, joined.size, ['JPEG decoder 1/8 reduction', 'crop final mounting after x=19000 in file 10', 'proportional Lanczos downscale', 'edge concatenation in 7,8,9,10 order', 'JPEG quality 92; no color adjustment']),
    'detailParts': parts,
    'card': {**output(card_file, card.size, ['JPEG decoder 1/8 reduction', 'Hongqiao crop from file 8', 'proportional Lanczos downscale to width 960', 'JPEG quality 92; no color adjustment']),
             'sourceSha256': sources[1]['sha256'], 'sourceCrop': card_box},
}
manifest_dir = root / 'public/data/image-processing'
manifest_dir.mkdir(parents=True, exist_ok=True)
encoded = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
(root / 'assets/user-qingming/import-manifest.json').write_text(encoded, encoding='utf-8')
(manifest_dir / 'gg-qmsh-user-2026-09-16.json').write_text(encoded, encoding='utf-8')
print(json.dumps({'detail':manifest['detail'], 'card':manifest['card']}, ensure_ascii=True, indent=2))
