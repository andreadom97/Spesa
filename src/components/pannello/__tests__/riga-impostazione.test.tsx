import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RigaImpostazione } from '../RigaImpostazione';

describe('RigaImpostazione — etichetta', () => {
  it('senza etichetta il nome accessibile resta il testo della riga, come oggi', () => {
    render(
      <RigaImpostazione
        nome="Gestione dei pasti"
        nota="Quanti pasti fai al giorno e come si chiamano."
        finale={{ tipo: 'valore', valore: '3 PASTI', onApri: () => {} }}
      />,
    );
    const riga = screen.getByRole('button');
    expect(riga).not.toHaveAttribute('aria-label');
    expect(riga).toHaveAccessibleName(/Gestione dei pasti/);
  });

  it('con etichetta, la riga a valore la usa come nome accessibile e il tocco chiama onApri', () => {
    const onApri = vi.fn();
    render(
      <RigaImpostazione
        nome="Farcitura"
        etichetta="Cambia Farcitura: ora Ricotta"
        finale={{ tipo: 'valore', valore: 'Ricotta', onApri }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cambia Farcitura: ora Ricotta' }));
    expect(onApri).toHaveBeenCalledTimes(1);
    // Il testo visibile non cambia: nome e valore restano quelli passati.
    expect(screen.getByText('Farcitura')).toBeInTheDocument();
    expect(screen.getByText('Ricotta')).toBeInTheDocument();
  });

  it('anche la riga ad azione prende l\'etichetta', () => {
    render(<RigaImpostazione nome="Esci" etichetta="Esci dall'account" finale={{ tipo: 'azione', onAzione: () => {} }} />);
    expect(screen.getByRole('button', { name: "Esci dall'account" })).toBeInTheDocument();
  });

  // 60 e non 50 (review finale, M2): a 320 metà riga è ≈ 127 px e «NESSUNO FUORI CASA»
  // (133) si sarebbe tagliato; al 60% sono ≈ 152 a 320 e ≈ 176 a 360.
  it('un valore lungo non sfonda la riga: al massimo il 60%, poi ellissi', () => {
    render(
      <RigaImpostazione
        nome="Farcitura"
        finale={{ tipo: 'valore', valore: 'Ricotta + Noci + Prezzemolo', onApri: () => {} }}
      />,
    );
    const valore = screen.getByText('Ricotta + Noci + Prezzemolo');
    expect(valore.style.maxWidth).toBe('60%');
    expect(valore.style.overflow).toBe('hidden');
    expect(valore.style.textOverflow).toBe('ellipsis');
  });

  it('il valore è maiuscolo a schermo (CSS), ma nel DOM resta il testo passato', () => {
    render(<RigaImpostazione nome="Farcitura" finale={{ tipo: 'valore', valore: 'Ricotta', onApri: () => {} }} />);
    const valore = screen.getByText('Ricotta');
    expect(valore.style.textTransform).toBe('uppercase');
    expect(valore.textContent).toBe('Ricotta');
  });

  // jsdom non fa layout: che «NESSUNO FUORI CASA» (il valore più lungo del Pannello di oggi,
  // Cima, Pasti a casa) non si tagli a 360 lo prova solo la sonda nel browser (Dopo i task,
  // punto 1). Qui si fissa soltanto che il limite e l'ellissi stanno sul contenitore del
  // valore e su nessun altro elemento della riga: il nome non ne prende.
  it('il limite a metà riga e l\'ellissi stanno solo sul contenitore del valore', () => {
    render(<RigaImpostazione nome="Pasti a casa" finale={{ tipo: 'valore', valore: 'NESSUNO FUORI CASA', onApri: () => {} }} />);
    const valore = screen.getByText('NESSUNO FUORI CASA');
    const conLimite = Array.from(screen.getByRole('button').querySelectorAll<HTMLElement>('*'))
      .filter((el) => el.style.maxWidth !== '' || el.style.textOverflow !== '');
    expect(conLimite).toEqual([valore]);
  });
});
