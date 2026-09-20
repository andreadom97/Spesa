import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarchioProvider, useAreeMancanti, useAreeMancantiCorrenti } from '../marchio-context';

function Pubblica({ aree }: { aree: ('ortofrutta' | 'cereali')[] }) { useAreeMancanti(aree); return null; }
function Legge() { const a = useAreeMancantiCorrenti(); return <output>{a.join(',')}</output>; }

describe('marchio-context (spec §C)', () => {
  it('senza chi pubblica il default è vuoto: marchio tutto pieno', () => {
    const { getByRole } = render(<MarchioProvider><Legge /></MarchioProvider>);
    expect(getByRole('status')).toHaveTextContent('');
  });
  it('la Lista pubblica e la barra legge; lo smontaggio azzera', () => {
    const { getByRole, rerender } = render(<MarchioProvider><Pubblica aree={['ortofrutta', 'cereali']} /><Legge /></MarchioProvider>);
    expect(getByRole('status')).toHaveTextContent('ortofrutta,cereali');
    rerender(<MarchioProvider><Legge /></MarchioProvider>);
    expect(getByRole('status')).toHaveTextContent('');
  });
});
