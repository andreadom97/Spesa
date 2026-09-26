import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { leggiIngredienti } from '@/data/repertorio';
import { azzera, montaPannello, ingrediente } from './aiuti';
import { percorso, router } from './finti';

const CAROTE = ingrediente({ id: 'i-1', nome: 'Carote', area: 'ortofrutta', formatoConfezione: 1000, deperibile: true });
const LIMONI = ingrediente({ id: 'i-2', nome: 'Limoni', area: 'ortofrutta', unitaBase: 'pz', formatoConfezione: 4, classeResiduo: 'intero', deperibile: true });
const OLIO = ingrediente({ id: 'i-3', nome: 'Olio extravergine', area: 'dispensa', unitaBase: 'ml', formatoConfezione: 1000, classeResiduo: 'stima' });

function navigatoA(): string[] {
  return [...router.push.mock.calls, ...router.replace.mock.calls].map((c) => String(c[0]));
}

describe('Ingredienti', () => {
  beforeEach(() => azzera());

  it('un blocco per area nell’ordine dell’utente, per nome, senza le aree vuote', async () => {
    // ORDINE_TEST: dispensa prima di ortofrutta.
    montaPannello('ingredienti', { ingredienti: [LIMONI, OLIO, CAROTE] });
    const blocchi = await screen.findAllByRole('region');
    expect(blocchi.map((b) => b.getAttribute('aria-label'))).toEqual(['DISPENSA E CONSERVE', 'ORTOFRUTTA']);
    const ortofrutta = within(blocchi[1]).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(ortofrutta).toEqual(['Apri Carote', 'Apri Limoni']);
  });

  it('ogni riga dice formato, unità, classe e fresco', async () => {
    montaPannello('ingredienti', { ingredienti: [CAROTE, LIMONI, OLIO] });
    expect(await screen.findByText('1000 G · PORZIONABILE · FRESCO')).toBeInTheDocument();
    expect(screen.getByText('4 PZ · INTERO · FRESCO')).toBeInTheDocument();
    expect(screen.getByText('1000 ML · A STIMA')).toBeInTheDocument();
  });

  it('in testa la nota di oggi', async () => {
    montaPannello('ingredienti', { ingredienti: [CAROTE] });
    expect(await screen.findByText('Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.')).toBeInTheDocument();
  });

  it('senza ingredienti lo stato vuoto con la nota di oggi', async () => {
    montaPannello('ingredienti', { ingredienti: [] });
    expect(await screen.findByText('Nessun ingrediente')).toBeInTheDocument();
    expect(screen.getByText('Nascono dai piatti: il primo che aggiungi a un piatto compare qui.')).toBeInTheDocument();
  });

  it('mentre legge CARICO…, e se la lettura fallisce lo dice', async () => {
    vi.mocked(leggiIngredienti).mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = montaPannello('ingredienti');
    expect(await screen.findByRole('status')).toHaveTextContent('CARICO…');
    unmount();

    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiIngredienti).mockRejectedValueOnce(new Error('rete'));
    montaPannello('ingredienti');
    expect(await screen.findByText('Non riusciamo a caricare gli ingredienti. Riprova più tardi.')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('il tocco su una riga salva origine e scorrimento e apre l’editor col ritorno al pannello', async () => {
    percorso.valore = '/dispensa';
    montaPannello('ingredienti', { ingredienti: [CAROTE] });
    fireEvent.click(await screen.findByRole('button', { name: 'Apri Carote' }));
    expect(JSON.parse(sessionStorage.getItem('spesa:origine-pannello') ?? 'null')).toEqual({ pathname: '/dispensa', sotto: 'ingredienti' });
    expect(sessionStorage.getItem('spesa:pannello-scroll:ingredienti')).not.toBeNull();
    await waitFor(() => expect(navigatoA()).toContain('/piatti/nuovo/ingredienti/i-1?torna=impostazioni'));
  });
});
