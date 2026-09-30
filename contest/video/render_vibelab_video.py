from __future__ import annotations

import array
import math
import random
import subprocess
import sys
import wave
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "contest" / "tools"
sys.path.insert(0, str(TOOLS))
import imageio_ffmpeg  # noqa: E402


W, H = 1080, 1920
FPS = 24
DURATION = 16
FRAME_COUNT = FPS * DURATION
OUT_DIR = ROOT / "contest" / "video"
MEDIA = ROOT / "contest" / "media" / "stills"
OUTPUT = OUT_DIR / "huaxia-vibelab-demo-1080x1920.mp4"
AUDIO = OUT_DIR / "huaxia-ambient.wav"
COVER = ROOT / "contest" / "media" / "weibo-video-cover.png"

INK = (8, 10, 9)
PAPER = (231, 223, 201)
GOLD = (180, 154, 99)
CINNABAR = (169, 52, 36)
MUTED = (150, 143, 125)

FONT_DISPLAY = "C:/Windows/Fonts/simkai.ttf"
FONT_BODY = "C:/Windows/Fonts/msyh.ttc"
FONT_BOLD = "C:/Windows/Fonts/msyhbd.ttc"

display_88 = ImageFont.truetype(FONT_DISPLAY, 88)
display_72 = ImageFont.truetype(FONT_DISPLAY, 72)
display_52 = ImageFont.truetype(FONT_DISPLAY, 52)
body_34 = ImageFont.truetype(FONT_BODY, 34)
body_27 = ImageFont.truetype(FONT_BODY, 27)
bold_27 = ImageFont.truetype(FONT_BOLD, 27)
mono_20 = ImageFont.truetype(FONT_BODY, 20)


def ease_out(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return 1 - (1 - value) ** 3


def alpha_for(local: float, duration: float) -> float:
    fade = 0.42
    return min(1.0, local / fade, (duration - local) / fade)


def fit_screen(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    target = (972, 608)
    ratio = max(target[0] / image.width, target[1] / image.height)
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    left = (resized.width - target[0]) // 2
    top = (resized.height - target[1]) // 2
    return resized.crop((left, top, left + target[0], top + target[1]))


SCENES = [
    {
        "start": 0.0,
        "end": 3.2,
        "image": fit_screen(MEDIA / "02-beijing-panel.png"),
        "eyebrow": "VIBE CODING · DIGITAL HERITAGE",
        "title": "把全国博物馆\n收进一轴山河",
        "note": "二维中国画手卷 × 真实省界 × 可交互文物展厅",
    },
    {
        "start": 3.2,
        "end": 6.2,
        "image": fit_screen(MEDIA / "03-museum-gallery.png"),
        "eyebrow": "01 · INTERACTIVE ATLAS",
        "title": "轻触朱印\n从山河进入一省",
        "note": "省界、地名、经纬与港澳触控入口全部可用",
    },
    {
        "start": 6.2,
        "end": 9.2,
        "image": fit_screen(MEDIA / "04-artifact-detail.png"),
        "eyebrow": "02 · MUSEUM GALLERY",
        "title": "59座博物馆\n191件代表文物",
        "note": "支持搜索、朝代与类别筛选，以及 URL 直达",
    },
    {
        "start": 9.2,
        "end": 12.8,
        "image": fit_screen(MEDIA / "artifact-detail-final.png"),
        "eyebrow": "03 · SCROLL READING DESK",
        "title": "长卷不再缩成卡片\n而是可以徐徐阅览",
        "note": "卡片图与详情图分离，阅卷台支持拖动与进度反馈",
    },
    {
        "start": 12.8,
        "end": 16.0,
        "image": fit_screen(MEDIA / "02-beijing-panel.png"),
        "eyebrow": "HUAXIA MUSEUM HANDSCROLL",
        "title": "华夏博物志",
        "note": "从一轴舆图出发，重新发现博物馆里的中国",
    },
]


def make_background() -> Image.Image:
    bg = Image.new("RGB", (W, H), INK)
    pixels = bg.load()
    random.seed(27)
    for y in range(H):
        glow = max(0.0, 1 - abs(y - 940) / 1100)
        for x in range(W):
            radial = max(0.0, 1 - math.hypot((x - W / 2) / 780, (y - 930) / 1180))
            grain = random.choice((0, 0, 0, 1, -1))
            lift = int(10 * glow * radial)
            pixels[x, y] = (max(0, 8 + lift + grain), max(0, 10 + lift + grain), max(0, 9 + lift // 2 + grain))
    return bg.filter(ImageFilter.GaussianBlur(0.35))


BG = make_background()


def draw_brand(frame: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((64, 62, 150, 148), fill=CINNABAR, outline=PAPER, width=2)
    draw.rectangle((71, 69, 143, 141), outline=(221, 202, 166), width=1)
    draw.text((107, 106), "博", font=display_52, fill=PAPER, anchor="mm")
    draw.text((178, 74), "华 夏 博 物 志", font=bold_27, fill=PAPER)
    draw.text((180, 116), "CHINA MUSEUM HANDSCROLL", font=mono_20, fill=GOLD)
    draw.line((64, 176, 1016, 176), fill=(69, 65, 54), width=2)


def paste_screen(frame: Image.Image, shot: Image.Image, y: int, alpha: int) -> None:
    panel = Image.new("RGBA", (1008, 644), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rectangle((0, 0, 1007, 643), fill=(11, 11, 9, 242), outline=(180, 154, 99, 115), width=2)
    pd.rectangle((17, 17, 990, 626), outline=(231, 223, 201, 38), width=1)
    panel.paste(shot.convert("RGBA"), (18, 18))
    panel.putalpha(alpha)
    shadow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((52, y + 22, 1028, y + 670), 14, fill=(0, 0, 0, min(150, alpha)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    frame.alpha_composite(shadow)
    frame.alpha_composite(panel, (36, y))


def draw_scene_text(frame: Image.Image, scene: dict, local: float, duration: float, alpha: int) -> None:
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    slide = int(34 * (1 - ease_out(local / 0.7)))
    x = 66 + slide
    draw.text((x, 232), scene["eyebrow"], font=mono_20, fill=(*CINNABAR, alpha))
    title_font = display_88 if scene["start"] < 12.8 else display_72
    draw.multiline_text((x, 286), scene["title"], font=title_font, fill=(*PAPER, alpha), spacing=10)
    draw.line((x, 470, x + 122, 470), fill=(*CINNABAR, alpha), width=3)
    draw.text((x, 1492), scene["note"], font=body_27, fill=(*MUTED, alpha))
    frame.alpha_composite(layer)


def draw_stats(draw: ImageDraw.ImageDraw, t: float) -> None:
    y = 1616
    stats = (("34", "省级行政区"), ("59", "博物馆"), ("191", "代表文物"))
    for index, (number, label) in enumerate(stats):
        left = 64 + index * 328
        draw.line((left, y, left + 268, y), fill=(72, 68, 56), width=1)
        draw.text((left, y + 30), number, font=display_52, fill=GOLD)
        draw.text((left + 92, y + 49), label, font=body_27, fill=MUTED)
    draw.text((64, 1780), "DESIGN · REACT · SVG · AI ASSISTED WORKFLOW", font=mono_20, fill=(105, 99, 84))
    draw.text((1016, 1778), f"{min(100, int(t / DURATION * 100)):02d}%", font=mono_20, fill=CINNABAR, anchor="ra")
    draw.line((64, 1832, 1016, 1832), fill=(56, 54, 46), width=2)
    draw.line((64, 1832, 64 + int(952 * t / DURATION), 1832), fill=CINNABAR, width=4)


def render_frame(frame_index: int) -> Image.Image:
    t = frame_index / FPS
    scene = next((item for item in SCENES if item["start"] <= t < item["end"]), SCENES[-1])
    local = t - scene["start"]
    duration = scene["end"] - scene["start"]
    opacity = int(255 * max(0.0, min(1.0, alpha_for(local, duration))))
    frame = BG.convert("RGBA")
    draw = ImageDraw.Draw(frame)
    draw_brand(frame, draw)
    panel_y = 782 + int(34 * (1 - ease_out(local / 0.75)))
    paste_screen(frame, scene["image"], panel_y, opacity)
    draw_scene_text(frame, scene, local, duration, opacity)
    draw_stats(draw, t)
    if scene is SCENES[-1]:
        end_alpha = int(210 * ease_out(local / 0.8))
        draw.text((540, 1880), "#微博VibeLab#  #VibeVision#", font=body_27, fill=(*GOLD, end_alpha), anchor="mm")
    return frame.convert("RGB")


def build_audio() -> None:
    sample_rate = 44100
    total = sample_rate * DURATION
    samples = array.array("h")
    random.seed(9)
    transition_times = [0.0, 3.2, 6.2, 9.2, 12.8]
    for index in range(total):
        t = index / sample_rate
        value = 0.018 * math.sin(2 * math.pi * 55 * t) + 0.008 * math.sin(2 * math.pi * 110 * t)
        value += random.uniform(-0.0025, 0.0025)
        for hit in transition_times:
            delta = t - hit
            if 0 <= delta < 1.4:
                env = math.exp(-3.2 * delta)
                value += 0.055 * env * math.sin(2 * math.pi * 392 * delta)
                value += 0.025 * env * math.sin(2 * math.pi * 588 * delta)
        master = min(1.0, t / 0.8, (DURATION - t) / 1.0)
        samples.append(int(max(-1, min(1, value * master)) * 32767))
    with wave.open(str(AUDIO), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(samples.tobytes())


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    COVER.parent.mkdir(parents=True, exist_ok=True)
    render_frame(12).save(COVER, quality=95)
    build_audio()
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(AUDIO),
        "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "160k", "-shortest", str(OUTPUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for index in range(FRAME_COUNT):
            process.stdin.write(render_frame(index).tobytes())
            if index % FPS == 0:
                print(f"rendering {index // FPS:02d}/{DURATION}s", flush=True)
        process.stdin.close()
        stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
        return_code = process.wait()
        if return_code:
            raise RuntimeError(stderr[-4000:])
    finally:
        if process.stdin and not process.stdin.closed:
            process.stdin.close()
    print(f"created: {OUTPUT}")


if __name__ == "__main__":
    main()
