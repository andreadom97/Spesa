/**
 * Controllo della geometria delle icone a due toni (spec 2026-10-03 §5). Per ogni chiave con
 * `sil` disegna in Chrome headless contorno e sagoma su una tela 480×480 (scala 20) e conta:
 * - i pixel del contorno (tratto 0,9) fuori dalla sagoma (pieno + bordo a 1,0: tolleranza 0,5 = mezzo spessore più mezzo pixel della tela): sotto l'1%;
 * - i pixel della sagoma fuori dalla fascia 2–22 (mezza unità di tolleranza): zero;
 * - i fori: pixel dove l'unione dei sottopercorsi di `sil` riempiti uno per uno è piena e la sagoma `nonzero` è vuota
 *   (due sottopercorsi sovrapposti con verso opposto); ammessi fino a 40 px di antialias su 230 400.
 * Uso: npx tsx scripts/controlla-icone.ts [chiave …]   — senza chiavi controlla tutte quelle con `sil`.
 * Non gira nella CI: serve mentre si disegnano le icone.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TRACCIATI } from '../src/components/tracciati-ingredienti';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** `rotate(a cx cy)` → [a, cx, cy]; null senza rotazione. */
export function leggiRotazione(rot?: string): [number, number, number] | null {
  if (!rot) return null;
  const m = /^rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/.exec(rot.trim());
  if (!m) throw new Error(`rotazione non riconosciuta: ${rot}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

interface Voce { chiave: string; sil: string; d: string; rot: [number, number, number] | null }
interface Esito { chiave: string; fuori: number; totale: number; oltreBordo: number; fori: number; ok: boolean }

function pagina(voci: Voce[]): string {
  return `<!doctype html><meta charset="utf-8"><pre id="esito"></pre><script>
const S = 20, N = 24 * S;
const voci = ${JSON.stringify(voci)};
function tela(rot, disegna) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  x.scale(S, S);
  if (rot) { x.translate(rot[1], rot[2]); x.rotate(rot[0] * Math.PI / 180); x.translate(-rot[1], -rot[2]); }
  x.lineCap = 'round'; x.lineJoin = 'round';
  disegna(x);
  return x.getImageData(0, 0, N, N).data;
}
const esiti = voci.map(({ chiave, sil, d, rot }) => {
  const contorno = tela(rot, (x) => { x.lineWidth = 0.9; x.stroke(new Path2D(d)); });
  const sagomaLarga = tela(rot, (x) => { const p = new Path2D(sil); x.fill(p); x.lineWidth = 1.0; x.stroke(p); });
  const sagoma = tela(rot, (x) => x.fill(new Path2D(sil)));
  const unione = tela(rot, (x) => { for (const sub of sil.split(/(?=[Mm])/)) x.fill(new Path2D(sub)); });
  let fuori = 0, totale = 0, oltreBordo = 0, fori = 0;
  const lo = 1.5 * S, hi = 22.5 * S;
  for (let i = 3; i < contorno.length; i += 4) {
    if (contorno[i] > 128) { totale++; if (sagomaLarga[i] < 64) fuori++; }
    if (unione[i] > 128 && sagoma[i] < 64) fori++;
    if (sagoma[i] > 128) {
      const p = (i - 3) / 4, px = p % N, py = Math.floor(p / N);
      if (px < lo || px > hi || py < lo || py > hi) oltreBordo++;
    }
  }
  return { chiave, fuori, totale, oltreBordo, fori, ok: fuori / Math.max(totale, 1) < 0.01 && oltreBordo === 0 && fori <= 40 };
});
document.getElementById('esito').textContent = JSON.stringify(esiti);
</script>`;
}

function controlla(chiavi: string[]): Esito[] {
  const voci: Voce[] = chiavi.map((chiave) => {
    const t = TRACCIATI[chiave as keyof typeof TRACCIATI];
    if (!t?.sil) throw new Error(`${chiave}: nessuna sagoma (sil)`);
    return { chiave, sil: t.sil, d: t.d, rot: leggiRotazione(t.rot) };
  });
  const file = join(mkdtempSync(join(tmpdir(), 'icone-')), 'controllo.html');
  writeFileSync(file, pagina(voci));
  const dom = execFileSync(
    CHROME,
    ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(file).href],
    { encoding: 'utf8', maxBuffer: 1 << 26 },
  );
  const m = /<pre id="esito">([\s\S]*?)<\/pre>/.exec(dom);
  if (!m || m[1] === '') throw new Error('Chrome non ha restituito un esito');
  return JSON.parse(m[1]) as Esito[];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const richieste = process.argv.slice(2);
  const chiavi = richieste.length > 0 ? richieste : Object.keys(TRACCIATI).filter((k) => TRACCIATI[k as keyof typeof TRACCIATI]?.sil);
  const esiti = controlla(chiavi);
  for (const e of esiti) {
    const quota = ((100 * e.fuori) / Math.max(e.totale, 1)).toFixed(2);
    console.log(`${e.ok ? 'ok  ' : 'NO  '} ${e.chiave.padEnd(18)} contorno fuori ${quota}%  oltre il bordo ${e.oltreBordo}px  fori ${e.fori}px`);
  }
  if (esiti.some((e) => !e.ok)) process.exit(1);
}
