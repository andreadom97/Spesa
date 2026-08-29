import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Revisione } from '../Revisione';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { StatoRevisione } from '@/domain/import/types';

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenzeAbituali: Array(7).fill(false) },
];
const STATO: StatoRevisione = {
  passo: 'revisione',
  mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' },
  pastiConfermati: [], correzioni: {}, ingredientiNuovi: [],
};

describe('Revisione', () => {
  it('mostra il giorno corrente con i testi originali sotto le righe', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    expect(screen.getByText(/giorno 1 di 3/i)).toBeInTheDocument();
    expect(screen.getByText("30g fiocchi d'avena")).toBeInTheDocument();
  });

  it('modificare una quantità produce una correzione, non tocca il piano', () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={onStato} />);
    const campo = screen.getAllByLabelText(/quantità/i)[0];
    fireEvent.change(campo, { target: { value: '40' } });
    fireEvent.click(within(screen.getByText('Porridge').closest('section')!).getByRole('button', { name: /conferma pasto/i }));
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse[0].quantita).toBe(40);
    expect(stato.pastiConfermati).toContain('1-0-0');
  });

  it('una riga con quantità mancante blocca la conferma del suo pasto', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    // Giorno 2 (martedì) ha le olive senza quantità.
    fireEvent.click(screen.getByRole('button', { name: /giorno successivo/i }));
    const cardMerluzzo = screen.getByText('Merluzzo').closest('section')!;
    expect(within(cardMerluzzo).getByText(/quantità da indicare/i)).toBeInTheDocument();
    expect(within(cardMerluzzo).getByRole('button', { name: /conferma pasto/i })).toBeDisabled();
  });

  it('VAI AI FORMATI compare solo con tutti i pasti confermati', () => {
    const tutti: string[] = [];
    for (const s of PIANO_MENU_SETTIMANALE.settimane) for (const g of s.giorni) g.pasti.forEach((_, i) => tutti.push(`${s.numero}-${g.giorno}-${i}`));
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={{ ...STATO, pastiConfermati: tutti }} slotDefs={SLOTS as never} onStato={onStato} />);
    fireEvent.click(screen.getByRole('button', { name: /vai ai formati/i }));
    expect(onStato.mock.calls.at(-1)![0].passo).toBe('formati');
  });
});
