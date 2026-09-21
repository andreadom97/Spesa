/**
 * Confronto fra i token del design system (`design/sistema/tokens.css`) e i
 * token del codice (`src/app/globals.css`). Modulo PURO, senza I/O: chi chiama
 * legge i file e passa il testo.
 *
 * Perché esiste: gli stessi valori sono scritti a mano in due file, e finché è
 * così l'unico modo perché non divergano in silenzio è qualcosa che fallisce.
 * Il guardiano è `scripts/__tests__/token-check.test.ts`, dentro `npm test`.
 *
 * Fa fallire — `divergenti`: un token con lo **stesso nome** e un valore diverso
 * nei due file. Il design dice una cosa e l'app ne fa un'altra: è un bug, e il
 * test dice quale dei due va corretto guardando la fonte dichiarata in cima a
 * `tokens.css`.
 *
 * Non fa fallire, ma riporta:
 * - `soloDesign` — token dichiarati nel design e assenti dal codice (spazi,
 *   raggi, scala tipografica, dock, moto). Il codice li ha scritti a mano dentro
 *   i componenti: portarli dentro è un lavoro a sé, non un errore.
 * - `soloCodice` — token che il codice ha e il design non nomina. Ogni voce è un
 *   nome inventato in corsa: o entra in `tokens.css`, o va rinominato.
 */

export interface Divergenza {
  nome: string;
  design: string;
  codice: string;
}

export interface EsitoConfronto {
  divergenti: Divergenza[];
  soloDesign: string[];
  soloCodice: string[];
  /** Quanti token esistono in tutti e due i file: il perimetro davvero verificato. */
  comuni: number;
}

/** Un `--nome: valore` dentro un commento è prosa, non un token. */
function senzaCommenti(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * I blocchi `:root { … }`, che è dove i token sono *definiti*. Una dichiarazione
 * dentro un'altra regola (es. `--coda: 16px` in `.scroll-app.con-piede`) è un
 * override locale di quella regola, non la definizione del token: resta fuori.
 */
function blocchiRoot(css: string): string[] {
  const blocchi: string[] = [];
  const apertura = /(^|[\s,}])\:root\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = apertura.exec(css)) !== null) {
    let profondita = 1;
    let i = m.index + m[0].length;
    const da = i;
    while (i < css.length && profondita > 0) {
      if (css[i] === '{') profondita++;
      else if (css[i] === '}') profondita--;
      i++;
    }
    blocchi.push(css.slice(da, i - 1));
    apertura.lastIndex = i;
  }
  return blocchi;
}

/**
 * Due scritture dello stesso valore non sono una divergenza: gli spazi (anche
 * quelli dopo le virgole di `rgba(...)`), `0.5` contro `.5` e le maiuscole degli
 * esadecimali sono formattazione. Tutto il resto sì.
 */
export function normalizza(valore: string): string {
  return valore
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/(^|[\s,(])0\./g, '$1.')
    .toLowerCase();
}

/** I token definiti in `:root`, nome → valore normalizzato. */
export function leggiToken(css: string): Map<string, string> {
  const token = new Map<string, string>();
  for (const blocco of blocchiRoot(senzaCommenti(css))) {
    const dichiarazione = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let m: RegExpExecArray | null;
    while ((m = dichiarazione.exec(blocco)) !== null) {
      token.set(m[1], normalizza(m[2]));
    }
  }
  return token;
}

export function confronta(design: Map<string, string>, codice: Map<string, string>): EsitoConfronto {
  const divergenti: Divergenza[] = [];
  const soloDesign: string[] = [];
  let comuni = 0;

  for (const [nome, valore] of design) {
    const nelCodice = codice.get(nome);
    if (nelCodice === undefined) {
      soloDesign.push(nome);
      continue;
    }
    comuni++;
    if (nelCodice !== valore) divergenti.push({ nome, design: valore, codice: nelCodice });
  }

  const soloCodice = [...codice.keys()].filter((nome) => !design.has(nome));

  return {
    divergenti,
    soloDesign: soloDesign.sort(),
    soloCodice: soloCodice.sort(),
    comuni,
  };
}

/** Il messaggio che il test stampa quando fallisce: dice nome, i due valori e cosa fare. */
export function formattaEsito(esito: EsitoConfronto): string {
  const righe = [
    `${esito.comuni} token in comune, ${esito.divergenti.length} divergenti.`,
    '',
    ...esito.divergenti.map(
      (d) => `  ${d.nome}\n    design/sistema/tokens.css: ${d.design}\n    src/app/globals.css:      ${d.codice}`,
    ),
    '',
    'Correggi il file che NON è la fonte di quel valore: tokens.css dichiara in cima',
    'che neutri, aree e font vengono da globals.css; tutto il resto viene da DESIGN.md.',
  ];
  return righe.join('\n');
}
