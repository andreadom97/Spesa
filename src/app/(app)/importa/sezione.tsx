/** Testi e titoli condivisi da Controlla e Ingredienti (fase 8b). */

export function capitalizza(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** Il nome di un pasto della dieta in frase: «spuntino_mattina» → «Spuntino mattina». */
export function nomePasto(nomeOriginale: string): string {
  return capitalizza(nomeOriginale.replace(/_/g, ' '));
}

/** «1 pasto», «3 pasti»: plurali corretti (DESIGN.md §10). */
export function plurale(n: number, uno: string, molti: string): string {
  return `${n} ${n === 1 ? uno : molti}`;
}

/**
 * Il titolo di un Blocco di gruppo con il contatore a destra (DESIGN.md §8, Etichetta di
 * sezione): si passa come `titolo` di `BloccoGruppo`, che lo mette nel suo h3.
 */
export function TitoloSezione({ testo, contatore }: { testo: string; contatore: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <span>{testo}</span>{' '}
      <span style={{ fontWeight: 500, letterSpacing: '0.10em', color: 'var(--sec)' }}>{contatore}</span>
    </span>
  );
}
