function aUtc(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Data ISO non valida: ${iso}`);
  return ms;
}

function daUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const GIORNO_MS = 86_400_000;

/** Giorni pieni da `da` ad `a`. Negativo se `a` precede `da`. */
export function giorniTra(da: string, a: string): number {
  return Math.round((aUtc(a) - aUtc(da)) / GIORNO_MS);
}

export function sommaGiorni(iso: string, n: number): string {
  return daUtc(aUtc(iso) + n * GIORNO_MS);
}

/** Il lunedì della settimana che contiene `iso`. */
export function lunediDi(iso: string): string {
  const dow = new Date(aUtc(iso)).getUTCDay(); // 0 = domenica
  const indietro = dow === 0 ? 6 : dow - 1;
  return sommaGiorni(iso, -indietro);
}

/** Le sette date della settimana, dal lunedì passato in ingresso. */
export function giorniDellaSettimana(lunedi: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sommaGiorni(lunedi, i));
}
