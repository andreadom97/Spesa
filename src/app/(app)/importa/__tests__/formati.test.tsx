import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Formati } from '../Formati';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { Ingredient } from '@/domain/types';
import type { StatoRevisione } from '@/domain/import/types';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };
const STATO: StatoRevisione = { passo: 'formati', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };

describe('Formati', () => {
  it('propone i soli non abbinati: l\'avena esistente non compare', async () => {
    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={() => {}} />);
    expect(await screen.findByDisplayValue(/latte/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/avena/i)).not.toBeInTheDocument();
  });

  it('correggere il formato e andare al riepilogo persiste gli ingredienti nello stato', async () => {
    const onStato = vi.fn();
    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={onStato} />);
    const formato = (await screen.findAllByLabelText(/formato confezione/i))[0];
    fireEvent.change(formato, { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: /vai al riepilogo/i }));
    await waitFor(() => {
      const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
      expect(stato.passo).toBe('riepilogo');
      expect(stato.ingredientiNuovi.some((i) => i.formatoConfezione === 750)).toBe(true);
    });
  });
});
