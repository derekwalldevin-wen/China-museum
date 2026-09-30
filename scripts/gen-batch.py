# 批量生成缺图文物 AI 配图（直连 agent-gw SDK，带重试，断点续跑）
# 用法: python scripts/gen-batch.py <start> <count>
import json, subprocess, sys, time
from pathlib import Path

from agent_gw import AgentGwClient
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'artifacts'
OUT.mkdir(parents=True, exist_ok=True)
missing = json.loads((ROOT / 'scripts' / 'missing-images.json').read_text(encoding='utf-8'))

SHAPE_DESC = {
    'ding': 'an ancient Chinese bronze ritual tripod cauldron (ding)',
    'zun': 'an ancient Chinese bronze wine vessel (zun)',
    'bell': 'an ancient Chinese bronze bell',
    'sword': 'an ancient Chinese bronze sword',
    'axe': 'an ancient Chinese bronze ceremonial axe (yue)',
    'vase': 'a Chinese porcelain vase',
    'bowl': 'a Chinese ceramic bowl',
    'pot': 'a Chinese ceramic pot or ewer',
    'scroll': 'a classical Chinese handscroll painting, shown partially unrolled vertically',
    'jade': 'a carved Chinese jade object',
    'buddha': 'a Chinese Buddhist stone sculpture',
    'figure': 'a Chinese pottery figurine',
    'mask': 'an ancient Chinese mask',
    'tree': 'an ancient Chinese bronze sacred tree',
    'drum': 'an ancient Chinese drum',
    'lamp': 'an ancient Chinese bronze oil lamp',
    'cup': 'a Chinese ritual cup',
    'seal': 'a Chinese seal stamp with knob',
    'stele': 'a Chinese carved stone stele or stone relief',
    'textile': 'a piece of ancient Chinese embroidered silk textile',
    'gold': 'an ancient Chinese gold ornament',
    'bone': 'an ancient Chinese oracle bone with carved characters',
    'horse': 'a Chinese horse sculpture',
    'chariot': 'an ancient Chinese chariot model',
    'lacquer': 'an ancient Chinese lacquerware object, black and red lacquer',
    'misc': 'an ancient Chinese artifact',
}

STYLE = ('Traditional Chinese gongbi fine-brush illustration with mineral pigment colors, '
         'painterly 2D illustration, single object centered in vertical composition, '
         'deep charcoal-black background with subtle rice paper texture, '
         'soft warm spotlight from above, delicate gold and vermilion line accents, '
         'quiet museum night gallery atmosphere, refined and elegant, '
         'historically accurate shape and ornament, no text, no letters, no watermark, no frame, no border')


def build_prompt(a):
    subject = SHAPE_DESC.get(a['shape'], SHAPE_DESC['misc'])
    return (f"{subject}, \"{a['name']}\" from {a['dynasty']} dynasty China, "
            f"Chinese {a['cat']} artifact. {a['story'][:90]}. {STYLE}")


def gen_one(client, a):
    jpg = OUT / f"{a['id']}.jpg"
    prompt = build_prompt(a)
    for attempt in range(3):
        try:
            resp = client.tools.generate_image(
                prompt, ratio='2:3', resolution='1K',
                background='IMAGE_BACKGROUND_OPAQUE', timeout=240)
            media = resp.json().get('media') or {}
            url, mime = media.get('url'), (media.get('mime_type') or '')
            if not url:
                raise RuntimeError('no media url')
            ext = '.png' if 'png' in mime.lower() else '.jpg'
            tmp = OUT / f"{a['id']}.tmp{ext}"
            subprocess.run(['curl', '-fsSL', url, '-o', str(tmp)], timeout=240, check=True)
            im = Image.open(tmp).convert('RGB')
            s = 900 / max(im.size)
            if s < 1:
                im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
            im.save(jpg, quality=82, optimize=True)
            tmp.unlink()
            return True
        except Exception as e:
            print(f"RETRY{attempt + 1} {a['id']}: {str(e)[:110]}", flush=True)
            time.sleep(2 + attempt * 3)
    return False


def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    count = int(sys.argv[2]) if len(sys.argv) > 2 else len(missing)
    batch = missing[start:start + count]
    ok = fail = 0
    with AgentGwClient(timeout=300) as client:
        for a in batch:
            jpg = OUT / f"{a['id']}.jpg"
            if jpg.exists():
                print(f"SKIP {a['id']}", flush=True)
                ok += 1
                continue
            if gen_one(client, a):
                print(f"OK   {a['id']} {a['name']}", flush=True)
                ok += 1
            else:
                print(f"FAIL {a['id']} {a['name']}", flush=True)
                fail += 1
    print(f"DONE batch {start}..{start + len(batch) - 1}: ok={ok} fail={fail}", flush=True)


if __name__ == '__main__':
    main()
