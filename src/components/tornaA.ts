/**
 * Una regola sola per ogni freccia e pillola che torna (prove dal telefono della fase 7).
 *
 * Prima ogni ritorno era una `router.push`: una voce nuova in avanti. Sull'indietro di sistema
 * di Android la cronologia diventava Impostazioni → Piatti → Piatto → Piatti, e dall'ultimo
 * Piatti l'indietro riportava al Piatto, anche eliminato («Piatto non trovato»).
 *
 * Ora, se la voce prima di questa è la destinazione, si torna indietro davvero: la pagina
 * lasciata esce dalla cronologia e l'indietro di sistema segue lo stesso percorso delle
 * frecce. Altrimenti (pagina aperta per prima, o arrivata da un'altra parte) la destinazione
 * **sostituisce** la voce di oggi: niente voce morta dietro.
 *
 * La voce prima si legge dalla Navigation API (`window.navigation`). Dove manca, o se lancia,
 * si sostituisce sempre: nessun indietro alla cieca, che potrebbe uscire dall'app.
 */

/** Il minimo della Navigation API che serve qui: la libreria DOM di TypeScript non la dichiara. */
interface VoceNavigazione {
  url: string | null;
  index: number;
}
interface NavigazioneMinima {
  currentEntry: VoceNavigazione | null;
  entries(): VoceNavigazione[];
}

export interface RouterRitorno {
  back(): void;
  replace(href: string): void;
}

function vocePrecedente(): string | null {
  try {
    const nav = (window as unknown as { navigation?: NavigazioneMinima }).navigation;
    const corrente = nav?.currentEntry;
    if (!nav || !corrente || corrente.index < 1) return null;
    return nav.entries()[corrente.index - 1]?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Stessa origine, stesso percorso e stessi parametri, tranne `da`: `da` dice solo da dove si è
 * arrivati (`/piatti?da=impostazioni` è Piatti come `/piatti`).
 */
export function stessaPagina(url: string, dest: string, base: string): boolean {
  const a = new URL(url, base);
  const b = new URL(dest, base);
  if (a.origin !== b.origin || a.pathname !== b.pathname) return false;
  const pa = new URLSearchParams(a.search);
  const pb = new URLSearchParams(b.search);
  pa.delete('da');
  pb.delete('da');
  pa.sort();
  pb.sort();
  return pa.toString() === pb.toString();
}

export function tornaA(router: RouterRitorno, dest: string): void {
  const prima = vocePrecedente();
  if (prima !== null && stessaPagina(prima, dest, window.location.href)) router.back();
  else router.replace(dest);
}
