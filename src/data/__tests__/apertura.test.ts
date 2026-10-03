import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../settimana', () => ({ leggiSettimana: vi.fn(), creaSettimana: vi.fn() }));

import { leggiSettimana, creaSettimana, type SettimanaCorrente } from '../settimana';
import { apriSettimanaCorrente } from '../apertura';

const SETT: SettimanaCorrente = { id: 'w', dataInizio: '2026-09-28', stato: 'confermata', slots: [] };

beforeEach(() => {
  vi.mocked(leggiSettimana).mockReset();
  vi.mocked(creaSettimana).mockReset();
});

describe('apriSettimanaCorrente (spec §F)', () => {
  it('legge la settimana del lunedì della data LOCALE passata', async () => {
    vi.mocked(leggiSettimana).mockResolvedValue(SETT);
    await expect(apriSettimanaCorrente('2026-10-04')).resolves.toBe(SETT);
    expect(leggiSettimana).toHaveBeenCalledWith('2026-09-28');
    expect(creaSettimana).not.toHaveBeenCalled();
  });
  it('se non c\'è la crea e la rilegge', async () => {
    vi.mocked(leggiSettimana).mockResolvedValueOnce(null).mockResolvedValueOnce(SETT);
    vi.mocked(creaSettimana).mockResolvedValue('w');
    await expect(apriSettimanaCorrente('2026-10-03')).resolves.toBe(SETT);
    expect(creaSettimana).toHaveBeenCalledWith('2026-09-28');
  });
  it('una creazione fallita per il doppione rilegge e prosegue', async () => {
    vi.mocked(leggiSettimana).mockResolvedValueOnce(null).mockResolvedValueOnce(SETT);
    vi.mocked(creaSettimana).mockRejectedValue(new Error('duplicate key'));
    await expect(apriSettimanaCorrente('2026-10-03')).resolves.toBe(SETT);
  });
  it('una creazione fallita senza settimana dopo è un errore', async () => {
    vi.mocked(leggiSettimana).mockResolvedValue(null);
    vi.mocked(creaSettimana).mockRejectedValue(new Error('Configura prima i tuoi pasti'));
    await expect(apriSettimanaCorrente('2026-10-03')).rejects.toThrow('Configura prima i tuoi pasti');
  });
  it('due aperture insieme creano una volta sola', async () => {
    vi.mocked(leggiSettimana).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue(SETT);
    vi.mocked(creaSettimana).mockResolvedValue('w');
    await Promise.all([apriSettimanaCorrente('2026-10-03'), apriSettimanaCorrente('2026-10-03')]);
    expect(creaSettimana).toHaveBeenCalledTimes(1);
  });
});
