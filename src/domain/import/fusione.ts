import type { IndiceEstrazione } from './indice';
import { normalizza } from './mapping';
import type { GiornoEstratto, PianoEstratto } from './types';

/**
 * La fusione delle pagine di un'estrazione a pagine (spec 2026-09-05 §2.3): funzione pura,
 * deterministica, che ricompone i piani parziali (uno per pagina, già passati da
 * `validaPianoParziale`) in un piano intero. Non valida: il chiamante passa il risultato a
 * `validaEsito` come qualsiasi estrazione. Non muta gli input: ciò che ricompone è clonato.
 *
 * Regole, nell'ordine della spec:
 * 1. archetipo e fonte vengono dall'indice; una pagina con un archetipo diverso produce una
 *    nota; una fonte diversa no (è testo libero, diverso a ogni chiamata: l'indice vince in
 *    silenzio);
 * 2. i giorni si identificano per (settimana, giorno); stesso giorno su più pagine → i pasti
 *    della pagina successiva si accodano; le pagine si processano per numero di pagina,
 *    qualunque sia l'ordine dell'array;
 * 3. se la pagina k continua dalla precedente e il suo primo pasto (del primo giorno che essa
 *    contiene, nell'ordine in cui lo elenca) ha lo stesso nome normalizzato dell'ultimo pasto
 *    già fuso per quel giorno, i piatti si concatenano dentro quel pasto;
 * 4. titolo: il primo non nullo vince; un secondo diverso finisce in nota;
 * 5. noteEstrazione: quelle dell'indice, poi per ogni pagina le sue prefissate `pagina k: `,
 *    seguite dalle note che la fusione stessa produce per quella pagina (regole 1 e 4);
 * 6. settimane ordinate per numero, giorni per indice. Nessun'altra normalizzazione.
 */
export function fondiPagine(indice: IndiceEstrazione, pagine: { pagina: number; piano: PianoEstratto }[]): PianoEstratto {
  const note = [...indice.noteEstrazione];
  // settimana -> (giorno -> giorno fuso): le chiavi numeriche restano ordinabili alla fine.
  const settimane = new Map<number, Map<number, GiornoEstratto>>();
  const ordinate = [...pagine].sort((a, b) => a.pagina - b.pagina);

  for (const { pagina, piano } of ordinate) {
    const prefisso = `pagina ${pagina}: `;
    for (const n of piano.noteEstrazione) note.push(prefisso + n);
    if (piano.archetipo !== indice.archetipo) note.push(`${prefisso}archetipo diverso dall'indice (${piano.archetipo})`);

    // Una pagina assente dall'indice non continua da nessuna: si fonde come se fosse a sé.
    const continua = indice.pagine.find((p) => p.pagina === pagina)?.continuaDallaPrecedente ?? false;
    let primoGiornoDellaPagina = true;

    for (const s of piano.settimane) {
      let giorni = settimane.get(s.numero);
      if (!giorni) {
        giorni = new Map();
        settimane.set(s.numero, giorni);
      }
      for (const g of s.giorni) {
        const pasti = structuredClone(g.pasti);
        const esistente = giorni.get(g.giorno);
        if (!esistente) {
          giorni.set(g.giorno, { giorno: g.giorno, titolo: g.titolo, pasti });
        } else {
          if (esistente.titolo === null) {
            esistente.titolo = g.titolo;
          } else if (g.titolo !== null && g.titolo !== esistente.titolo) {
            note.push(`${prefisso}titolo diverso per settimana ${s.numero} giorno ${g.giorno} ("${g.titolo}" invece di "${esistente.titolo}")`);
          }
          const ultimo = esistente.pasti[esistente.pasti.length - 1];
          const primo = pasti[0];
          if (continua && primoGiornoDellaPagina && ultimo && primo
            && normalizza(ultimo.nomeOriginale) === normalizza(primo.nomeOriginale)) {
            ultimo.piatti.push(...primo.piatti);
            pasti.shift();
          }
          esistente.pasti.push(...pasti);
        }
        primoGiornoDellaPagina = false;
      }
    }
  }

  return {
    archetipo: indice.archetipo,
    fonte: indice.fonte,
    settimane: [...settimane.entries()]
      .sort(([a], [b]) => a - b)
      .map(([numero, giorni]) => ({
        numero,
        giorni: [...giorni.values()].sort((a, b) => a.giorno - b.giorno),
      })),
    noteEstrazione: note,
  };
}
