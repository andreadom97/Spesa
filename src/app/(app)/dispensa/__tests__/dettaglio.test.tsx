import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';
import type { VoceDispensa } from '@/domain/dispensa-vista';
import { DettaglioIngrediente } from '../DettaglioIngrediente';

const OGGI = '2026-09-25';

const POLLO: Ingredient = {
  id: 'i-pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile',
  deperibile: true, formatoConfezione: 300, prezzoConfezione: null, ean: null,
};
const RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile',
  deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};

function voce(p: Partial<VoceDispensa> = {}): VoceDispensa {
  return { ingrediente: POLLO, residuo: 600, ultimoAcquisto: '2026-09-24', congelato: false, scadenzaManuale: null, ...p };
}

function propsBase() {
  return {
    voce: voce(),
    avviso: null,
    oggi: OGGI,
    onInCasa: vi.fn().mockResolvedValue(undefined),
    onFinito: vi.fn().mockResolvedValue(undefined),
    onResiduo: vi.fn().mockResolvedValue(undefined),
    onCongelato: vi.fn().mockResolvedValue(undefined),
    onScadenza: vi.fn().mockResolvedValue(undefined),
    onScansiona: vi.fn(),
    onChiudi: vi.fn(),
  };
}

describe('DettaglioIngrediente', () => {
  it('intestazione: reparto e nome', () => {
    render(<DettaglioIngrediente {...propsBase()} />);
    expect(screen.getByText('MACELLERIA E PESCHERIA')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Petto di pollo' })).toBeInTheDocument();
  });

  it('avviso: il testo intero con dimenticato, nessun testo con null', () => {
    const { rerender } = render(<DettaglioIngrediente {...propsBase()} avviso="dimenticato" />);
    expect(screen.getByText('Nessun pasto in programma lo usa prima che scada.')).toBeInTheDocument();

    rerender(<DettaglioIngrediente {...propsBase()} avviso={null} />);
    expect(screen.queryByText('Nessun pasto in programma lo usa prima che scada.')).not.toBeInTheDocument();
    expect(screen.queryByText('Troppo tempo per essere ancora buono: la lista lo richiede.')).not.toBeInTheDocument();
  });

  describe('In casa', () => {
    it('con residuo 600, "segna in casa" è premuto; il tocco su "segna finito" chiama onFinito', async () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} />);
      expect(screen.getByLabelText('Petto di pollo: segna in casa')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Petto di pollo: segna finito')).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(screen.getByLabelText('Petto di pollo: segna finito'));
      await waitFor(() => expect(props.onFinito).toHaveBeenCalledTimes(1));
    });

    it('il tocco sul tasto già premuto non chiama niente', () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} />);
      fireEvent.click(screen.getByLabelText('Petto di pollo: segna in casa'));
      expect(props.onInCasa).not.toHaveBeenCalled();
    });

    it('con onFinito che rigetta compare l\'errore', async () => {
      const props = propsBase();
      props.onFinito.mockRejectedValueOnce(new Error('no'));
      render(<DettaglioIngrediente {...props} />);
      fireEvent.click(screen.getByLabelText('Petto di pollo: segna finito'));
      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    });
  });

  describe('Residuo', () => {
    it('SALVA spenta a valore invariato', () => {
      render(<DettaglioIngrediente {...propsBase()} />);
      expect(screen.getByRole('button', { name: 'SALVA' })).toBeDisabled();
    });

    it('scritto 450 e Invio chiama onResiduo(450)', async () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} />);
      const campo = screen.getByLabelText('Residuo di Petto di pollo');
      fireEvent.change(campo, { target: { value: '450' } });
      fireEvent.keyDown(campo, { key: 'Enter' });
      await waitFor(() => expect(props.onResiduo).toHaveBeenCalledWith(450));
    });

    it('scritto abc e SALVA riporta il campo a 600 senza chiamare niente', () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} />);
      const campo = screen.getByLabelText('Residuo di Petto di pollo');
      fireEvent.change(campo, { target: { value: 'abc' } });
      fireEvent.click(screen.getByRole('button', { name: 'SALVA' }));
      expect(props.onResiduo).not.toHaveBeenCalled();
      expect(campo).toHaveValue('600');
    });

    it('con onResiduo che rigetta: RIPROVA e il messaggio di errore', async () => {
      const props = propsBase();
      props.onResiduo.mockRejectedValueOnce(new Error('no'));
      render(<DettaglioIngrediente {...props} />);
      const campo = screen.getByLabelText('Residuo di Petto di pollo');
      fireEvent.change(campo, { target: { value: '450' } });
      fireEvent.click(screen.getByRole('button', { name: 'SALVA' }));
      expect(await screen.findByRole('button', { name: 'RIPROVA' })).toBeInTheDocument();
      expect(screen.getByText('Non siamo riusciti a salvare la correzione. Riprova.')).toBeInTheDocument();
    });

    it('se la prop voce cambia residuo, il campo la segue', () => {
      const props = propsBase();
      const { rerender } = render(<DettaglioIngrediente {...props} />);
      rerender(<DettaglioIngrediente {...props} voce={voce({ residuo: 300 })} />);
      expect(screen.getByLabelText('Residuo di Petto di pollo')).toHaveValue('300');
    });
  });

  describe('Congelatore', () => {
    it('c\'è per un deperibile', () => {
      render(<DettaglioIngrediente {...propsBase()} />);
      expect(screen.getByLabelText('Petto di pollo: metti in congelatore')).toBeInTheDocument();
    });

    it('non c\'è per un non deperibile', () => {
      render(<DettaglioIngrediente {...propsBase()} voce={voce({ ingrediente: RISO, ultimoAcquisto: '2026-09-24' })} />);
      expect(screen.queryByLabelText('Riso: metti in congelatore')).not.toBeInTheDocument();
    });
  });

  describe('Scadenza', () => {
    it('con stima c\'è "Scade il 27/09" e STIMA', () => {
      render(<DettaglioIngrediente {...propsBase()} />);
      expect(screen.getByText('Scade il 27/09')).toBeInTheDocument();
      expect(screen.getByText('STIMA')).toBeInTheDocument();
    });

    it('con scadenzaManuale c\'è "Scade il 02/10" e MODIFICATA DA TE', () => {
      render(<DettaglioIngrediente {...propsBase()} voce={voce({ scadenzaManuale: '2026-10-02' })} />);
      expect(screen.getByText('Scade il 02/10')).toBeInTheDocument();
      expect(screen.getByText('MODIFICATA DA TE')).toBeInTheDocument();
    });

    it('senza stima (non deperibile) il blocco non c\'è', () => {
      render(<DettaglioIngrediente {...propsBase()} voce={voce({ ingrediente: RISO, ultimoAcquisto: '2026-09-24' })} />);
      expect(screen.queryByText(/^Scade il/)).not.toBeInTheDocument();
      expect(screen.queryByText('STIMA')).not.toBeInTheDocument();
    });

    it('MODIFICA apre il campo col valore attuale e la stima', () => {
      render(<DettaglioIngrediente {...propsBase()} />);
      fireEvent.click(screen.getByLabelText('Modifica la scadenza di Petto di pollo'));
      expect(screen.getByLabelText('Scadenza di Petto di pollo')).toHaveValue('2026-09-27');
      expect(screen.getByText('La stima di Dispesa è il 27/09.')).toBeInTheDocument();
    });

    it('data cambiata e SALVA chiama onScadenza e richiude', async () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} />);
      fireEvent.click(screen.getByLabelText('Modifica la scadenza di Petto di pollo'));
      const campo = screen.getByLabelText('Scadenza di Petto di pollo');
      fireEvent.change(campo, { target: { value: '2026-09-30' } });
      fireEvent.click(within(campo.parentElement!).getByRole('button', { name: 'SALVA' }));
      await waitFor(() => expect(props.onScadenza).toHaveBeenCalledWith('2026-09-30'));
      await waitFor(() => expect(screen.queryByLabelText('Scadenza di Petto di pollo')).not.toBeInTheDocument());
    });

    it('data prima di oggi mostra l\'errore d\'intervallo senza chiamare', () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} />);
      fireEvent.click(screen.getByLabelText('Modifica la scadenza di Petto di pollo'));
      const campo = screen.getByLabelText('Scadenza di Petto di pollo');
      fireEvent.change(campo, { target: { value: '2026-09-20' } });
      fireEvent.click(within(campo.parentElement!).getByRole('button', { name: 'SALVA' }));
      expect(screen.getByText('Scegli una data fra oggi e i prossimi due anni.')).toBeInTheDocument();
      expect(props.onScadenza).not.toHaveBeenCalled();
    });

    it('USA LA STIMA non c\'è senza una data a mano', () => {
      render(<DettaglioIngrediente {...propsBase()} />);
      fireEvent.click(screen.getByLabelText('Modifica la scadenza di Petto di pollo'));
      expect(screen.queryByRole('button', { name: 'USA LA STIMA' })).not.toBeInTheDocument();
    });

    it('USA LA STIMA con una data a mano chiama onScadenza(null)', async () => {
      const props = propsBase();
      render(<DettaglioIngrediente {...props} voce={voce({ scadenzaManuale: '2026-10-02' })} />);
      fireEvent.click(screen.getByLabelText('Modifica la scadenza di Petto di pollo'));
      fireEvent.click(screen.getByRole('button', { name: 'USA LA STIMA' }));
      await waitFor(() => expect(props.onScadenza).toHaveBeenCalledWith(null));
    });
  });

  it('SCANSIONA UNA CONFEZIONE chiama onScansiona', () => {
    const props = propsBase();
    render(<DettaglioIngrediente {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /SCANSIONA UNA CONFEZIONE/ }));
    expect(props.onScansiona).toHaveBeenCalledTimes(1);
  });

  it('la X "Chiudi il foglio" chiama onChiudi', () => {
    const props = propsBase();
    render(<DettaglioIngrediente {...props} />);
    fireEvent.click(screen.getByLabelText('Chiudi il foglio'));
    expect(props.onChiudi).toHaveBeenCalledTimes(1);
  });

  // Difetto fase 4: sotto ~766px il corpo che scorre schiacciava SCANSIONA UNA
  // CONFEZIONE (STILE_TASTO, height 54, senza flexShrink: 0). jsdom non calcola
  // il layout, quindi qui si controlla solo che la classe che ferma lo schiacciamento
  // (.corpo-foglio, globals.css) sia sul corpo che scorre.
  it('il corpo che scorre ha .corpo-foglio, per non schiacciare SCANSIONA UNA CONFEZIONE', () => {
    const { container } = render(<DettaglioIngrediente {...propsBase()} />);
    expect(container.querySelector('.sc.corpo-foglio')).toBeInTheDocument();
  });
});
