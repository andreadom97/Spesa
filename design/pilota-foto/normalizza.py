"""Normalizza le foto scontornate del pilota: ritaglio al riquadro dell'oggetto,
stesso ingombro (lato lungo = 88% del quadrato), centrate, WebP con trasparenza.
Uso: python3 normalizza.py  (legge sorgenti/, scrive normalizzate/)"""
from pathlib import Path
from PIL import Image, ImageStat

QUI = Path(__file__).parent
LATO, INGOMBRO = 200, 0.88

for src in sorted((QUI / 'sorgenti').glob('*.png')):
    im = Image.open(src).convert('RGBA')
    alfa = im.split()[3].point(lambda a: 255 if a > 8 else 0)
    im = im.crop(alfa.getbbox())
    s = LATO * INGOMBRO / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    tela = Image.new('RGBA', (LATO, LATO), (0, 0, 0, 0))
    tela.paste(im, ((LATO - im.width) // 2, (LATO - im.height) // 2), im)
    out = QUI / 'normalizzate' / f'{src.stem}.webp'
    tela.save(out, 'WEBP', quality=85, method=6)
    # luminosità media dell'oggetto (solo pixel opachi): misura della coerenza d'esposizione
    rgb = tela.convert('L'); m = tela.split()[3].point(lambda a: 255 if a > 128 else 0)
    lum = ImageStat.Stat(rgb, m).mean[0]
    print(f'{src.stem:10s} scala {s:.2f}  {out.stat().st_size/1024:5.1f} KB  luminosita {lum:5.1f}')
