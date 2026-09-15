import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RigaPasto } from '../RigaPasto';
import type { StatoSlot } from '@/domain/types';

describe('RigaPasto', () => {
  it('il corpo centrale ha nome accessibile Apri quando c\'è un piatto', () => {
    render(
      <RigaPasto
        nomePasto="Pranzo"
        stato={"casa" as StatoSlot}
        nomePiatto="Riso e ceci"
        aree={[]}
        onToggleStato={() => {}}
        onApriPiatto={() => {}}
        hrefScegli="/x"
      />,
    );
    expect(screen.getByRole('button', { name: 'Apri Riso e ceci' })).toBeInTheDocument();
  });

  it('il corpo centrale non ha aria-label quando non c\'è un piatto', () => {
    render(
      <RigaPasto
        nomePasto="Pranzo"
        stato={"casa" as StatoSlot}
        nomePiatto={null}
        aree={[]}
        onToggleStato={() => {}}
        hrefScegli="/x"
      />,
    );
    const bottone = screen.getByRole('button', { name: /Nessun piatto assegnato/ });
    expect(bottone).not.toHaveAttribute('aria-label');
  });

  // Stessa azione, stesso copy nei due punti del flusso: il bottone del
  // foglio azioni che porta a questo stato dice "Ho mangiato fuori piano"
  // (FoglioAzioniPasto), quindi l'etichetta della riga spenta deve dire
  // la stessa cosa, non la vecchia "Ho mangiato altro".
  it('stato sostituito mostra "Ho mangiato fuori piano"', () => {
    render(
      <RigaPasto
        nomePasto="Cena"
        stato={'sostituito' as StatoSlot}
        nomePiatto={null}
        aree={[]}
        onToggleStato={() => {}}
        hrefScegli="/x"
      />,
    );
    expect(screen.getByText('Ho mangiato fuori piano')).toBeInTheDocument();
    expect(screen.queryByText('Ho mangiato altro')).not.toBeInTheDocument();
  });

  // Gli avvisi di scadenza (spec scadenza-fresco §3.1): il residuo derivato
  // che diventa visibile durante l'uso. Una riga per elemento, solo a riga
  // accesa — a riga spenta il pasto non consuma, non c'è nulla da avvisare.
  describe('avvisi', () => {
    const AVVISO = 'Pollo in casa: scade martedì, prima di questo pasto';

    it('a riga accesa ogni avviso è una riga di testo sotto il sottotitolo', () => {
      render(
        <RigaPasto
          nomePasto="Cena"
          stato={'casa' as StatoSlot}
          nomePiatto="Pollo e riso"
          aree={[]}
          sottotitolo="+1 porzione"
          avvisi={[{ id: 'i-pollo', testo: AVVISO }, { id: 'i-yogurt', testo: 'Yogurt in casa: scade domani, prima di questo pasto' }]}
          onToggleStato={() => {}}
          hrefScegli="/x"
        />,
      );
      expect(screen.getByText(AVVISO)).toBeInTheDocument();
      expect(screen.getByText('Yogurt in casa: scade domani, prima di questo pasto')).toBeInTheDocument();
      // Sotto il sottotitolo: l'ordine nel DOM è quello di lettura.
      const sottotitolo = screen.getByText('+1 porzione');
      const avviso = screen.getByText(AVVISO);
      expect(sottotitolo.compareDocumentPosition(avviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('a riga spenta gli avvisi non compaiono', () => {
      render(
        <RigaPasto
          nomePasto="Cena"
          stato={'fuori' as StatoSlot}
          nomePiatto={null}
          aree={[]}
          avvisi={[{ id: 'i-pollo', testo: AVVISO }]}
          onToggleStato={() => {}}
          hrefScegli="/x"
        />,
      );
      expect(screen.queryByText(AVVISO)).not.toBeInTheDocument();
    });

    it('senza avvisi (assenti o vuoti) nessuna riga in più', () => {
      const { container, unmount } = render(
        <RigaPasto
          nomePasto="Cena"
          stato={'casa' as StatoSlot}
          nomePiatto="Pollo e riso"
          aree={[]}
          onToggleStato={() => {}}
          hrefScegli="/x"
        />,
      );
      expect(container.querySelectorAll('[data-avviso]')).toHaveLength(0);
      unmount();

      const { container: conVuoto } = render(
        <RigaPasto
          nomePasto="Cena"
          stato={'casa' as StatoSlot}
          nomePiatto="Pollo e riso"
          aree={[]}
          avvisi={[]}
          onToggleStato={() => {}}
          hrefScegli="/x"
        />,
      );
      expect(conVuoto.querySelectorAll('[data-avviso]')).toHaveLength(0);
      expect(screen.queryByText(/in casa: scade/)).not.toBeInTheDocument();
    });
  });
});
