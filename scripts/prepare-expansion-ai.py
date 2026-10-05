"""Non-destructive delivery encoding only; AI pixels originate from the built-in image tool."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
tranche = sys.argv[1] if len(sys.argv) > 1 else '01'
if not tranche.isdigit() or len(tranche) != 2:
    raise ValueError('Expected two-digit tranche')
inputs = json.loads((root / f'assets/expansion/ai-generation-tranche-{tranche}.json').read_text(encoding='utf-8'))
output = root / f'public/artifact-expansion/tranche-{tranche}'
originals = root / f'assets/expansion/originals/tranche-{tranche}'
records = []
output.mkdir(parents=True, exist_ok=True)
originals.mkdir(parents=True, exist_ok=True)
digest = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
for item in inputs['items']:
    identifier = item['id']
    if not all(char.isascii() and (char.isalnum() or char == '-') for char in identifier):
        raise ValueError('Unsafe artifact id')
    if item['visualReview'] != 'approved':
        raise ValueError(f'Unreviewed image: {identifier}')
    source = Path(item['originalFile'])
    retained = originals / f'{identifier}.png'
    if retained.exists() and digest(retained) != digest(source):
        raise ValueError(f'Refusing to overwrite original: {identifier}')
    shutil.copy2(source, retained)
    with Image.open(retained) as source_image:
        image = source_image.convert('RGB')
        original_size = list(image.size)
        roles = {}
        for role, cap in [('card', 640), ('detail', 1200)]:
            derived = image.copy()
            derived.thumbnail((cap, cap), Image.Resampling.LANCZOS)
            filename = f'{identifier}-{role}.jpg'
            destination = output / filename
            derived.save(destination, 'JPEG', quality=92, optimize=True)
            roles[role] = {'src': f'/artifact-expansion/tranche-{tranche}/{filename}', 'width': derived.width, 'height': derived.height, 'sha256': digest(destination), 'bytes': destination.stat().st_size, 'upscaled': False, 'aiGenerated': True, 'operation': '等比缩小、JPEG编码；不裁切、不锐化、不补绘'}
    records.append({**item, 'originalFile': f'assets/expansion/originals/tranche-{tranche}/{identifier}.png', 'originalSha256': digest(retained), 'originalDimensions': original_size, 'roles': roles})
batch_date = '20261005' if tranche in ('04', '05', '06') else '20261004'
manifest = {'version': f'expansion-tranche-{tranche}-{batch_date}', 'generator': 'OpenAI built-in imagegen', 'note': '原始文件为AI生成，不是馆藏照片；网页派生仅缩放编码。历史细节未核，不能用于认读纹饰或铭文。', 'items': records}
destination = root / f'assets/expansion/processing-tranche-{tranche}.json'
destination.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
public_manifest = root / f'public/data/image-processing/expansion-tranche-{tranche}.json'
public_manifest.parent.mkdir(parents=True, exist_ok=True)
public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'images': len(records), 'originalsPreserved': True}, ensure_ascii=False))
