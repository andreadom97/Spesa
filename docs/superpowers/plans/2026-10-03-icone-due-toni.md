# Icone ingrediente a due toni — piano di implementazione

> **Per chi esegue:** SOTTO-SKILL OBBLIGATORIA: superpowers:subagent-driven-development (consigliata) o superpowers:executing-plans, un task alla volta. I passi usano le caselle (`- [ ]`).
>
> **Il codice di test di questo piano è una bozza da verificare** (lezione della fase 2: tredici difetti nei test scritti nel piano, nessuno nel codice di produzione). Prima di fidarti di un test verde, controlla che fallisca per la ragione giusta.

**Obiettivo:** sostituire le icone ingrediente di solo tratto con icone a due toni con ombra incisa, su tutte le 64 chiavi, senza cambiare né il catalogo né la posizione sulle tessere.

**Architettura:** il disegno di ogni chiave guadagna una sagoma chiusa (`sil`) e i dettagli diventano gruppi (`dd: string[]`). Il trattamento (pieno, contorno, dettagli, ombra a tratteggio mascherata) esce da un unico componente. Fino allo scambio finale il componente nuovo vive accanto al vecchio (`IconaDueToni`), così la suite resta verde mentre si ridisegnano le 58 chiavi. Due script fuori dalla CI accompagnano la produzione: uno controlla la geometria in Chrome headless, l'altro genera il foglio di approvazione.

**Tecnologie:** Next 16.3.3, React 19.2.8, TypeScript, Vitest + Testing Library (jsdom), tsx per gli script, Chrome headless (`/Applications/Google Chrome.app`).

**Spec:** [`docs/superpowers/specs/2026-10-03-icone-due-toni-design.md`](../specs/2026-10-03-icone-due-toni-design.md)

**Ramo:** `icone-due-toni`, già creato, con la spec e i pilota committati (`5c0226e`, `eefe22c`).

## Vincoli globali

- Griglia 24; sagoma fra 2 e 22 (dopo la rotazione).
- Contorno `0.9`, dettagli `0.5`, ombra `0.34` ogni `1.2` a 45°; ombra = sagoma meno sagoma spostata di `(-2, -2.2)`, fuori dalla rotazione.
- Taglie **60** (tessera) e **96** (protagonista); taglio dal bordo **−11** e **−18**.
- Stati: `area` = pieno colore d'area a 0,72 · `hero` e `tinta` = pieno `rgba(255,255,255,0.7)` · `spento` = pieno `rgba(20,22,58,0.06)` e tratti `#9A9AA6` a opacità 0,55. Negli altri stati i tratti sono nel tono medio d'area (`tonoMedioArea`) a opacità 1.
- `dd`: da uno a cinque gruppi, nessuno vuoto. Un gruppo è un tipo di segno (le squame, i fori). Fori fino a raggio 0,3.
- `sil`: ogni sottopercorso finisce in `Z`, riempimento `nonzero`, nessun foro; copre il contorno (tolleranza mezzo spessore, 0,45). Gli elementi lineari del contorno (gambi, piccioli, raggi) hanno dentro `sil` una forma sottile chiusa larga almeno 1.
- Riflesso ad arco a sinistra sugli oggetti tondi, oggetti allungati in diagonale, tratto identificativo fuori dalla fascia tagliata (x o y oltre 19,2).
- Catalogo, sinonimi, `trovaIcona`, BLOCCHI e alone: invariati.
- Nessuna migrazione, nessun token nuovo in `globals.css`.
- Copy dei commenti in italiano, come il resto del codice.
- Il merge su main è un deploy in produzione: ci vuole l'ok esplicito di Andrea.

---

## File

| File | Ruolo | Task |
|---|---|---|
| `src/components/tracciati-ingredienti.ts` | Il disegno delle 64 chiavi: tipo `Tracciato` e dati | 1, 2, 6–10, 11 |
| `src/components/IconaDueToni.tsx` (nuovo, temporaneo) | Il componente a due toni, finché non sostituisce il vecchio | 4, eliminato nell'11 |
| `src/components/IconaIngrediente.tsx` | Il componente usato dalle tessere | 1, 11 |
| `src/components/__tests__/icona-due-toni.test.tsx` (nuovo, temporaneo) | Test del componente nuovo | 4, fuso nell'11 |
| `src/components/__tests__/icona-ingrediente.test.tsx` | Test del componente e del catalogo dei tracciati | 1, 2, 11 |
| `scripts/controlla-icone.ts` (nuovo) | Controllo geometrico in Chrome headless | 3 |
| `scripts/__tests__/controlla-icone.test.ts` (nuovo) | Test della parte pura dello script | 3 |
| `scripts/foglio-icone.ts` (nuovo) | Genera il foglio di approvazione | 5, 11 |
| `design/foglio-icone/tracciati-oggi.json` (nuovo) | Le icone di oggi congelate, per il confronto nel foglio | 1 |
| `design/foglio-icone/foglio.html` (generato) | Il foglio delle 64 per Andrea | 5–10 |
| `src/components/Tessera.tsx`, `src/app/(app)/dispensa/TesseraDispensa.tsx`, `src/components/TesseraIngrediente.tsx` | Le tre tessere | 11 |
| `src/components/__tests__/tessera.test.tsx`, `src/app/(app)/dispensa/__tests__/pezzi.test.tsx`, `src/components/__tests__/TesseraIngrediente.test.tsx` | I loro test | 11 |
| `design/sistema/DESIGN.md`, `docs/design-delta/DELTA-2026-10-03-icone-due-toni.md` | Le regole | 12 |

Comandi:
- un file di test: `npx vitest run <percorso>`;
- tutta la suite: `npm test`;
- `npm run lint`, `npx tsc --noEmit`, `npm run build`.

---

### Task 1: Il modello dei tracciati accetta sagoma e gruppi

**File:**
- Crea: `design/foglio-icone/tracciati-oggi.json`
- Modifica: `src/components/tracciati-ingredienti.ts` (interfaccia `Tracciato` in cima)
- Modifica: `src/components/IconaIngrediente.tsx` (il path dei dettagli)
- Test: `src/components/__tests__/icona-ingrediente.test.tsx`

**Interfacce:**
- Produce: `interface Tracciato { sil?: string; d: string; dd: string | readonly string[]; rot?: string }` e `function gruppiDettaglio(t: Tracciato): readonly string[]`, esportati da `tracciati-ingredienti.ts`.

- [ ] **Passo 1: congelare le icone di oggi per il foglio**, prima di toccare qualsiasi tracciato.

```bash
mkdir -p design/foglio-icone
npx tsx -e "import('./src/components/tracciati-ingredienti.ts').then((m) => require('node:fs').writeFileSync('design/foglio-icone/tracciati-oggi.json', JSON.stringify(m.TRACCIATI)))"
node -e "console.log(Object.keys(require('./design/foglio-icone/tracciati-oggi.json')).length)"
```
Atteso: `64`.

- [ ] **Passo 2: test che falliscono**, in coda a `icona-ingrediente.test.tsx`. Aggiungi `gruppiDettaglio` all'import da `'../tracciati-ingredienti'`.

```tsx
describe('tracciati · forma a due toni (spec 03/10)', () => {
  /** Ogni sottopercorso (da una M alla successiva) finisce in Z. */
  const chiusa = (sil: string) =>
    sil.split(/(?=[Mm])/).map((s) => s.trim()).filter(Boolean).every((s) => /[Zz]$/.test(s));

  it('gruppiDettaglio: una stringa sola è un gruppo, una lista resta com\'è', () => {
    expect(gruppiDettaglio({ d: 'M0 0', dd: 'M1 1' })).toEqual(['M1 1']);
    expect(gruppiDettaglio({ d: 'M0 0', dd: ['M1 1', 'M2 2'] })).toEqual(['M1 1', 'M2 2']);
  });

  it('ogni sagoma presente ha i sottopercorsi chiusi', () => {
    expect(CHIAVI_ICONE.filter((k) => {
      const sil = TRACCIATI[k]?.sil;
      return sil !== undefined && !chiusa(sil);
    })).toEqual([]);
  });

  it('dettagli: da uno a cinque gruppi, nessuno vuoto', () => {
    expect(CHIAVI_ICONE.filter((k) => {
      const g = gruppiDettaglio(TRACCIATI[k]!);
      return g.length < 1 || g.length > 5 || g.some((x) => x.trim() === '');
    })).toEqual([]);
  });

  it('il controllo delle sagome scarta un sottopercorso aperto', () => {
    expect(chiusa('M0 0h2v2Z')).toBe(true);
    expect(chiusa('M0 0h2v2ZM4 4h1')).toBe(false);
  });
});
```

- [ ] **Passo 3: verificare che falliscano.** Comando: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx`. Atteso: FAIL, `gruppiDettaglio` non è esportato.

- [ ] **Passo 4: implementare.** In `tracciati-ingredienti.ts` sostituisci l'interfaccia:

```ts
/**
 * `sil` è la sagoma chiusa (pieno e maschera dell'ombra), `d` il contorno, `dd` i dettagli in
 * gruppi, al massimo cinque (spec 2026-10-03 §3); `rot` ruota sagoma, contorno e dettagli.
 * Finché il catalogo non è tutto ridisegnato, `sil` è facoltativa e `dd` può essere ancora la
 * stringa unica del 26/09: `gruppiDettaglio` la tratta come un gruppo solo.
 */
export interface Tracciato { sil?: string; d: string; dd: string | readonly string[]; rot?: string }

export function gruppiDettaglio(t: Tracciato): readonly string[] {
  return typeof t.dd === 'string' ? [t.dd] : t.dd;
}
```

In `IconaIngrediente.tsx` importa `gruppiDettaglio` accanto a `TRACCIATI`, e nel secondo path sostituisci `d={t.dd}` con `d={gruppiDettaglio(t).join('')}`.

- [ ] **Passo 5: verificare che passino.** Comando: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx`. Atteso: PASS, compresi i test esistenti (le icone di oggi non cambiano).

- [ ] **Passo 6: commit.**

```bash
git add design/foglio-icone/tracciati-oggi.json src/components/tracciati-ingredienti.ts src/components/IconaIngrediente.tsx src/components/__tests__/icona-ingrediente.test.tsx
git commit -m "feat(icone): i tracciati accettano la sagoma chiusa e i dettagli in gruppi"
```

---

### Task 2: Le sei chiavi del pilota

**File:**
- Modifica: `src/components/tracciati-ingredienti.ts` (le voci `pesce`, `carota`, `pomodoro`, `latte`, `formaggio`, `pane`, alle righe 134–170 circa)
- Test: `src/components/__tests__/icona-ingrediente.test.tsx`

**Interfacce:**
- Consuma: `Tracciato` del Task 1; `circ(x, y, r)`, già definita in cima al file.
- Produce: sei chiavi con `sil` e `dd: string[]`, che usano i Task 3, 4 e 5.

- [ ] **Passo 1: test che fallisce**, dentro il `describe('tracciati · forma a due toni (spec 03/10)')`.

```tsx
  it('le sei del pilota del 03/10 hanno la sagoma e i gruppi', () => {
    const sei = ['pomodoro', 'carota', 'pesce', 'formaggio', 'pane', 'latte'] as const;
    expect(sei.filter((k) => !TRACCIATI[k]?.sil || typeof TRACCIATI[k]?.dd === 'string')).toEqual([]);
    expect(sei.map((k) => gruppiDettaglio(TRACCIATI[k]!).length)).toEqual([4, 5, 5, 4, 4, 5]);
  });
```

- [ ] **Passo 2: verificare che fallisca.** Comando: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx -t "sei del pilota"`. Atteso: FAIL.

- [ ] **Passo 3: sostituire le sei voci** con quelle approvate da Andrea nella colonna «Mix B · ombra leggera» (fonte: `design/pilota-icone/modello-mix.html`, `ICONE`). L'occhio del pesce passa nel contorno.

```ts
  pesce: {
    sil: 'M21.4 12C19.4 6.6 12 5.2 7.6 10.2L3.2 7.8 4.6 12 3.2 16.2l4.4-2.4C12 18.8 19.4 17.4 21.4 12ZM10.4 8.4 12 5.6C13.5 5.6 14.9 6 15.9 6.9 14 7 12 7.5 10.4 8.4Z',
    d: 'M21.4 12C19.4 6.6 12 5.2 7.6 10.2L3.2 7.8 4.6 12 3.2 16.2l4.4-2.4C12 18.8 19.4 17.4 21.4 12ZM10.4 8.4 12 5.6C13.5 5.6 14.9 6 15.9 6.9' + circ(18.2, 10.9, 0.9),
    dd: [
      'M15.2 8.4c1.3 2.1 1.3 5.1 0 7.2',
      'M8 12.2c2.4-.5 4.8-.5 6.8 0',
      'M10.4 10.2c.5.4.5 1 0 1.4M12.4 9.8c.5.4.5 1 0 1.4M11.4 12.9c.5.4.5 1 0 1.4M13.4 13.1c.5.4.5 1 0 1.4',
      'M4.6 9.6l1.8 1.6M4.6 14.4l1.8-1.6',
      'M21.4 12l-1.4.4',
    ],
  },
  carota: {
    sil: 'M4.6 19.4C7.4 17.8 14.8 12.6 17 10.3A2.4 2.4 0 0 0 13.7 7C11.4 9.2 6.2 16.5 4.6 19.4ZM15.4 8.6C14.6 6.6 15 4.6 16.4 3.2 17.2 5.2 16.8 7.2 15.4 8.6ZM15.4 8.6C16 6.6 17.6 5 19.8 4.6 19.2 6.6 17.6 8.2 15.4 8.6ZM15.4 8.6C17 7.4 19.2 7 21.2 7.8 19.6 9 17.4 9.4 15.4 8.6Z',
    d: 'M4.6 19.4C7.4 17.8 14.8 12.6 17 10.3A2.4 2.4 0 0 0 13.7 7C11.4 9.2 6.2 16.5 4.6 19.4ZM15.4 8.6C14.6 6.6 15 4.6 16.4 3.2 17.2 5.2 16.8 7.2 15.4 8.6ZM15.4 8.6C16 6.6 17.6 5 19.8 4.6 19.2 6.6 17.6 8.2 15.4 8.6ZM15.4 8.6C17 7.4 19.2 7 21.2 7.8 19.6 9 17.4 9.4 15.4 8.6Z',
    dd: ['M7.4 15.4l1.2 1', 'M9.6 13.1l1.4 1.1', 'M11.8 10.9l1.3 1', 'M13.9 9.1l.9.8', 'M15.4 8.6 16.1 5.4'],
  },
  pomodoro: {
    sil: 'M3.2 13.6a8.8 7.6 0 1 0 17.6 0a8.8 7.6 0 1 0-17.6 0ZM12 12 12.8 8.9 16 9.1 13.3 7.4 14.5 4.4 12 6.4 9.5 4.4 10.7 7.4 8 9.1 11.2 8.9ZM11.5 6.4V2.8h1v3.6Z',
    d: 'M8 6.8A8.8 7.4 0 1 0 16 6.8M12 12 12.8 8.9 16 9.1 13.3 7.4 14.5 4.4 12 6.4 9.5 4.4 10.7 7.4 8 9.1 11.2 8.9ZM12 6.4V2.8',
    dd: ['M8.4 7.6c-2.2 2.4-2.8 6.4-1.2 9.8', 'M15.6 7.6c2.2 2.4 2.8 6.4 1.2 9.8', 'M5.8 12.8c.2-1.6.9-2.8 1.9-3.6', 'M5.9 15.4c.1.4.3.8.5 1.1'],
  },
  latte: {
    sil: 'M5.4 20.8V9.4L8 5V3H16V5L18.6 9.4V20.8Z',
    d: 'M5.4 20.8V9.4L8 5h8l2.6 4.4v11.4ZM8 5V3h8v2',
    dd: ['M5.4 9.4h13.2', 'M15.6 9.4v11.4', 'M16 5l-.4 4.4', 'M8 18.4h5.6', 'M10.8 12.2c-1.4 1.9-2.1 2.9-2.1 4a2.1 2.1 0 0 0 4.2 0c0-1.1-.7-2.1-2.1-4Z'],
  },
  formaggio: {
    sil: 'M3.2 19V13.4L16.4 5.4c2.8.5 4.6 2.6 4.6 5.4V19Z',
    d: 'M3.2 19V13.4L16.4 5.4c2.8.5 4.6 2.6 4.6 5.4V19Z',
    dd: [
      'M3.2 13.4H21',
      'M16.4 5.4c-.6 1.2-.8 2.3-.6 3.4V13.4',
      'M19.4 13.4V19',
      circ(8, 16.3, 1.5) + circ(14.6, 16.1, 1.8) + circ(12.6, 10.6, 1.2) + circ(17.2, 18.2, 0.6) + circ(9.6, 12.2, 0.6),
    ],
  },
  pane: {
    sil: 'M3 19.2V12.4C1.6 11.6 2 7.4 5.6 7.4H17.6C21.2 7.4 22.2 11.2 20.6 12.4V19.2Z',
    d: 'M3 19.2V12.4C1.6 11.6 2 7.4 5.6 7.4H9c3.6 0 4 4.2 2.6 5v6.8ZM9 7.4h8.6c3.6 0 4.6 3.8 3 5v6.8h-9',
    dd: [
      'M5 17.4v-5.8c-.9-.6-.6-2.4 1-2.4h1.8c1.6 0 1.9 1.8 1 2.4v5.8Z',
      'M14.8 7.8 14 9.6M18.2 8.2l-.8 1.6',
      'M11.6 13.4h9',
      circ(6.3, 13.2, 0.35) + circ(7.6, 14.8, 0.35) + circ(6.2, 16, 0.3),
    ],
  },
```

Se una voce oggi ha `rot`, tienilo. Nessuna delle sei lo ha (verificato il 03/10).

- [ ] **Passo 4: verificare che passi.** Comando: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx`. Atteso: PASS. Anche il test esistente «i dodici del pilota hanno il tracciato» resta verde.

- [ ] **Passo 5: commit.**

```bash
git add src/components/tracciati-ingredienti.ts src/components/__tests__/icona-ingrediente.test.tsx
git commit -m "feat(icone): sagome e dettagli a gruppi per le sei chiavi del pilota del 03/10"
```

---

### Task 3: Lo script di controllo della geometria

**File:**
- Crea: `scripts/controlla-icone.ts`
- Test: `scripts/__tests__/controlla-icone.test.ts`

**Interfacce:**
- Consuma: `TRACCIATI` (Task 2).
- Produce: `leggiRotazione(rot?: string): [number, number, number] | null`. Uso: `npx tsx scripts/controlla-icone.ts [chiave …]`, che esce con codice 1 se una chiave fallisce.

- [ ] **Passo 1: test che fallisce** (`scripts/__tests__/controlla-icone.test.ts`).

```ts
import { describe, it, expect } from 'vitest';
import { leggiRotazione } from '../controlla-icone';

describe('leggiRotazione', () => {
  it('nessuna rotazione: null', () => {
    expect(leggiRotazione(undefined)).toBeNull();
  });
  it('legge angolo e centro', () => {
    expect(leggiRotazione('rotate(-28 12 12)')).toEqual([-28, 12, 12]);
    expect(leggiRotazione(' rotate(40 12 12) ')).toEqual([40, 12, 12]);
  });
  it('una forma diversa è un errore, non un silenzio', () => {
    expect(() => leggiRotazione('rotate(30)')).toThrow('rotazione non riconosciuta');
  });
});
```

- [ ] **Passo 2: verificare che fallisca.** Comando: `npx vitest run scripts/__tests__/controlla-icone.test.ts`. Atteso: FAIL, il modulo non esiste.

- [ ] **Passo 3: scrivere lo script.**

```ts
/**
 * Controllo della geometria delle icone a due toni (spec 2026-10-03 §5). Per ogni chiave con
 * `sil` disegna in Chrome headless contorno e sagoma su una tela 480×480 (scala 20) e conta:
 * - i pixel del contorno (tratto 0,9) fuori dalla sagoma (pieno + bordo a 0,9): sotto l'1%;
 * - i pixel della sagoma fuori dalla fascia 2–22 (mezza unità di tolleranza): zero.
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
interface Esito { chiave: string; fuori: number; totale: number; oltreBordo: number; ok: boolean }

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
  const sagomaLarga = tela(rot, (x) => { const p = new Path2D(sil); x.fill(p); x.lineWidth = 0.9; x.stroke(p); });
  const sagoma = tela(rot, (x) => x.fill(new Path2D(sil)));
  let fuori = 0, totale = 0, oltreBordo = 0;
  const lo = 1.5 * S, hi = 22.5 * S;
  for (let i = 3; i < contorno.length; i += 4) {
    if (contorno[i] > 128) { totale++; if (sagomaLarga[i] < 64) fuori++; }
    if (sagoma[i] > 128) {
      const p = (i - 3) / 4, px = p % N, py = Math.floor(p / N);
      if (px < lo || px > hi || py < lo || py > hi) oltreBordo++;
    }
  }
  return { chiave, fuori, totale, oltreBordo, ok: fuori / Math.max(totale, 1) < 0.01 && oltreBordo === 0 };
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
    console.log(`${e.ok ? 'ok  ' : 'NO  '} ${e.chiave.padEnd(18)} contorno fuori ${quota}%  oltre il bordo ${e.oltreBordo}px`);
  }
  if (esiti.some((e) => !e.ok)) process.exit(1);
}
```

- [ ] **Passo 4: verificare test e script.**
  - `npx vitest run scripts/__tests__/controlla-icone.test.ts`. Atteso: PASS.
  - `npx tsx scripts/controlla-icone.ts`. Atteso: sei righe `ok`, codice 0.
  - **Controprova:** in una copia temporanea, metti nel `sil` del latte un rettangolo più stretto (`M8 20.8V9.4H16V20.8Z`) e rilancia `npx tsx scripts/controlla-icone.ts latte`. Atteso: `NO`, codice 1. Poi annulla la modifica (`git checkout src/components/tracciati-ingredienti.ts`).
  - Se Chrome restituisce l'esito vuoto, alza `--virtual-time-budget`.

- [ ] **Passo 5: commit.**

```bash
git add scripts/controlla-icone.ts scripts/__tests__/controlla-icone.test.ts
git commit -m "feat(icone): script che controlla in Chrome headless che la sagoma copra il contorno"
```

---

### Task 4: Il componente a due toni

**File:**
- Crea: `src/components/IconaDueToni.tsx`
- Test: `src/components/__tests__/icona-due-toni.test.tsx`

**Interfacce:**
- Consuma: `TRACCIATI`, `gruppiDettaglio` (Task 1); `coloreArea`, `tonoMedioArea` da `@/domain/aree`.
- Produce: `export type TonoDueToni = 'area' | 'hero' | 'tinta' | 'spento'`, `export const RIGHE_OMBRA: string`, e `export function IconaDueToni(props: { chiave: ChiaveIcona; area: AreaId; tono: TonoDueToni; taglia: 60 | 96 })`. Restituisce `null` se la chiave non ha `sil`. Le parti dell'svg sono marcate `data-parte` = `pieno` | `tratti` | `ombra` | `contorno` | `dettagli`.

- [ ] **Passo 1: test che falliscono** (`src/components/__tests__/icona-due-toni.test.tsx`).

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconaDueToni, RIGHE_OMBRA } from '../IconaDueToni';

const svg = (c: HTMLElement) => c.querySelector('svg[data-icona]') as SVGSVGElement;
const parte = (s: Element, p: string) => s.querySelector(`[data-parte="${p}"]`) as SVGElement;

describe('IconaDueToni', () => {
  it('area: pieno nel colore d\'area a 0,72, tratti nel tono medio, 60 px tagliata di 11', () => {
    const { container } = render(<IconaDueToni chiave="carota" area="ortofrutta" tono="area" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('aria-hidden', 'true');
    expect(s).toHaveAttribute('data-tono', 'area');
    expect(s).toHaveAttribute('width', '60');
    expect(s).toHaveAttribute('stroke', '#7AA838');
    expect(s.style.right).toBe('-11px');
    expect(s.style.bottom).toBe('-11px');
    expect(s.style.pointerEvents).toBe('none');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(168, 217, 106, 0.72)');
    expect(parte(s, 'tratti')).toHaveAttribute('opacity', '1');
    expect(parte(s, 'ombra')).toHaveAttribute('stroke-width', '0.34');
    expect(parte(s, 'contorno')).toHaveAttribute('stroke-width', '0.9');
    expect(parte(s, 'dettagli')).toHaveAttribute('stroke-width', '0.5');
  });

  it('hero: 96 px tagliata di 18, pieno bianco a 0,7, tratti nel tono medio', () => {
    const { container } = render(<IconaDueToni chiave="pane" area="cereali" tono="hero" taglia={96} />);
    const s = svg(container);
    expect(s).toHaveAttribute('width', '96');
    expect(s.style.right).toBe('-18px');
    expect(s).toHaveAttribute('stroke', '#BB9609');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(255,255,255,0.7)');
  });

  it('tinta (Dispensa in casa): pieno bianco a 0,7, tratti nel tono medio', () => {
    const { container } = render(<IconaDueToni chiave="pesce" area="macelleria" tono="tinta" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#D88384');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(255,255,255,0.7)');
  });

  it('spento: pieno quasi trasparente, tratti --off a 0,55', () => {
    const { container } = render(<IconaDueToni chiave="latte" area="latticini" tono="spento" taglia={60} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#9A9AA6');
    expect(parte(s, 'pieno')).toHaveAttribute('fill', 'rgba(20,22,58,0.06)');
    expect(parte(s, 'tratti')).toHaveAttribute('opacity', '0.55');
  });

  it('dettagli: i gruppi uniti in un path solo', () => {
    const { container } = render(<IconaDueToni chiave="formaggio" area="latticini" tono="area" taglia={60} />);
    expect(parte(svg(container), 'dettagli').getAttribute('d')).toContain('M3.2 13.4H21M16.4 5.4');
  });

  it('due icone nella stessa pagina hanno maschere diverse, e ognuna usa la sua', () => {
    const { container } = render(
      <div>
        <IconaDueToni chiave="carota" area="ortofrutta" tono="area" taglia={60} />
        <IconaDueToni chiave="pane" area="cereali" tono="area" taglia={60} />
      </div>,
    );
    const ids = [...container.querySelectorAll('mask')].map((m) => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    ids.forEach((id) => expect(id).toMatch(/^[A-Za-z0-9_-]+$/));
    const ombre = [...container.querySelectorAll('[data-parte="ombra"]')].map((o) => o.getAttribute('mask'));
    expect(ombre).toEqual(ids.map((id) => `url(#${id})`));
  });

  it('il tratteggio è uguale per tutte le icone e copre la griglia', () => {
    const { container } = render(<IconaDueToni chiave="carota" area="ortofrutta" tono="area" taglia={60} />);
    expect(parte(svg(container), 'ombra')).toHaveAttribute('d', RIGHE_OMBRA);
    expect(RIGHE_OMBRA.startsWith('M-2 -1L-28 25')).toBe(true);
    expect(RIGHE_OMBRA.split('M')).toHaveLength(45); // 44 righe
  });

  it('chiave senza sagoma: nulla', () => {
    const { container } = render(<IconaDueToni chiave="banana" area="ortofrutta" tono="area" taglia={60} />);
    expect(svg(container)).toBeNull();
  });
});
```

Il test «chiave senza sagoma» vale finché il Task 6 non disegna la banana. Nel Task 6 va spostato su una chiave ancora senza `sil` (vedi il passo 5 del Task 6), e nel Task 11 diventa il caso della chiave inesistente.

- [ ] **Passo 2: verificare che falliscano.** Comando: `npx vitest run src/components/__tests__/icona-due-toni.test.tsx`. Atteso: FAIL, il modulo non esiste.

- [ ] **Passo 3: implementare** (`src/components/IconaDueToni.tsx`).

```tsx
import { useId } from 'react';
import type { AreaId } from '@/domain/types';
import type { ChiaveIcona } from '@/domain/icone-ingredienti';
import { coloreArea, tonoMedioArea } from '@/domain/aree';
import { TRACCIATI, gruppiDettaglio } from './tracciati-ingredienti';

export type TonoDueToni = 'area' | 'hero' | 'tinta' | 'spento';

/**
 * Righe a 45° ogni 1,2 che coprono tutta la griglia 24. Sono le stesse per ogni icona: la
 * maschera le riduce alla falce d'ombra della sagoma.
 */
export const RIGHE_OMBRA = Array.from({ length: 44 }, (_, i) => {
  const x = +(-2 + i * 1.2).toFixed(2);
  return `M${x} -1L${+(x - 26).toFixed(2)} 25`;
}).join('');

/** La sagoma spostata che si toglie per lasciare l'ombra: la luce viene da in alto a sinistra. */
const SPOSTA_OMBRA = 'translate(-2 -2.2)';

/** Stessa conversione di Tessera.tsx: ogni file che ne ha bisogno la ridefinisce, per scelta del progetto. */
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * L'icona ingrediente a due toni (spec 2026-10-03): sagoma piena, ombra a tratteggio, contorno e
 * dettagli a tratto. Come quella di tratto sta in basso a destra, tagliata dal bordo: la tessera
 * che la ospita ha `position: relative; overflow: hidden`. Decorativa: aria-hidden, nessun tocco.
 * La rotazione tocca sagoma, contorno e dettagli; l'ombra resta in basso a destra.
 */
export function IconaDueToni({ chiave, area, tono, taglia }: {
  chiave: ChiaveIcona; area: AreaId; tono: TonoDueToni; taglia: 60 | 96;
}) {
  // useId prima del ritorno anticipato (regola degli hook). I due punti e le virgolette che
  // React mette nell'id non vanno bene dentro url(#…): si tolgono.
  const maschera = 'ombra-' + useId().replace(/[^A-Za-z0-9_-]/g, '');
  const t = TRACCIATI[chiave];
  if (!t?.sil) return null;
  const spento = tono === 'spento';
  const tratto = spento ? '#9A9AA6' : tonoMedioArea(area);
  const pieno = spento ? 'rgba(20,22,58,0.06)' : tono === 'area' ? rgba(coloreArea(area), 0.72) : 'rgba(255,255,255,0.7)';
  const taglio = taglia === 96 ? -18 : -11;
  return (
    <svg
      data-icona={chiave}
      data-tono={tono}
      aria-hidden="true"
      width={taglia}
      height={taglia}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tratto}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: 'absolute', right: taglio, bottom: taglio, pointerEvents: 'none' }}
    >
      <defs>
        <mask id={maschera} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <path d={t.sil} transform={t.rot} fill="#FFFFFF" stroke="none" />
          <path d={t.sil} transform={t.rot ? `${SPOSTA_OMBRA} ${t.rot}` : SPOSTA_OMBRA} fill="#000000" stroke="none" />
        </mask>
      </defs>
      <path data-parte="pieno" d={t.sil} transform={t.rot} fill={pieno} stroke="none" />
      <g data-parte="tratti" opacity={spento ? 0.55 : 1}>
        <path data-parte="ombra" d={RIGHE_OMBRA} strokeWidth={0.34} mask={`url(#${maschera})`} />
        <path data-parte="contorno" d={t.d} transform={t.rot} strokeWidth={0.9} />
        <path data-parte="dettagli" d={gruppiDettaglio(t).join('')} transform={t.rot} strokeWidth={0.5} />
      </g>
    </svg>
  );
}
```

- [ ] **Passo 4: verificare che passino.** Comando: `npx vitest run src/components/__tests__/icona-due-toni.test.tsx`. Atteso: PASS. Se fallisce il test delle maschere, guarda il formato reale di `useId()` in React 19.2 (`console.log`) prima di toccare la regex.

- [ ] **Passo 5: commit.**

```bash
git add src/components/IconaDueToni.tsx src/components/__tests__/icona-due-toni.test.tsx
git commit -m "feat(icone): componente a due toni con ombra a tratteggio mascherata"
```

---

### Task 5: Il foglio di approvazione

**File:**
- Crea: `scripts/foglio-icone.ts`
- Genera: `design/foglio-icone/foglio.html`

**Interfacce:**
- Consuma: `IconaDueToni` (Task 4), `TRACCIATI`, `CHIAVI_ICONE`, `design/foglio-icone/tracciati-oggi.json` (Task 1).
- Produce: `npx tsx scripts/foglio-icone.ts`, che riscrive `design/foglio-icone/foglio.html` con una scheda per ognuna delle 64 chiavi: l'icona di oggi a 52 px, la nuova a 60 px su bianco e la nuova su quattro tessere (Lista accesa, protagonista, Dispensa in casa, spenta). Le chiavi senza `sil` sono marcate «da disegnare».

- [ ] **Passo 1: scrivere lo script.** Si usa `createElement` e niente JSX, così il file resta `.ts` come gli altri script.

```ts
/**
 * Foglio di approvazione delle icone a due toni (spec 2026-10-03 §5): per ogni chiave l'icona di
 * oggi (congelata in design/foglio-icone/tracciati-oggi.json) accanto alla nuova, su bianco e sulle
 * quattro tessere. Uso: npx tsx scripts/foglio-icone.ts → design/foglio-icone/foglio.html
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'node:fs';
import { CHIAVI_ICONE, type ChiaveIcona } from '../src/domain/icone-ingredienti';
import { AREE } from '../src/domain/aree';
import type { AreaId } from '../src/domain/types';
import { TRACCIATI } from '../src/components/tracciati-ingredienti';
import { IconaDueToni, type TonoDueToni } from '../src/components/IconaDueToni';

/** Il reparto tipico di ogni chiave, come nei commenti del catalogo: serve solo a colorare il foglio. */
const REPARTO: Record<AreaId, readonly ChiaveIcona[]> = {
  ortofrutta: ['banana', 'mela', 'pera', 'arancia', 'limone', 'avocado', 'zucchina', 'melanzana', 'peperone', 'broccolo', 'finocchio', 'sedano', 'pomodoro', 'pomodorini', 'insalata', 'foglie', 'carota', 'patata', 'cipolla', 'aglio', 'fungo', 'zucca', 'fagiolini', 'uva', 'fragola', 'cetriolo', 'erbe'],
  macelleria: ['bistecca', 'cosciotto', 'salsiccia', 'pesce', 'gambero', 'pancetta'],
  latticini: ['uovo', 'latte', 'yogurt', 'formaggio', 'formaggio-fresco', 'burro'],
  cereali: ['pasta', 'riso', 'chicchi', 'avena', 'pane', 'pancarre', 'biscotto', 'farina', 'cornetto'],
  dispensa: ['olio', 'ampolla', 'sale', 'spezie', 'zucchero', 'miele', 'marmellata', 'caffe', 'legumi', 'piselli', 'noce', 'mandorla', 'arachide', 'cioccolato', 'minestra', 'acqua'],
  surgelati: [],
};
const areaDi = (k: ChiaveIcona) => (Object.keys(REPARTO) as AreaId[]).find((a) => REPARTO[a].includes(k))!;
const AREA = new Map(AREE.map((a) => [a.id, a]));
const OGGI = JSON.parse(readFileSync('design/foglio-icone/tracciati-oggi.json', 'utf8')) as Record<string, { d: string; dd: string; rot?: string }>;

function iconaOggi(k: ChiaveIcona): string {
  const t = OGGI[k], a = AREA.get(areaDi(k))!;
  const rot = t.rot ? ` transform="${t.rot}"` : '';
  return `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="${a.tonoMedio}" stroke-linecap="round" stroke-linejoin="round"><path d="${t.d}"${rot} stroke-width="2"/><path d="${t.dd}"${rot} stroke-width="1.25"/></svg>`;
}

function nuova(k: ChiaveIcona, tono: TonoDueToni, taglia: 60 | 96): string {
  return renderToStaticMarkup(createElement(IconaDueToni, { chiave: k, area: areaDi(k), tono, taglia }));
}

function tessera(k: ChiaveIcona, tono: TonoDueToni): string {
  const a = AREA.get(areaDi(k))!;
  const stile: Record<TonoDueToni, string> = {
    area: `background:#FFFFFF;border:1px solid ${a.colore}73`,
    hero: `background:${a.colore};border:1px solid ${a.colore}`,
    tinta: `background:${a.tintaOpaca}`,
    spento: 'background:rgba(20,22,58,0.035)',
  };
  const etichetta = { area: 'Lista', hero: 'Protagonista', tinta: 'Dispensa in casa', spento: 'Presa' }[tono];
  return `<div class="tessera${tono === 'hero' ? ' hero' : ''}" style="${stile[tono]}">${nuova(k, tono, tono === 'hero' ? 96 : 60)}<span>${etichetta}</span></div>`;
}

const schede = CHIAVI_ICONE.map((k) => {
  const pronta = Boolean(TRACCIATI[k]?.sil);
  return `<section class="voce${pronta ? '' : ' da-fare'}"><h2>${k}<small>${areaDi(k)}${pronta ? '' : ' · da disegnare'}</small></h2>
    <div class="riga"><figure>${iconaOggi(k)}<figcaption>oggi</figcaption></figure>
    <figure class="nuova">${pronta ? nuova(k, 'area', 60) : ''}<figcaption>nuova</figcaption></figure>
    ${pronta ? (['area', 'hero', 'tinta', 'spento'] as const).map((t) => tessera(k, t)).join('') : ''}</div></section>`;
}).join('\n');

const pronte = CHIAVI_ICONE.filter((k) => TRACCIATI[k]?.sil).length;
writeFileSync('design/foglio-icone/foglio.html', `<title>Foglio icone a due toni</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
:root { --ink: #14163A; --mut: #8A8A96; --fondo: #F2F1EF; color-scheme: light; }
body { background: var(--fondo); color: var(--ink); font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif; }
main { max-width: 1200px; margin: 0 auto; padding-inline: 16px; padding-block: 24px 64px; display: flex; flex-direction: column; gap: 12px; }
h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.03em; }
p { margin: 0; color: #5C5F7A; font-size: 14px; line-height: 1.5; }
.voce { background: #FFFFFF; border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.voce.da-fare { opacity: .55; }
h2 { margin: 0; font-size: 16px; font-weight: 800; display: flex; gap: 10px; align-items: baseline; }
small { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--mut); }
.riga { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; overflow-x: auto; }
figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
figure.nuova svg { position: static !important; }
figcaption, .tessera span { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--mut); }
.tessera { position: relative; overflow: hidden; width: 165px; height: 104px; border-radius: 14px; box-sizing: border-box; padding: 10px 12px; }
.tessera.hero { width: 340px; border-radius: 18px; }
.tessera span { position: relative; }
</style>
<main><h1>Icone a due toni · ${pronte} di ${CHIAVI_ICONE.length}</h1>
<p>Per ogni chiave: l'icona di oggi, la nuova su bianco e la nuova sulle quattro tessere. Le chiavi senza sagoma sono «da disegnare». Il reparto è quello tipico, solo per colorare il foglio.</p>
${schede}</main>`);
console.log(`foglio.html: ${pronte} di ${CHIAVI_ICONE.length} pronte`);
```

- [ ] **Passo 2: generare e verificare.**
  - `npx tsx scripts/foglio-icone.ts`. Atteso: `foglio.html: 6 di 64 pronte`.
  - `grep -c 'class="voce' design/foglio-icone/foglio.html`. Atteso: `64`.
  - Una schermata per guardarlo: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --disable-gpu --window-size=1200,2400 --screenshot=/tmp/foglio.png "file://$PWD/design/foglio-icone/foglio.html"`. Controlla che pomodoro, carota, pesce, formaggio, pane e latte siano come nella colonna «Mix B · ombra leggera» di https://claude.ai/artifact/KwKG5PiqHakqcuRnjFDMpu.

- [ ] **Passo 3: commit.**

```bash
git add scripts/foglio-icone.ts design/foglio-icone/foglio.html
git commit -m "feat(icone): foglio di approvazione delle 64 icone, oggi accanto a due toni"
```

---

### Task 6–10: Il disegno delle 58 chiavi

Cinque task con la stessa procedura e lotti diversi. Ogni task è un lotto che un revisore può approvare o respingere da solo.

| Task | Lotto | Chiavi |
|---|---|---|
| 6 | Ortofrutta, prima metà (13) | banana, mela, pera, arancia, limone, avocado, zucchina, melanzana, peperone, broccolo, finocchio, sedano, pomodorini |
| 7 | Ortofrutta, seconda metà (12) | insalata, foglie, patata, cipolla, aglio, fungo, zucca, fagiolini, uva, fragola, cetriolo, erbe |
| 8 | Carne, pesce e latticini (9) | bistecca, cosciotto, salsiccia, gambero, pancetta, uovo, yogurt, formaggio-fresco, burro |
| 9 | Cereali e forno (8) | pasta, riso, chicchi, avena, pancarre, biscotto, farina, cornetto |
| 10 | Dispensa, pronti e bevande (16) | olio, ampolla, sale, spezie, zucchero, miele, marmellata, caffe, legumi, piselli, noce, mandorla, arachide, cioccolato, minestra, acqua |

**File:**
- Modifica: `src/components/tracciati-ingredienti.ts` (solo le voci del lotto)
- Rigenera: `design/foglio-icone/foglio.html`
- Test: `src/components/__tests__/icona-ingrediente.test.tsx` (solo il Task 6, passo 5)

**Interfacce:**
- Consuma: il formato del Task 1, lo script del Task 3, il foglio del Task 5.
- Produce: le voci del lotto con `sil` e `dd: string[]`.

**Come si disegna una voce.** L'esempio è il pomodoro del Task 2.
1. **`sil`**: parti dal contorno `d` di oggi e chiudi la forma. Le parti che oggi sono archi aperti diventano chiuse (il tondo del pomodoro è un'ellisse intera). Le parti lineari (gambo, picciolo, raggi delle foglie) diventano forme sottili chiuse larghe almeno 1 (il gambo del pomodoro è `M11.5 6.4V2.8h1v3.6Z`). Ogni sottopercorso finisce in `Z`, niente fori.
2. **`d`**: resta quello di oggi. Cambialo solo se una parte lineare è meglio come forma, come le foglie della carota diventate fusi: in quel caso `d` disegna il contorno della forma nuova.
3. **`dd`**: i segni di oggi diventano gruppi, un tipo di segno per gruppo. Aggiungi fino a due gruppi nuovi solo dove aiutano a riconoscere l'oggetto (nervature, venature, semi, pori), mai per riempire. Massimo cinque gruppi. I fori possono scendere fino a raggio 0,3. Sugli oggetti tondi resta il riflesso ad arco a sinistra.
4. **`rot`**: se c'è, non cambia. La sagoma si disegna nelle stesse coordinate non ruotate di `d`.
5. Rispetta i vincoli globali: sagoma fra 2 e 22 dopo la rotazione, tratto identificativo fuori dalla fascia tagliata.

**Passi (uguali per ogni lotto):**

- [ ] **Passo 1: disegnare le voci del lotto** in `tracciati-ingredienti.ts`, una alla volta, seguendo «Come si disegna una voce».

- [ ] **Passo 2: controllo geometrico.** Comando: `npx tsx scripts/controlla-icone.ts <chiavi del lotto separate da spazi>`. Atteso: una riga `ok` per chiave e codice 0. Ogni `NO` si corregge sulla sagoma (allargala dove il contorno esce) e si rilancia.

- [ ] **Passo 3: test.** Comando: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx src/components/__tests__/icona-due-toni.test.tsx`. Atteso: PASS (sagome chiuse, da uno a cinque gruppi).

- [ ] **Passo 4: guardare le icone.** `npx tsx scripts/foglio-icone.ts`, poi la schermata con Chrome headless come nel Task 5. Per ogni chiave del lotto controlla:
  - l'ombra cade in basso a destra e non copre il tratto identificativo;
  - il pieno non lascia vuoti visibili dentro il contorno;
  - l'icona si riconosce a 60 px senza leggere il nome;
  - accanto alle sei del pilota sembra della stessa mano.

  Correggi quello che non va e rigenera. Se una chiave non si riesce a rendere riconoscibile, segnalala nel messaggio di commit: deciderà Andrea al gate.

- [ ] **Passo 5 (solo Task 6): spostare il test «chiave senza sagoma»** di `icona-due-toni.test.tsx` dalla banana a una chiave del Task 10 ancora senza `sil` (per esempio `chiave="acqua" area="dispensa"`). Nel Task 10 non ne resterà nessuna: lì il test passa alla chiave inesistente, con `chiave={'inesistente' as never}`.

- [ ] **Passo 6: commit.**

```bash
git add src/components/tracciati-ingredienti.ts design/foglio-icone/foglio.html src/components/__tests__/icona-due-toni.test.tsx
git commit -m "feat(icone): sagome e dettagli a gruppi per <lotto>"
```

**Alla fine del Task 10, il gate del foglio** (si ferma qui finché Andrea non risponde):
- `npx tsx scripts/controlla-icone.ts` senza argomenti. Atteso: 64 righe `ok`.
- `npx tsx scripts/foglio-icone.ts`. Atteso: `64 di 64 pronte`.
- Pubblica `design/foglio-icone/foglio.html` come artifact (skill `artifact-design` prima) e manda il link ad Andrea.
- Per ogni chiave che Andrea respinge, o la si ridisegna e si ripubblica, o la chiave esce dal catalogo. In quel caso si toglie da `CATALOGO_ICONE` e da `TRACCIATI`, e si aggiornano i test di `icone-ingredienti.test.ts` che la nominano (precedente: kiwi, affettato e mais il 26/09).
- Si passa al Task 11 solo con il sì di Andrea al foglio.

---

### Task 11: Lo scambio sulle tessere

**File:**
- Modifica: `src/components/IconaIngrediente.tsx` (riscritto con il corpo di `IconaDueToni`)
- Elimina: `src/components/IconaDueToni.tsx`, `src/components/__tests__/icona-due-toni.test.tsx`
- Modifica: `src/components/tracciati-ingredienti.ts` (`Tracciato` rigido, via `gruppiDettaglio`)
- Modifica: `src/components/Tessera.tsx:124`, `src/app/(app)/dispensa/TesseraDispensa.tsx:47`, `src/components/TesseraIngrediente.tsx:135`
- Modifica: `scripts/foglio-icone.ts` (import)
- Test: `src/components/__tests__/icona-ingrediente.test.tsx`, `src/components/__tests__/tessera.test.tsx`, `src/app/(app)/dispensa/__tests__/pezzi.test.tsx`, `src/components/__tests__/TesseraIngrediente.test.tsx`

**Interfacce:**
- Produce: `IconaIngrediente({ chiave, area, tono: TonoIcona, taglia: 60 | 96 })` con `TonoIcona = 'area' | 'hero' | 'tinta' | 'spento'`. `alone` resta com'è. `Tracciato = { sil: string; d: string; dd: readonly string[]; rot?: string }`.

- [ ] **Passo 1: test delle tessere sui valori nuovi** (prima falliscono).
  - In `tessera.test.tsx`:
    - in «accesa», `toHaveAttribute('width', '52')` diventa `'60'`;
    - in «protagonista», `toHaveAttribute('stroke', '#FFFFFF')` diventa `'#7AA838'` e `'84'` diventa `'96'`. Il titolo del test diventa `'protagonista: icona a 96 px nel tono medio, alone nel colore d\'area a 3 px'`.
  - In `pezzi.test.tsx`, in «in casa», aggiungi `expect(icona(container)).toHaveAttribute('data-tono', 'tinta');`. In «finita» e «mai comprato» aggiungi `expect(icona(container)).toHaveAttribute('data-tono', 'spento');`.
  - In `TesseraIngrediente.test.tsx`, nel test dell'icona, aggiungi `expect(s).toHaveAttribute('width', '60');`.
  - In `icona-ingrediente.test.tsx`:
    - sostituisci i quattro test del componente («tono area», «tono hero», «tono spento», «pasta ruotata») con i test di `icona-due-toni.test.tsx`, cambiando import e nome (`IconaIngrediente`, `RIGHE_OMBRA` da `'../IconaIngrediente'`);
    - la chiave senza sagoma diventa `chiave={'inesistente' as never}`;
    - togli il test di `gruppiDettaglio`;
    - aggiungi:

```tsx
  it('ogni chiave del catalogo ha la sagoma', () => {
    expect(CHIAVI_ICONE.filter((k) => !TRACCIATI[k]?.sil)).toEqual([]);
  });

  it('pasta: pieno, contorno e dettagli ruotati di -28°, ombra no', () => {
    const { container } = render(<IconaIngrediente chiave="pasta" area="cereali" tono="area" taglia={60} />);
    const s = svg(container);
    for (const p of ['pieno', 'contorno', 'dettagli']) {
      expect(s.querySelector(`[data-parte="${p}"]`)).toHaveAttribute('transform', 'rotate(-28 12 12)');
    }
    expect(s.querySelector('[data-parte="ombra"]')).not.toHaveAttribute('transform');
    expect(s.querySelectorAll('mask path')[1]).toHaveAttribute('transform', 'translate(-2 -2.2) rotate(-28 12 12)');
  });
```

  Nei test spostati, `gruppiDettaglio(TRACCIATI[k]!)` diventa `TRACCIATI[k]!.dd`.

- [ ] **Passo 2: verificare che falliscano.** Comando: `npx vitest run src/components/__tests__ "src/app/(app)/dispensa/__tests__/pezzi.test.tsx"`. Atteso: FAIL sulle taglie, sul tono della protagonista, su `data-tono` e sull'import di `RIGHE_OMBRA`.

- [ ] **Passo 3: implementare lo scambio.**
  - **`IconaIngrediente.tsx`:** sostituisci il componente e `TonoIcona` con il contenuto di `IconaDueToni.tsx`, rinominando `IconaDueToni` → `IconaIngrediente` e `TonoDueToni` → `TonoIcona`. Tieni `alone` e il suo commento così come sono. Il commento in testa al componente dice ora «L'icona ingrediente (DESIGN.md §6, due toni dal 03/10)». Il path dei dettagli diventa `d={t.dd.join('')}`. Il controllo diventa `if (!t) return null;`, perché `sil` ora è obbligatoria.
  - **Elimina** `src/components/IconaDueToni.tsx` e `src/components/__tests__/icona-due-toni.test.tsx`.
  - **`tracciati-ingredienti.ts`:**

    ```ts
    /** `sil` è la sagoma chiusa (pieno e maschera dell'ombra), `d` il contorno, `dd` i dettagli in gruppi (da uno a cinque); `rot` ruota sagoma, contorno e dettagli (spec 2026-10-03 §3). */
    export interface Tracciato { sil: string; d: string; dd: readonly string[]; rot?: string }
    ```

    Togli `gruppiDettaglio`. Aggiorna anche il commento sulla grammatica in testa a `TRACCIATI`: fino a cinque gruppi di dettagli, fori fino a raggio 0,3, sagoma chiusa che copre il contorno.
  - **`Tessera.tsx`:** `taglia={protagonista ? 84 : 52}` diventa `taglia={protagonista ? 96 : 60}`.
  - **`TesseraDispensa.tsx`:** `tono={inCasa ? 'area' : 'spento'} taglia={52}` diventa `tono={inCasa ? 'tinta' : 'spento'} taglia={60}`.
  - **`TesseraIngrediente.tsx`:** `taglia={52}` diventa `taglia={60}`.
  - **`scripts/foglio-icone.ts`:** importa `IconaIngrediente` e `TonoIcona` da `'../src/components/IconaIngrediente'` al posto di `IconaDueToni` e `TonoDueToni`.

- [ ] **Passo 4: verificare.**
  - `npm test`. Atteso: tutto verde.
  - `npx tsc --noEmit` e `npm run lint`. Atteso: puliti.
  - `grep -rn "IconaDueToni\|gruppiDettaglio\|taglia={52}\|taglia={84}" src scripts`. Atteso: nessun risultato.

- [ ] **Passo 5: guardare l'app.** Avvia il server di sviluppo (preview, `.claude/launch.json`) e apri Lista, Dispensa e un Piatto. Il login con magic link si fa come da memoria: redirect letto con curl, callback aperto su localhost. Controlla:
  - nessun errore in console;
  - le maschere funzionano: l'ombra è solo in basso a destra di ogni icona, non un tratteggio esteso a tutte;
  - la protagonista ha l'icona a 96 px.

  Fai una schermata per ogni schermata.

- [ ] **Passo 6: commit.**

```bash
git add -A src/components scripts/foglio-icone.ts "src/app/(app)/dispensa"
git commit -m "feat(icone): le tessere passano alle icone a due toni (60 e 96 px, Dispensa in casa in tinta)"
```

---

### Task 12: Le regole del design system

**File:**
- Modifica: `design/sistema/DESIGN.md` (§2.3, §6, §12, §13)
- Crea: `docs/design-delta/DELTA-2026-10-03-icone-due-toni.md`

**Interfacce:** nessuna verso il codice. `npm run design:token` deve restare verde, perché non si aggiungono token.

- [ ] **Passo 1: §2.3.**
  - «Il colore d'area si usa in **sei modi**, e nessun altro:» diventa «Il colore d'area si usa in **sette modi**, e nessun altro:».
  - Dopo il punto 6 aggiungi:

    > 7. **pieno dell'icona ingrediente** a 0,72 sulle tessere accese della Lista e sull'ingrediente del piatto (§6) — uso aggiunto il 03/10.

  - Nella frase sul tono medio, dopo «uso aggiunto il 26/09 per le icone ingrediente (§6)», aggiungi «; dal 03/10 è il colore di contorno, dettagli e ombra».

- [ ] **Passo 2: §6.** Sostituisci tutto il paragrafo che comincia con «**Icone ingrediente (eccezione dichiarata, 26/09).**» con:

> **Icone ingrediente (eccezione dichiarata, 26/09; due toni dal 03/10).** Sulle tessere ingrediente (Lista, Dispensa, ingrediente del piatto) un'icona fa riconoscere l'ingrediente. Griglia 24, tre strati: la **sagoma piena** (colore d'area a 0,72; bianco a 0,7 sulla protagonista e sulla Dispensa in casa; `rgba(20,22,58,0.06)` spenta); il **contorno** a tratto `0.9` e fino a **cinque gruppi di dettagli** a tratto `0.5`, nel tono medio d'area (§2.3); l'**ombra a tratteggio**, righe a 45° di `0.34` ogni `1.2`, nella falce fra la sagoma e la sagoma spostata di (−2, −2,2). La luce viene da in alto a sinistra anche sulle icone ruotate. Estremità e giunti arrotondati, fori fino a raggio 0,3. **60 px** sulla tessera, **96 px** sulla protagonista, in basso a destra, tagliata dal bordo di **11** e **18** px, sotto il nome e fuori dal layout (`position: absolute`, `aria-hidden`). Spenta (spuntata, finita, mai comprato): tratti `--off` a 0,55. Il nome passa sopra con un alone di 2 px (3 px sulla protagonista) nel colore opaco del fondo della tessera; **sulle tessere barrate (spuntata, finita) niente alone**, perché contornava di bianco la barra (26/09, Andrea): lì il nome torna a `rgba(20,22,58,0.34)`. Sono le sole icone sopra i 26 px e le sole con un pieno fuori dalla tab bar; non si estendono ad altri componenti.

- [ ] **Passo 3: §12.** Sostituisci il paragrafo «**Le icone ingrediente sono un'eccezione dichiarata** (26/09): …» con:

> **Le icone ingrediente sono un'eccezione dichiarata** (26/09, due toni dal 03/10): sono icone del sistema (§6), non illustrazioni. Un solo pieno nel colore d'area e un'ombra a tratteggio dentro la sagoma; niente ombre portate, prospettiva o scene, e nessun uso fuori dalle tessere ingrediente. Le illustrazioni restano fuori.

- [ ] **Passo 4: §13.**
  - Nella tabella «Decisioni del 26/09/2026 (icone ingrediente)», la colonna «Dove» della riga 29 diventa `§2.3, §6, §12 — sostituita dalla 30`.
  - In coda al file aggiungi:

```markdown
### Decisioni del 03/10/2026 (icone a due toni)

| # | Tema | Decisione | Dove |
|---|---|---|---|
| 30 | Icone ingrediente | Due toni con ombra incisa (pilota «Mix B · ombra leggera»): sagoma piena nel colore d'area a 0,72, contorno 0,9, fino a cinque gruppi di dettagli a 0,5, tratteggio 0,34 ogni 1,2; 60 e 96 px; Dispensa in casa con pieno bianco (stato `tinta`). Foto scontornate valutate e scartate | §2.3, §6, §12 |
```

- [ ] **Passo 5: il delta** (`docs/design-delta/DELTA-2026-10-03-icone-due-toni.md`).

````markdown
# DELTA — 03/10/2026 — icone ingrediente a due toni

Decisione presa fuori da Claude Design, su tre pagine di confronto renderizzate dal codice:
https://claude.ai/artifact/4dzf7WUTGQQrahwCqJN3ww (quattro direzioni) e
https://claude.ai/artifact/KwKG5PiqHakqcuRnjFDMpu (mix 2 + 3). Spec:
`docs/superpowers/specs/2026-10-03-icone-due-toni-design.md`.

```
DELTA — 03/10/2026 — icone ingrediente a due toni
Deciso: icona a due toni con ombra incisa (Mix B, ombra leggera): sagoma piena nel colore d'area, contorno e dettagli a tratto fine nel tono medio, ombra a tratteggio in basso a destra
Valori: pieno colore d'area 0,72 (hero e Dispensa in casa bianco 0,7; spenta rgba(20,22,58,0.06)) · contorno 0,9 · dettagli 0,5 fino a 5 gruppi · tratteggio 0,34 ogni 1,2 a 45°, falce = sagoma meno sagoma spostata di (−2, −2,2) · taglie 52→60 e 84→96 · taglio −10→−11 e −17→−18 · spenta tratti #9A9AA6 a 0,55 (era 0,5)
Regole di DESIGN.md toccate: §2.3 (settimo uso del colore d'area), §6 Icone ingrediente, §12, §13 riga 30
Scartate: foto scontornate generate con l'AI (specificità sbagliata, deriva di stile, rumore sulla griglia); tratto fine e ricco; incisione senza pieno; silhouette ton sur ton; mix A (equilibrio), mix B con ombra piena, mix C (più incisione)
Aperto: protagonista gialla mai vista nel pilota; tratteggio sugli schermi a densità 1; prestazioni con 30 maschere sulla Lista
```
````

- [ ] **Passo 6: verificare.** Comando: `npm run design:token`. Atteso: PASS. Poi rileggi i paragrafi toccati in DESIGN.md e controlla che §6 e §12 non si contraddicano più su «niente pieni».

- [ ] **Passo 7: commit.**

```bash
git add design/sistema/DESIGN.md docs/design-delta/DELTA-2026-10-03-icone-due-toni.md
git commit -m "docs(design): le icone ingrediente a due toni in DESIGN.md (§2.3, §6, §12, §13) e il delta"
```

---

### Task 13: Verifica finale e gate

**File:** nessuno nuovo. Si rigenera `design/foglio-icone/foglio.html` se è cambiato qualcosa dopo il gate del foglio.

- [ ] **Passo 1: verifiche complete.**
  - `npm test` (due giri, perché nella suite ci sono test intermittenti noti), `npm run lint`, `npx tsc --noEmit`, `npm run build`. Atteso: tutto verde. Annota se fallisce uno dei test intermittenti noti (gestione-pasti, Dispensa «ELIMINA dal dialogo»): sono indipendenti da questo ramo.
  - `npx tsx scripts/controlla-icone.ts`. Atteso: 64 `ok`.

- [ ] **Passo 2: push e PR.**

```bash
git push -u origin icone-due-toni
gh pr create --title "Icone ingrediente a due toni con ombra incisa" --body-file <corpo scritto in italiano: obiettivo, cosa cambia, link a spec, foglio e artifact dei pilota, le cinque prove dal telefono della spec §7, nessuna migrazione; ultima riga: 🤖 Generated with [Claude Code](https://claude.com/claude-code)>
```

  Poi `get_status` / `bind_pr` con gli strumenti ccd_pr, e si legge la CI.

- [ ] **Passo 3: prove dal telefono (Andrea)** sul deploy di anteprima della PR, le cinque della spec §7:
  1. la Lista con almeno tre reparti, la protagonista in giallo e in verde;
  2. una voce spuntata: icona spenta, niente alone;
  3. la Dispensa con voci in casa e finite;
  4. un piatto con almeno quattro ingredienti;
  5. lo scorrimento della Lista con 30 tessere resta fluido.

  Se la prova 5 va male, si passa a un `<pattern>` condiviso (spec §8) in un commit a parte, e si ripete la prova.

- [ ] **Passo 4: merge solo con l'ok esplicito di Andrea** (è il deploy in produzione). Dopo il merge:
  - carica `design/sistema/DESIGN.md` nel progetto Claude Design «Spesa» con DesignSync (list_files → finalize_plan → write_files, un file);
  - aggiorna la memoria di progetto (icone ingrediente);
  - togli il ramo locale e quello remoto.

---

## Autoverifica del piano

- **Copertura della spec:**

  | Sezione della spec | Task |
  |---|---|
  | §1 Cosa cambia | 4, 11 |
  | §2 Valori e stati | 4, 11 (test) |
  | §3 Geometria e grammatica | 1, 2, 6–10, 11 (commenti) |
  | §4 Componente e chiamanti | 4, 11 |
  | §5 Produzione: lotti, script, foglio | 3, 5, 6–10 e gate a fine 10 |
  | §6 Regole del design system | 12 |
  | §7 Test unitari | 1, 2, 4, 11 |
  | §7 Prove sul telefono | 13 |
  | §8 Rischi | prestazioni nel Task 13 passo 3; protagonista gialla nella prova 1 |
  | §9 Gate | fine Task 10, Task 13 |

- **Nomi coerenti:**
  - `gruppiDettaglio`: definita nel Task 1, usata nei Task 4 e 5, tolta nell'11;
  - `IconaDueToni` / `TonoDueToni`: Task 4 e 5, rinominati nell'11;
  - `RIGHE_OMBRA`: Task 4, esportata da `IconaIngrediente` dall'11;
  - `data-parte`: stessi valori nei Task 4 e 11.
- **Fuori dal piano, di proposito:** chiavi nuove e i 5 nomi scoperti (spec, fuori ambito); `DESIGN-SYSTEM.md`, perché nessun file dell'indice cambia nome: `IconaIngrediente.tsx` e `tracciati-ingredienti.ts` restano.
