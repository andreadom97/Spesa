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
 * 6. settimane ordinate per numero, giorni per indice;
 * 7. alla fine, i pasti rimasti senza piatti si scartano (con una nota `settimana s giorno g:
 *    pasto «nome» senza piatti, scartato`), poi i giorni rimasti senza pasti e le settimane
 *    rimaste senza giorni (senza nota a parte). Un pasto vuoto arriva da `validaPianoParziale`,
 *    che lo ammette perché una pagina può chiudere col solo titolo di un pasto (i piatti sono
 *    sulla successiva, e la regola 3 li accoda al guscio) o riportare un pasto libero. Se
 *    spariscono tutte le settimane il piano fuso ha `settimane: []` e `validaEsito` a valle lo
 *    boccia (422 in route): è voluto, la dieta è davvero illeggibile.
 * Nessun'altra normalizzazione.
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

  const settimaneOrdinate = [...settimane.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, giorni]) => ({
      numero,
      giorni: [...giorni.values()].sort((a, b) => a.giorno - b.giorno),
    }));

  // Regola 7: via i pasti senza piatti (con nota), poi i giorni e le settimane rimasti vuoti.
  const settimanePiene = settimaneOrdinate
    .map((s) => ({
      numero: s.numero,
      giorni: s.giorni
        .map((g) => ({
          ...g,
          pasti: g.pasti.filter((p) => {
            if (p.piatti.length > 0) return true;
            note.push(`settimana ${s.numero} giorno ${g.giorno}: pasto «${p.nomeOriginale}» senza piatti, scartato`);
            return false;
          }),
        }))
        .filter((g) => g.pasti.length > 0),
    }))
    .filter((s) => s.giorni.length > 0);

  return {
    archetipo: indice.archetipo,
    fonte: indice.fonte,
    settimane: settimanePiene,
    noteEstrazione: note,
  };
}
