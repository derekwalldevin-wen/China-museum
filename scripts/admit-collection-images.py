"""Admit only manually matched, openly licensed photos; preserve all older assets.

Run with the bundled Pillow runtime. Originals are immutable audit evidence.
This incremental generator never removes existing responsive files.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'assets/provenance/collection-image-review-2026-09-22'
PUBLIC = ROOT / 'public'
spec = importlib.util.spec_from_file_location('responsive', ROOT / 'scripts/generate-responsive-images.py')
responsive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(responsive)


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def digest(data):
    return hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def main():
    review = read(ARCHIVE / 'decisions.json')
    downloads = {item['id']: item for item in read(ARCHIVE / 'downloads.json')['results']}
    images_path = ROOT / 'src/data/images.json'
    images = read(images_path)
    manifest_path = ROOT / 'assets/responsive-images/manifest.json'
    plan_path = ROOT / 'assets/responsive-images/plan.json'
    manifest, plan = read(manifest_path), read(plan_path)
    ids = {item['id'] for item in review['decisions']}
    baseline = {
        'oldImageRecordsSha256': digest({k: v for k, v in images.items() if k not in ids}),
        'oldResponsiveArtifactsSha256': digest({k: v for k, v in manifest['artifacts'].items() if k not in ids}),
        'oldImageRecords': len(images) - len(ids),
    }
    baseline_path = ARCHIVE / 'unchanged-baseline.json'
    if baseline_path.exists():
        assert read(baseline_path) == baseline, 'Older records changed since first admission'
    else:
        write(baseline_path, baseline)

    for item in review['decisions']:
        artifact_id = item['id']
        info = images[artifact_id]
        authority = info['sourceReview']['authorityUrl']
        info['sourceReview'].update(reviewedAt=review['reviewedAt'], note=item['reason'])
        if item['status'] != 'approved':
            assert info['illustrationOnly'] and not info['src']
            continue
        original = downloads[item['downloadId']]
        assert original.get('licenseUrl') and original['license'] in ('CC0', 'CC BY-SA 2.5', 'CC BY-SA 4.0')
        original_file = ARCHIVE / 'originals' / (item['downloadId'] + '.jpg')
        raw = original_file.read_bytes()
        assert hashlib.sha1(raw).hexdigest() == original['sha1']
        assert hashlib.sha256(raw).hexdigest() == original['sha256']
        src = f'/artifact-sources/collection-20260922/{artifact_id}.jpg'
        target = PUBLIC / src.lstrip('/')
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(original_file) as opened:
            picture = ImageOps.exif_transpose(opened).convert('RGB')
            original_size = picture.size
            width = min(1600, picture.width)
            size = (width, round(picture.height * width / picture.width))
            if size != picture.size:
                picture = picture.resize(size, Image.Resampling.LANCZOS)
            picture.save(target, 'JPEG', quality=92, optimize=True)
        source = dict(src=src, sha256=responsive.sha256(target), bytes=target.stat().st_size,
                      width=size[0], height=size[1], format='JPEG')
        manifest['sources'][src] = source
        # Idempotent: replace only this admitted source's previous derivative entries.
        manifest['outputs'] = [output for output in manifest['outputs'] if output['inputSrc'] != src]
        new_outputs, roles, planned_roles = [], {}, {}
        for profile in ('card', 'detail'):
            candidates = []
            for width in responsive.candidate_widths(size[0], profile):
                height = max(1, round(size[1] * width / size[0]))
                filename = f'{source["sha256"][:16]}-{profile}-w{width}.webp'
                output_path = PUBLIC / 'artifact-responsive' / filename
                with Image.open(target) as opened:
                    picture = opened if width == size[0] else opened.resize((width, height), Image.Resampling.LANCZOS)
                    picture.save(output_path, 'WEBP', quality=responsive.PROFILES[profile]['quality'], method=6, exact=True)
                output = dict(src='/artifact-responsive/' + filename, width=width, height=height,
                              bytes=output_path.stat().st_size, sha256=responsive.sha256(output_path), format='WEBP',
                              inputSrc=src, inputSha256=source['sha256'], profile=profile,
                              quality=responsive.PROFILES[profile]['quality'],
                              operations=['EXIF orientation normalization', 'WebP encoding'] + ([] if width == size[0] else ['Lanczos proportional downscale']),
                              cropped=False, upscaled=False, aiGenerated=False)
                new_outputs.append(output)
                candidates.append({key: output[key] for key in ('src', 'width', 'height')})
            roles[profile] = dict(primary=dict(originalSrc=src, originalWidth=size[0], originalHeight=size[1], format='image/webp', candidates=candidates), primaryKind='source')
            planned_roles[profile] = dict(profile=profile, primary=dict(src=src, kind='source'))
        manifest['artifacts'][artifact_id]['roles'] = roles
        plan['artifacts'][artifact_id]['roles'] = planned_roles
        manifest['outputs'].extend(new_outputs)
        license_url = ('https://creativecommons.org/publicdomain/zero/1.0/' if original['license'] == 'CC0' else original['licenseUrl'].rstrip('/') + '/')
        modifications = '本站仅EXIF方向归一、等比缩小至不超过1600像素宽、JPEG/WebP编码；不裁切、不放大、不修复、不AI补绘。'
        modifications += item.get('priorModifications', '')
        processing_url = f'/data/image-processing/collection-20260922-{artifact_id}.json'
        provenance = dict(type='source', sourceUrl=original['sourceUrl'], sourceTitle=original['title'].removeprefix('File:'),
                          author=item['author'], institution=item['institution'], license=original['license'], licenseUrl=license_url,
                          verifiedAt=review['reviewedAt'], linkCheckedAt=review['reviewedAt'], authorizationStatus='verified',
                          assetMatchStatus='verified', evidenceNote=item['reason'], assetSha256=source['sha256'], modifications=modifications,
                          originalSourceUrl=original['originalUrl'], originalSha1=original['sha1'], originalSha256=original['sha256'],
                          processingManifest=processing_url)
        credit = f'{item["author"]} / Wikimedia Commons / {original["license"]}'
        variant = dict(src=src, kind='source', fit='contain', credit=credit, provenance=provenance,
                       review=dict(visual='approved', historical='approved', reviewedAt=review['reviewedAt'],
                                   reviewedBy='馆方图与开放许可原件比对', note=item['reason']))
        images[artifact_id] = dict(src=src, credit=credit, variants=dict(card=variant, detail=variant), sourceReview=info['sourceReview'])
        write(PUBLIC / processing_url.lstrip('/'), dict(
            version=1, artifactId=artifact_id, authorityUrl=authority, reviewedAt=review['reviewedAt'],
            sourceTitle=provenance['sourceTitle'], sourceUrl=original['sourceUrl'], author=item['author'],
            license=original['license'], licenseUrl=license_url, derivativeLicense=original['license'],
            original=dict(url=original['originalUrl'], sha1=original['sha1'], sha256=original['sha256'],
                          bytes=original['bytes'], width=original_size[0], height=original_size[1]),
            display=source, derivatives=new_outputs, modifications=modifications,
            priorModifications=item.get('priorModifications', '源文件上传前处理情况未另行确认'),
            cropped=False, upscaled=False, aiGenerated=False, matchEvidence=item['reason']))

    manifest['outputs'].sort(key=lambda item: item['src'])
    summary = manifest['summary']
    summary.update(eligibleArtifacts=sum(bool(v['roles']) for v in manifest['artifacts'].values()),
                   illustrationOnlyArtifacts=sum(bool(v.get('illustrationOnly')) for v in images.values()),
                   sourceAssets=len(manifest['sources']), sourceBytes=sum(v['bytes'] for v in manifest['sources'].values()),
                   derivatives=len(manifest['outputs']), derivativeBytes=sum(v['bytes'] for v in manifest['outputs']))
    manifest['generatedAt'] = '2026-09-22T00:00:00Z'
    write(images_path, images)
    write(manifest_path, manifest)
    write(plan_path, plan)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
