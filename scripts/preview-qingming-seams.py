import sys
from pathlib import Path
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
root = Path(__file__).resolve().parents[1]
out = root / 'assets/user-qingming'
parts = []
for number in (7, 8, 9, 10):
    file = next(Path(sys.argv[1]).glob(f'*_{number}.jpg'))
    with Image.open(file) as image:
        image.draft('RGB', (100, 100))
        image.thumbnail((100000, 600), Image.Resampling.LANCZOS)
        parts.append(image.convert('RGB').copy())
sheet = Image.new('RGB', (1240, 1930), '#eee5d0')
draw = ImageDraw.Draw(sheet)
for index in range(3):
    draw.text((10, index * 640 + 5), f'{index+7} right | {index+8} left', fill='black')
    left, right = parts[index:index+2]
    sheet.paste(left.crop((left.width-600, 0, left.width, 600)), (10, index*640+25))
    sheet.paste(right.crop((0, 0, 600, 600)), (610, index*640+25))
    draw.line((610,index*640+25,610,index*640+625), fill='red')
sheet.save(out / 'seams.jpg', quality=92)
