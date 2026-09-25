import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { useState } from 'react';
import type { VoceContesto } from '@/domain/dispensa-ai';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/data/dispensa', () => ({ correggiResiduo: vi.fn(), impostaCongelato: vi.fn() }));
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { getSession } }) }));

import { correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { WidgetAI } from '../WidgetAI';
import { MSG_MICROFONO, type Dettatura } from '../useDettatura';

const RISO: VoceContesto = { id: 'riso', nome: 'Riso carnaroli', unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false };
const OLIO: VoceContesto = { id: 'olio', nome: 'Olio extravergine', unitaBase: 'ml', formatoConfezione: 1000, residuo: 500, congelato: false };
const PARMIGIANO: VoceContesto = { id: 'parmigiano', nome: 'Parmigiano', unitaBase: 'g', formatoConfezione: 500, residuo: 300, congelato: false };
const LATTE: VoceContesto = { id: 'latte', nome: 'Latte', unitaBase: 'ml', formatoConfezione: 1000, residuo: 1000, congelato: false };
const CONTESTO = [RISO, OLIO, PARMIGIANO, LATTE];

const FINITO_RISO = { ingredientId: 'riso', campo: 'residuo', valoreNuovo: 0, valoreAttuale: 400, confidence: 0.95, motivazione: '«ho finito il riso» → 0 g' };
const OLIO_META = { ingredientId: 'olio', campo: 'residuo', valoreNuovo: 250, valoreAttuale: 500, confidence: 0.95, motivazione: "«l'olio è a metà» → 250 ml" };
const PARM_FREEZER = { ingredientId: 'parmigiano', campo: 'congelato', valoreNuovo: true, valoreAttuale: false, confidence: 0.6, motivazione: '«ho congelato il parmigiano»' };
const LATTE_META = { ingredientId: 'latte', campo: 'residuo', valoreNuovo: 500, valoreAttuale: 1000, confidence: 0.5, motivazione: '«il latte è a metà» → 500 ml' };

function rispostaOk(esito: unknown) {
  return { ok: true, status: 200, json: async () => esito };
}

function dettaturaFinta(sovrascritti: Partial<Dettatura> = {}): Dettatura {
  return {
    disponibile: true, attiva: false, modo: null, secondi: 0, provvisorio: '', errore: null,
    premi: vi.fn(), tocca: vi.fn(), ferma: vi.fn(),
    ...sovrascritti,
  };
}

const onDatiCambiati = vi.fn();
const onChiudi = vi.fn();

/** La pagina in piccolo: tiene la bozza, così `onBozza` scrive davvero. */
function Banco({ dettatura = dettaturaFinta(), iniziale = '', contesto = CONTESTO }: {
  dettatura?: Dettatura; iniziale?: string; contesto?: VoceContesto[];
}) {
  const [bozza, setBozza] = useState(iniziale);
  return (
    <WidgetAI
      contesto={contesto}
      dettatura={dettatura}
      bozza={bozza}
      onBozza={setBozza}
      onDatiCambiati={onDatiCambiati}
      onChiudi={onChiudi}
    />
  );
}

function scriviEInvia(nota: string) {
  fireEvent.change(screen.getByRole('textbox', { name: "Nota per l'AI" }), { target: { value: nota } });
  fireEvent.click(screen.getByRole('button', { name: 'FAI LE MODIFICHE' }));
}

function invia(nota: string) {
  render(<Banco />);
  scriviEInvia(nota);
}

describe('WidgetAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);
    vi.mocked(impostaCongelato).mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('la forma', () => {
    it('è un dialogo «Modifica con l\'AI» col campo, il segnaposto e il fuoco', () => {
      render(<Banco />);
      expect(screen.getByRole('dialog', { name: "Modifica con l'AI" })).toBeInTheDocument();
      const campo = screen.getByRole('textbox', { name: "Nota per l'AI" });
      expect(campo).toHaveAttribute('placeholder', "Es. ho finito il riso, l'olio è a metà…");
      expect(campo).toHaveFocus();
    });

    it('la X Chiudi e il velo chiamano onChiudi; il tocco dentro il widget no', () => {
      render(<Banco />);
      fireEvent.click(screen.getByRole('dialog'));
      expect(onChiudi).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
      expect(onChiudi).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByTestId('velo-widget'));
      expect(onChiudi).toHaveBeenCalledTimes(2);
    });

    it('FAI LE MODIFICHE è spento a bozza vuota (o di soli spazi) e acceso con testo', () => {
      render(<Banco />);
      const tasto = screen.getByRole('button', { name: 'FAI LE MODIFICHE' });
      expect(tasto).toBeDisabled();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
      expect(tasto).toBeDisabled();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ho finito il riso' } });
      expect(tasto).toBeEnabled();
    });

    it('la bozza arriva dalla pagina: riaprendo, il testo c\'è ancora', () => {
      render(<Banco iniziale="l'olio è a metà" />);
      expect(screen.getByRole('textbox')).toHaveValue("l'olio è a metà");
      expect(screen.getByRole('button', { name: 'FAI LE MODIFICHE' })).toBeEnabled();
    });

    it('senza tastiera sta a bottom 114; con la tastiera poggia sopra di 12', () => {
      const vv = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
      try {
        render(<Banco />);
        const dialogo = screen.getByRole('dialog');
        expect(dialogo.style.bottom).toBe('114px');
        vv.height = window.innerHeight - 300;
        act(() => {
          vv.dispatchEvent(new Event('resize'));
        });
        expect(dialogo.style.bottom).toBe('312px');
      } finally {
        Reflect.deleteProperty(window, 'visualViewport');
      }
    });
  });

  describe('la dettatura', () => {
    it('senza dettatura disponibile il tondo non c\'è', () => {
      render(<Banco dettatura={dettaturaFinta({ disponibile: false })} />);
      expect(screen.queryByRole('button', { name: 'Registra un vocale' })).not.toBeInTheDocument();
    });

    it('pointerDown sul tondo chiama premi; il click da tastiera (detail 0) chiama tocca, quello del dito no', () => {
      const dettatura = dettaturaFinta();
      render(<Banco dettatura={dettatura} />);
      const tondo = screen.getByRole('button', { name: 'Registra un vocale' });
      fireEvent.pointerDown(tondo);
      expect(dettatura.premi).toHaveBeenCalledTimes(1);
      fireEvent.click(tondo, { detail: 1 });
      expect(dettatura.tocca).not.toHaveBeenCalled();
      fireEvent.click(tondo, { detail: 0 });
      expect(dettatura.tocca).toHaveBeenCalledTimes(1);
    });

    it('mentre detta tenendo premuto: niente textarea, onda di 22 barre, tempo, provvisorio in --ter, RILASCIA PER FERMARE', () => {
      const { container } = render(
        <Banco
          iniziale="ho finito il riso"
          dettatura={dettaturaFinta({ attiva: true, modo: 'tenuto', provvisorio: 'il parmigiano è', secondi: 7 })}
        />,
      );
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'FAI LE MODIFICHE' })).not.toBeInTheDocument();
      expect(container.querySelectorAll('.onda-barra')).toHaveLength(22);
      expect(screen.getByRole('status')).toHaveTextContent('0:07');
      expect(screen.getByText('RILASCIA PER FERMARE')).toBeInTheDocument();
      const provvisorio = screen.getByText('il parmigiano è');
      expect(provvisorio).toHaveStyle({ color: 'var(--ter)' });
      const campo = provvisorio.parentElement!;
      expect(campo).toHaveAttribute('aria-live', 'polite');
      expect(campo).toHaveTextContent('ho finito il riso il parmigiano è');
    });

    it('mentre detta a tocchi: TOCCA PER FERMARE', () => {
      render(<Banco dettatura={dettaturaFinta({ attiva: true, modo: 'tocco' })} />);
      expect(screen.getByText('TOCCA PER FERMARE')).toBeInTheDocument();
      expect(screen.queryByText('RILASCIA PER FERMARE')).not.toBeInTheDocument();
    });

    it('errore del microfono → messaggio con role alert, e il tondo resta', () => {
      render(<Banco dettatura={dettaturaFinta({ errore: MSG_MICROFONO })} />);
      expect(screen.getByRole('alert')).toHaveTextContent('Il microfono non è disponibile: scrivi la nota.');
      expect(screen.getByRole('button', { name: 'Registra un vocale' })).toBeInTheDocument();
    });
  });

  describe('l\'invio', () => {
    it('la fetch porta il Bearer della sessione e la bozza come nota', async () => {
      const fetchMock = vi.fn().mockResolvedValue(rispostaOk({ proposte: [], nonRiconosciuti: [] }));
      vi.stubGlobal('fetch', fetchMock);
      invia('ho finito il riso');
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('/api/dispensa/correggi');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
      expect(JSON.parse(init.body as string)).toEqual({ nota: 'ho finito il riso', contesto: CONTESTO });
    });

    it('in volo: luce sul testo al posto della textarea, PREPARO LE MODIFICHE… come status, tasto e tondo spenti', async () => {
      let risolvi: (r: unknown) => void = () => {};
      vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => { risolvi = r; })));
      const { container } = render(<Banco />);
      scriviEInvia('ho finito il riso');

      expect(await screen.findByRole('status')).toHaveTextContent('PREPARO LE MODIFICHE…');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      const luce = container.querySelector('.anim-luce-testo');
      expect(luce).toHaveTextContent('ho finito il riso');
      expect(screen.getByRole('button', { name: 'FAI LE MODIFICHE' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Registra un vocale' })).toBeDisabled();

      await act(async () => {
        risolvi(rispostaOk({ proposte: [], nonRiconosciuti: [] }));
      });
      await waitFor(() => expect(screen.queryByText('PREPARO LE MODIFICHE…')).not.toBeInTheDocument());
      expect(container.querySelector('.anim-luce-testo')).toBeNull();
    });

    it('senza sessione → messaggio generico, nessuna fetch, la bozza resta', async () => {
      getSession.mockResolvedValue({ data: { session: null } });
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      invia('ho finito il riso');
      expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a correggere. Riprova.');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox')).toHaveValue('ho finito il riso');
    });

    it('503 → «La correzione non è disponibile.» come alert, FAI LE MODIFICHE spento anche col testo, la bozza resta', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'correzione non disponibile' }) }));
      invia('ho finito il riso');
      expect(await screen.findByRole('alert')).toHaveTextContent('La correzione non è disponibile.');
      expect(screen.getByRole('textbox')).toHaveValue('ho finito il riso');
      expect(screen.getByRole('button', { name: 'FAI LE MODIFICHE' })).toBeDisabled();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ho finito il riso e il latte' } });
      expect(screen.getByRole('button', { name: 'FAI LE MODIFICHE' })).toBeDisabled();
    });

    it('422 → «Non ho capito la nota, riprova.», la bozza resta e si può rimandare', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({}) }));
      invia('bla bla');
      expect(await screen.findByRole('alert')).toHaveTextContent('Non ho capito la nota, riprova.');
      expect(screen.getByRole('textbox')).toHaveValue('bla bla');
      expect(screen.getByRole('button', { name: 'FAI LE MODIFICHE' })).toBeEnabled();
    });

    it('un altro stato → «Non siamo riusciti a correggere. Riprova.», la bozza resta', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
      invia('ho finito il riso');
      expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a correggere. Riprova.');
      expect(screen.getByRole('textbox')).toHaveValue('ho finito il riso');
      expect(screen.getByRole('button', { name: 'FAI LE MODIFICHE' })).toBeEnabled();
    });

    it('fetch che rigetta (offline) → messaggio generico e bozza preservata', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      invia('ho finito il riso');
      expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a correggere. Riprova.');
      expect(screen.getByRole('textbox')).toHaveValue('ho finito il riso');
    });
  });

  describe('l\'esito', () => {
    it('sopra soglia si applica subito e finisce fra le APPLICATE; Annulla riscrive il valore di prima', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [FINITO_RISO], nonRiconosciuti: [] })));
      invia('ho finito il riso');

      await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('riso', 0, 400));
      expect(onDatiCambiati).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('APPLICATE 1 DI 1')).toBeInTheDocument();
      expect(screen.getByText('«ho finito il riso» → 0 g')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Annulla: Riso carnaroli 400 → 0 g' }));
      // `prima` = `p.valoreAttuale` (400), non `p.valoreNuovo` (0): l'annulla
      // di un «finito» non deve sembrare un'entrata a `correggiResiduo`, o
      // scriverebbe ultimo_acquisto = oggi senza nessun acquisto.
      await waitFor(() => expect(correggiResiduo).toHaveBeenLastCalledWith('riso', 400, 400));
      expect(await screen.findByText('APPLICATE 0 DI 1')).toBeInTheDocument();
      expect(onDatiCambiati).toHaveBeenCalledTimes(2);
    });

    it('i tre gruppi: APPLICATE k DI n con annullata, DA CONFERMARE n, NON RICONOSCIUTI fra caporali', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({
        proposte: [FINITO_RISO, OLIO_META, PARM_FREEZER, LATTE_META],
        nonRiconosciuti: ['il pane nero'],
      })));
      const { container } = render(<Banco />);
      scriviEInvia('ho finito il riso, olio a metà, parmigiano in freezer, latte a metà, il pane nero');

      expect(await screen.findByText('APPLICATE 2 DI 2')).toBeInTheDocument();
      expect(correggiResiduo).toHaveBeenCalledTimes(2);
      expect(correggiResiduo).toHaveBeenNthCalledWith(1, 'riso', 0, 400);
      expect(correggiResiduo).toHaveBeenNthCalledWith(2, 'olio', 250, 500);
      expect(impostaCongelato).not.toHaveBeenCalled();
      // L'esito sostituisce il campo, e il widget cresce fino a top 88.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('dialog').style.top).toBe('88px');

      fireEvent.click(screen.getByRole('button', { name: 'Annulla: Riso carnaroli 400 → 0 g' }));
      expect(await screen.findByText('APPLICATE 1 DI 2')).toBeInTheDocument();
      expect(screen.getByText('annullata')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Annulla: Riso carnaroli/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Annulla: Olio extravergine 500 → 250 ml' })).toBeInTheDocument();

      expect(screen.getByText('DA CONFERMARE 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Conferma: Parmigiano frigo → freezer' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Conferma: Latte 1000 → 500 ml' })).toBeInTheDocument();

      expect(screen.getByText('NON RICONOSCIUTI')).toBeInTheDocument();
      expect(screen.getByText('«il pane nero»')).toBeInTheDocument();
      expect(screen.getByText('Cercali in dispensa.')).toBeInTheDocument();
      expect(container.querySelector('.anim-luce-testo')).toBeNull();
    });

    it('sotto soglia non si applica finché non la confermi; confermata passa fra le applicate', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [LATTE_META, PARM_FREEZER], nonRiconosciuti: [] })));
      invia('il latte è a metà e ho congelato il parmigiano');

      expect(await screen.findByText('DA CONFERMARE 2')).toBeInTheDocument();
      expect(correggiResiduo).not.toHaveBeenCalled();
      expect(impostaCongelato).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Conferma: Latte 1000 → 500 ml' }));
      await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('latte', 500, 1000));
      expect(await screen.findByText('APPLICATE 1 DI 1')).toBeInTheDocument();
      expect(screen.getByText('DA CONFERMARE 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Annulla: Latte 1000 → 500 ml' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Conferma: Parmigiano frigo → freezer' }));
      await waitFor(() => expect(impostaCongelato).toHaveBeenCalledWith('parmigiano', true));
      expect(await screen.findByText('APPLICATE 2 DI 2')).toBeInTheDocument();
      expect(screen.queryByText(/^DA CONFERMARE/)).not.toBeInTheDocument();
    });

    it('mentre un Annulla è in volo la sua pillola è spenta', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [FINITO_RISO], nonRiconosciuti: [] })));
      invia('ho finito il riso');
      const annulla = await screen.findByRole('button', { name: 'Annulla: Riso carnaroli 400 → 0 g' });

      let risolvi: () => void = () => {};
      vi.mocked(correggiResiduo).mockImplementationOnce(() => new Promise<void>((r) => { risolvi = r; }));
      fireEvent.click(annulla);
      await waitFor(() => expect(annulla).toBeDisabled());
      fireEvent.click(annulla);
      expect(correggiResiduo).toHaveBeenCalledTimes(2);

      await act(async () => risolvi());
      expect(await screen.findByText('annullata')).toBeInTheDocument();
    });

    it('se un\'applicazione automatica fallisce a metà, il recap non mente', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [FINITO_RISO, OLIO_META], nonRiconosciuti: [] })));
      vi.mocked(correggiResiduo).mockImplementation(async (id) => {
        if (id === 'olio') throw new Error('scrittura fallita');
      });
      invia("ho finito il riso e l'olio è a metà");

      expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a correggere. Riprova.');
      expect(onDatiCambiati).toHaveBeenCalled();
      expect(screen.getByText('APPLICATE 1 DI 1')).toBeInTheDocument();
      const annulla = screen.getAllByRole('button', { name: /^Annulla:/ });
      expect(annulla).toHaveLength(1);
      expect(annulla[0]).toHaveAccessibleName('Annulla: Riso carnaroli 400 → 0 g');
    });

    it('conferma che fallisce mostra l\'errore e la riga resta fra le DA CONFERMARE', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [LATTE_META], nonRiconosciuti: [] })));
      vi.mocked(correggiResiduo).mockRejectedValue(new Error('scrittura fallita'));
      invia('il latte è a metà');

      fireEvent.click(await screen.findByRole('button', { name: 'Conferma: Latte 1000 → 500 ml' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a correggere. Riprova.');
      expect(screen.getByText('DA CONFERMARE 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Conferma: Latte 1000 → 500 ml' })).toBeEnabled();
    });

    it('dopo un invio riuscito la bozza si svuota (onBozza(\'\'))', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [FINITO_RISO], nonRiconosciuti: [] })));
      const onBozza = vi.fn();
      render(
        <WidgetAI contesto={CONTESTO} dettatura={dettaturaFinta()} bozza="ho finito il riso" onBozza={onBozza} onDatiCambiati={onDatiCambiati} onChiudi={onChiudi} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'FAI LE MODIFICHE' }));
      await screen.findByText('APPLICATE 1 DI 1');
      expect(onBozza).toHaveBeenCalledWith('');
      const gruppo = screen.getByText('APPLICATE 1 DI 1').parentElement!;
      expect(within(gruppo).getByText('Riso carnaroli')).toBeInTheDocument();
    });
  });
});
