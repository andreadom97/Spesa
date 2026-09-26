/**
 * Il vuoto di ricerca di Piatti (spec fase 3): la ricerca non ha trovato
 * niente, e sotto si dice cosa fare. Estratto dalla fase 7 (§A.3) perché lo
 * mostra anche Scegli, con la stessa ricerca: un testo solo, non due copie
 * che col tempo divergono. Nessuna prop: quando mostrarlo lo decide chi lo usa.
 */
export function VuotoRicercaPiatti() {
  return (
    <div style={{ flexShrink: 0, padding: '44px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
        Nessun piatto qui
      </div>
      <div style={{ fontSize: 14, color: 'var(--testo-2)' }}>Prova un&apos;altra parola, oppure aggiungine uno.</div>
    </div>
  );
}
