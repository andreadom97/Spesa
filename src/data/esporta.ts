import { componiEsportazione, nomeFileEsportazione } from '@/domain/esporta';
import { VERSIONE } from '@/components/pannello/versione';
import { leggiImpostazioni, leggiSlotDefs } from './impostazioni';
import { leggiIngredienti, leggiRepertorio } from './repertorio';
import { leggiTutteLeSettimane } from './settimana';
import { leggiDispensa } from './dispensa';
import { leggiPronti } from './pronti';

/**
 * Il giorno di chi esporta, aaaa-mm-gg, dall'ora locale del telefono. Non il
 * giorno UTC del resto dei dati: il nome del file lo legge una persona, e a
 * mezzanotte e mezza in Italia il file è già del giorno dopo.
 */
function giornoLocale(d: Date): string {
  const due = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

/**
 * «Esporta i tuoi dati» (spec fase 5 §E.3, §C.8): legge tutto in parallelo,
 * lo compone con la funzione pura e restituisce un File JSON indentato,
 * `dispesa-{gg-mm-aaaa}.json`. Tutto in memoria sul telefono: con i volumi di
 * un utente vero resta sotto il megabyte [ipotesi, spec §L].
 *
 * Le letture sono quelle dell'app: i piatti sono quelli attivi
 * (`leggiRepertorio`); i Pronti sono tutti i lotti, decaduti compresi
 * (`leggiPronti`). Se una lettura fallisce l'errore passa, e non esce un file
 * a metà.
 */
export async function preparaEsportazione(adesso: Date = new Date()): Promise<File> {
  const [impostazioni, pasti, ingredienti, piatti, piano, stato, pronti] = await Promise.all([
    leggiImpostazioni(),
    leggiSlotDefs(),
    leggiIngredienti(),
    leggiRepertorio(),
    leggiTutteLeSettimane(),
    leggiDispensa(),
    leggiPronti(),
  ]);
  const esportazione = componiEsportazione({
    versione: VERSIONE,
    esportatoIl: adesso.toISOString(),
    impostazioni,
    pasti,
    ingredienti,
    piatti,
    piano,
    dispensa: { stato, pronti },
  });
  return new File(
    [JSON.stringify(esportazione, null, 2)],
    nomeFileEsportazione(giornoLocale(adesso)),
    { type: 'application/json' },
  );
}
