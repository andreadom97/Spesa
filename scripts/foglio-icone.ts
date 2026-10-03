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
import { IconaIngrediente, type TonoIcona } from '../src/components/IconaIngrediente';

/** Il reparto tipico di ogni chiave, come nei commenti del catalogo: serve solo a colorare il foglio. */
const REPARTO: Record<AreaId, readonly ChiaveIcona[]> = {
  ortofrutta: ['banana', 'mela', 'pera', 'arancia', 'limone', 'avocado', 'zucchina', 'melanzana', 'peperone', 'broccolo', 'finocchio', 'sedano', 'pomodoro', 'pomodorini', 'insalata', 'foglie', 'carota', 'patata', 'cipolla', 'aglio', 'fungo', 'zucca', 'fagiolini', 'uva', 'fragola', 'cetriolo', 'erbe', 'frutta', 'verdura', 'peperoncino', 'ananas', 'cocco', 'ciliegia', 'melone', 'datteri-fichi', 'pesca-albicocca', 'carciofo', 'asparago'],
  macelleria: ['bistecca', 'cosciotto', 'salsiccia', 'pesce', 'gambero', 'pancetta', 'maiale', 'agnello', 'molluschi'],
  latticini: ['uovo', 'latte', 'yogurt', 'formaggio', 'formaggio-fresco', 'burro', 'panna', 'salumi'],
  cereali: ['pasta', 'riso', 'chicchi', 'avena', 'pane', 'pancarre', 'biscotto', 'farina', 'cornetto', 'cereali', 'piadina'],
  dispensa: ['olio', 'ampolla', 'sale', 'spezie', 'zucchero', 'miele', 'marmellata', 'caffe', 'legumi', 'piselli', 'noce', 'mandorla', 'arachide', 'frutta-guscio', 'olive', 'cioccolato', 'vaniglia', 'lievito', 'senape', 'capperi', 'semi', 'uvetta', 'mais', 'minestra', 'acqua', 'vino', 'liquore', 'te'],
  surgelati: [],
};
const areaDi = (k: ChiaveIcona) => (Object.keys(REPARTO) as AreaId[]).find((a) => REPARTO[a].includes(k))!;
const AREA = new Map(AREE.map((a) => [a.id, a]));
const OGGI = JSON.parse(readFileSync('design/foglio-icone/tracciati-oggi.json', 'utf8')) as Record<string, { d: string; dd: string; rot?: string }>;

function iconaOggi(k: ChiaveIcona): string {
  // le famiglie del 03/10 nascono a due toni: non hanno un'icona di tratto da confrontare
  const t = OGGI[k], a = AREA.get(areaDi(k))!;
  if (!t) return '<svg width="52" height="52"></svg>';
  const rot = t.rot ? ` transform="${t.rot}"` : '';
  return `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="${a.tonoMedio}" stroke-linecap="round" stroke-linejoin="round"><path d="${t.d}"${rot} stroke-width="2"/><path d="${t.dd}"${rot} stroke-width="1.25"/></svg>`;
}

let n = 0;
function nuova(k: ChiaveIcona, tono: TonoIcona, taglia: 60 | 96): string {
  // useId riparte a ogni renderToStaticMarkup: senza un prefisso unico le maschere avrebbero tutte lo stesso id.
  return renderToStaticMarkup(createElement(IconaIngrediente, { chiave: k, area: areaDi(k), tono, taglia }), { identifierPrefix: `i${++n}-` });
}

function tessera(k: ChiaveIcona, tono: TonoIcona): string {
  const a = AREA.get(areaDi(k))!;
  const stile: Record<TonoIcona, string> = {
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
