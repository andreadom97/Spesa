"""Costruisce pilota.html da modello.html: foto normalizzate in data URI e tracciati delle icone di oggi."""
import base64, json
from pathlib import Path
QUI = Path(__file__).parent
foto = {p.stem: 'data:image/webp;base64,' + base64.b64encode(p.read_bytes()).decode()
        for p in sorted((QUI / 'normalizzate').glob('*.webp'))}
html = (QUI / 'modello.html').read_text()
html = html.replace('__FOTO__', json.dumps(foto)).replace('__TRACCIATI__', (QUI / 'tracciati.json').read_text().strip())
(QUI / 'pilota.html').write_text(html)
print(f"pilota.html {len(html)/1024:.0f} KB, {len(foto)} foto")
