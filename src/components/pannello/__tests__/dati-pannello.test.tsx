import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import type { VoceEvitata } from '@/domain/list-builder';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';

vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(),
  salvaImpostazioni: vi.fn(),
  leggiSlotDefs: vi.fn(),
  salvaSlotDefs: vi.fn(),
  pastiDiDefault: vi.fn(() => [
    { id: 'default-colazione', nome: 'Colazione', posizione: 0, assenzeAbituali: [false, false, false, false, false, false, false] },
    { id: 'default-spuntino', nome: 'Spuntino', posizione: 1, assenzeAbituali: [false, false, false, false, false, true, true] },
    { id: 'default-pranzo', nome: 'Pranzo', posizione: 2, assenzeAbituali: [true, true, true, true, true, false, false] },
    { id: 'default-cena', nome: 'Cena', posizione: 3, assenzeAbituali: [false, false, false, false, false, false, false] },
  ]),
}));

// `eRifiutoRls` è quella vera: è pura, e i dati si ramificano su di lei.
vi.mock('@/data/casa', async () => {
  const reale = await vi.importActual<typeof import('@/data/casa')>('@/data/casa');
  return { statoCasa: vi.fn(), dimenticaIdCasa: vi.fn(), eRifiutoRls: reale.eRifiutoRls };
});
vi.mock('@/data/risparmio', () => ({ leggiRisparmioTotale: vi.fn() }));
vi.mock('@/data/utente', () => ({ leggiUtente: vi.fn() }));

// Il pannello aperto, senza montare il provider vero: qui si provano i dati.
const pannello = vi.hoisted(() => ({ aperto: true, chiudiDialogo: vi.fn() }));
vi.mock('../PannelloProvider', () => ({ usePannello: () => pannello }));

import { leggiImpostazioni, salvaImpostazioni, leggiSlotDefs, salvaSlotDefs } from '@/data/impostazioni';
import { statoCasa, dimenticaIdCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { leggiUtente } from '@/data/utente';
import { DatiPannelloProvider, useDatiPannello } from '../DatiPannello';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, false, false, false, false, false, false] };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };

function impostazioni(porzioni: number): Impostazioni {
  return {
    moltiplicatorePorzioni: porzioni, ordineAree: [...ORDINE_AREE_DEFAULT],
    settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
  };
}

const OLIO: VoceEvitata = {
  ingredientId: 'i-1', nome: 'Olio', unita: 'ml', fabbisogno: 500,
  confezioniIngenue: 3, confezioniReali: 1, confezioniEvitate: 2, quantitaEvitata: 1000, prezzoConfezione: null,
};

function mockDati(o: { porzioni?: number; pasti?: MealSlotDef[] } = {}) {
  vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(o.porzioni ?? 1));
  vi.mocked(leggiSlotDefs).mockResolvedValue(o.pasti ?? [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
  vi.mocked(salvaSlotDefs).mockResolvedValue(undefined);
  vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
  vi.mocked(leggiRisparmioTotale).mockResolvedValue([OLIO]);
  vi.mocked(leggiUtente).mockResolvedValue({ nome: 'Andrea', email: 'andrea@example.it' });
}

/** Quello che una riga mostrerebbe, e i gesti che farebbe. */
function Consumatore() {
  const { stato, salvaImpostazioni: salva, salvaPasti, casaCambiata, ricaricaCasa, cancellataIl, segnaCancellata } = useDatiPannello();
  const [errore, setErrore] = useState(false);
  if (stato.stato !== 'pronto') return <p>{`stato ${stato.stato}`}</p>;
  const { impostazioni: i, slotDefs, casa, risparmio, utente } = stato.dati;
  const p = i.moltiplicatorePorzioni;
  return (
    <div>
      <p>{`Porzioni: ${p}`}</p>
      <p>{`Pasti: ${slotDefs.map((s) => s.nome).join(', ')}`}</p>
      <p>{`Casa: ${casa?.ruolo ?? 'non letta'}`}</p>
      <p>{`Confezioni: ${risparmio?.confezioni ?? 'nessun dato'}`}</p>
      <p>{`Utente: ${utente.nome}`}</p>
      <button type="button" onClick={async () => setErrore(!(await salva({ moltiplicatorePorzioni: p + 1 })))}>più</button>
      <button
        type="button"
        onClick={async () => setErrore(!(await salvaPasti(slotDefs.map((s, k) => (k === 0 ? { ...s, nome: 'Merenda' } : s)))))}
      >
        rinomina
      </button>
      <button type="button" onClick={() => void ricaricaCasa({ ruolo: 'solo', email: [], id: [] })}>rileggi la casa</button>
      <button type="button" onClick={() => segnaCancellata(new Date(2026, 8, 25, 10, 14))}>segna la cancellazione</button>
      <p>{`Cancellata: ${cancellataIl ? 'sì' : 'no'}`}</p>
      {errore && <p>Non siamo riusciti a salvare. Riprova.</p>}
      {casaCambiata && <p>La casa è cambiata: dati ricaricati. Riprova.</p>}
    </div>
  );
}

const albero = () => <DatiPannelloProvider><Consumatore /></DatiPannelloProvider>;
const piu = () => fireEvent.click(screen.getByRole('button', { name: 'più' }));

beforeEach(() => {
  vi.clearAllMocks();
  pannello.aperto = true;
});

describe('DatiPannello: lettura (spec §B.5, §C.11)', () => {
  it('all\'apertura legge impostazioni, pasti, casa, risparmio e utente', async () => {
    mockDati();
    render(albero());
    expect(screen.getByText('stato carico')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 1')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    expect(screen.getByText('Casa: solo')).toBeInTheDocument();
    expect(screen.getByText('Confezioni: 2')).toBeInTheDocument();
    expect(screen.getByText('Utente: Andrea')).toBeInTheDocument();
  });

  it('a pannello chiuso non legge niente', () => {
    mockDati();
    pannello.aperto = false;
    render(albero());
    expect(screen.getByText('stato carico')).toBeInTheDocument();
    expect(leggiImpostazioni).not.toHaveBeenCalled();
  });

  it('riaperto rilegge in silenzio, sopra i dati che ci sono', async () => {
    mockDati();
    const { rerender } = render(albero());
    await screen.findByText('Porzioni: 1');
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(2));
    pannello.aperto = false;
    rerender(albero());
    pannello.aperto = true;
    rerender(albero());
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 2')).toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
  });

  it('con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server', async () => {
    mockDati({ pasti: [] });
    render(albero());
    expect(await screen.findByText('Pasti: Colazione, Spuntino, Pranzo, Cena')).toBeInTheDocument();
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    expect(vi.mocked(salvaSlotDefs).mock.calls[0][0].map((p) => p.id)).toEqual([
      'default-colazione', 'default-spuntino', 'default-pranzo', 'default-cena',
    ]);
  });

  it('se statoCasa fallisce la casa è null e il resto è pronto', async () => {
    mockDati();
    vi.mocked(statoCasa).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    expect(await screen.findByText('Casa: non letta')).toBeInTheDocument();
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se il risparmio non si legge non ci sono dati per la nota, e il resto è pronto', async () => {
    mockDati();
    vi.mocked(leggiRisparmioTotale).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    expect(await screen.findByText('Confezioni: nessun dato')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se impostazioni o pasti non si leggono lo stato è errore', async () => {
    mockDati();
    vi.mocked(leggiSlotDefs).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    expect(await screen.findByText('stato errore')).toBeInTheDocument();
    errore.mockRestore();
  });
});

describe('DatiPannello: salvataggio delle impostazioni (spec §B.5, §L)', () => {
  // F4 della review: la rilettura del primo gesto può arrivare dopo quella del secondo.
  it('due gesti veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const riletture: Array<(i: Impostazioni) => void> = [];
    vi.mocked(leggiImpostazioni).mockImplementation(() => new Promise((resolve) => { riletture.push(resolve); }));

    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
    expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].moltiplicatorePorzioni).toBe(3);
    await waitFor(() => expect(riletture).toHaveLength(2));

    riletture[1](impostazioni(3));
    expect(await screen.findByText('Porzioni: 3')).toBeInTheDocument();
    riletture[0](impostazioni(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();
  });

  // Le scritture partono in fila (review dell'11/09): la seconda aspetta la prima anche se fallisce.
  it('due gesti veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
    vi.mocked(salvaImpostazioni).mockImplementation(
      () => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }),
    );
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(3));

    piu();
    await waitFor(() => expect(salvataggi).toHaveLength(1));
    piu();
    await new Promise((r) => setTimeout(r, 0));
    expect(salvataggi).toHaveLength(1);

    salvataggi[0].reject(new Error('rete'));
    await waitFor(() => expect(salvataggi).toHaveLength(2));
    expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].moltiplicatorePorzioni).toBe(3);
    salvataggi[1].resolve();

    expect(await screen.findByText('Porzioni: 3')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  // B1 della review di correttezza: il rollback rilegge dal server, non torna al ref.
  it('due gesti veloci: se il primo riesce ma la sua rilettura non è l\'ultima e il secondo fallisce, mostra il valore del server', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
    vi.mocked(salvaImpostazioni).mockImplementation(
      () => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }),
    );
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(2));

    piu();
    await waitFor(() => expect(salvataggi).toHaveLength(1));
    piu();
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();

    salvataggi[0].resolve();
    await waitFor(() => expect(leggiImpostazioni).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(salvataggi).toHaveLength(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();

    salvataggi[1].reject(new Error('rete'));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 2')).toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(3);
    errore.mockRestore();
  });

  // Review dell'11/09 (bassa): con la coda il rollback rilegge dopo tutte le scritture precedenti.
  it('due gesti veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let sulServer = 1;
    let confermaPrima: () => void = () => {};
    vi.mocked(salvaImpostazioni)
      .mockImplementationOnce((i) => new Promise<void>((resolve) => {
        confermaPrima = () => { sulServer = i.moltiplicatorePorzioni; resolve(); };
      }))
      .mockRejectedValueOnce(new Error('rete'));
    vi.mocked(leggiImpostazioni).mockImplementation(async () => impostazioni(sulServer));

    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    piu();
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(salvaImpostazioni).toHaveBeenCalledTimes(1);

    confermaPrima();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 2')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se il salvataggio fallisce e anche la rilettura fallisce, torna all\'ultimo valore confermato e lo dice', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));

    piu();
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    expect(errore).toHaveBeenCalledWith('impostazioni: rilettura dopo il salvataggio fallito non riuscita.', expect.any(Error));
    errore.mockRestore();
  });

  it('se il salvataggio fallisce torna al valore del server e lo dice; un errore qualsiasi non è un cambio di casa', async () => {
    mockDati({ porzioni: 1 });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    await screen.findByText('Porzioni: 1');

    piu();
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(dimenticaIdCasa).not.toHaveBeenCalled();
    expect(leggiSlotDefs).toHaveBeenCalledTimes(1);
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  // Prova del 15/09: la casa è cambiata da un altro telefono, e la RLS rifiuta (42501).
  it('se la RLS rifiuta il salvataggio scarta l\'id della casa, chiude il dialogo, ricarica tutto e lo dice', async () => {
    mockDati({ porzioni: 1 });
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] });
    render(albero());
    expect(await screen.findByText('Casa: membro')).toBeInTheDocument();
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValue({
      code: '42501',
      message: 'new row violates row-level security policy for table "settings"',
    });
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(3));
    vi.mocked(leggiSlotDefs).mockResolvedValue([
      SLOT_COLAZIONE,
      { id: 'sd-4', nome: 'Merenda', posizione: 1, assenzeAbituali: ASSENZE },
      { ...SLOT_PRANZO, posizione: 2 },
      { ...SLOT_CENA, posizione: 3 },
    ]);
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });

    piu();
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    expect(pannello.chiudiDialogo).toHaveBeenCalledTimes(1);
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(leggiSlotDefs).toHaveBeenCalledTimes(2);
    expect(statoCasa).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Merenda, Pranzo, Cena')).toBeInTheDocument();
    expect(screen.getByText('Casa: solo')).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
    expect(salvaImpostazioni).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('un rifiuto RLS riconosciuto dal solo messaggio (senza codice) ricarica allo stesso modo', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('new row violates row-level security policy'));

    piu();
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('«La casa è cambiata…» sparisce al prossimo salvataggio', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValueOnce({ code: '42501', message: 'rls' });
    piu();
    await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.');
    piu();
    expect(screen.queryByText('La casa è cambiata: dati ricaricati. Riprova.')).not.toBeInTheDocument();
    errore.mockRestore();
  });
});

describe('DatiPannello: pasti e casa (spec §C.1, §C.2, §L)', () => {
  it('salvaPasti è ottimistico; se fallisce rilegge i pasti dal server, li mostra e dà false', async () => {
    mockDati();
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rifiuta: (e: Error) => void = () => {};
    vi.mocked(salvaSlotDefs).mockReturnValueOnce(new Promise<void>((_, r) => { rifiuta = r; }));

    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    expect(screen.getByText('Pasti: Merenda, Pranzo, Cena')).toBeInTheDocument();
    // La scrittura parte dalla coda, un giro dopo: si rifiuta solo quando è partita.
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    rifiuta(new Error('rete'));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    expect(leggiSlotDefs).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });

  // salvaSlotDefs non è atomico: la cancellazione può essere già avvenuta quando la scrittura fallisce.
  it('se il salvataggio dei pasti fallisce dopo la cancellazione, mostra i pasti del server, non la copia locale', async () => {
    mockDati({ pasti: [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA, { id: 'sd-4', nome: 'Merenda', posizione: 3, assenzeAbituali: ASSENZE }] });
    render(albero());
    await screen.findByText('Pasti: Colazione, Pranzo, Cena, Merenda');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('upsert fallito'));
    // Sul server Merenda non c'è più: il delete è passato, l'upsert no.
    vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);

    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(await screen.findByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se falliscono il salvataggio dei pasti e la rilettura, torna all\'ultimo insieme confermato', async () => {
    mockDati();
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('rete'));
    vi.mocked(leggiSlotDefs).mockRejectedValue(new Error('rete'));

    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    expect(errore).toHaveBeenCalledWith('impostazioni: rilettura dei pasti dopo il salvataggio fallito non riuscita.', expect.any(Error));
    errore.mockRestore();
  });

  it('pasti e impostazioni stanno nella stessa coda: la scrittura dei pasti aspetta quella in volo', async () => {
    mockDati();
    render(albero());
    await screen.findByText('Porzioni: 1');
    let confermaImpostazioni: () => void = () => {};
    vi.mocked(salvaImpostazioni).mockReturnValueOnce(new Promise<void>((r) => { confermaImpostazioni = r; }));

    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    confermaImpostazioni();
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
  });

  it('cancellataIl vale fino alla chiusura del pannello (spec §D)', async () => {
    mockDati();
    const { rerender } = render(albero());
    await screen.findByText('Porzioni: 1');
    expect(screen.getByText('Cancellata: no')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'segna la cancellazione' }));
    expect(screen.getByText('Cancellata: sì')).toBeInTheDocument();
    pannello.aperto = false;
    rerender(albero());
    pannello.aperto = true;
    rerender(albero());
    expect(screen.getByText('Cancellata: no')).toBeInTheDocument();
  });

  it('ricaricaCasa: se la rilettura fallisce vale lo stato di riserva passato', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValueOnce({ ruolo: 'proprietario', email: ['b@c.it'], id: ['id-b'] });
    render(albero());
    expect(await screen.findByText('Casa: proprietario')).toBeInTheDocument();
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(statoCasa).mockRejectedValueOnce(new Error('rete'));
    fireEvent.click(screen.getByRole('button', { name: 'rileggi la casa' }));
    expect(await screen.findByText('Casa: solo')).toBeInTheDocument();
    errore.mockRestore();
  });
});
