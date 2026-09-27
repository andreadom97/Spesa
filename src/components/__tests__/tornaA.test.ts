import { describe, it, expect, vi, afterEach } from 'vitest';
import { stessaPagina, tornaA } from '../tornaA';

const BASE = 'https://spesa.test/piatti/d-1';

describe('stessaPagina', () => {
  it('stesso percorso e stessi parametri', () => {
    expect(stessaPagina('https://spesa.test/piano', '/piano', BASE)).toBe(true);
    expect(stessaPagina('https://spesa.test/lista?impostazioni=cima', '/lista?impostazioni=cima', BASE)).toBe(true);
  });

  it('`da` dice solo da dove si è arrivati: non conta', () => {
    expect(stessaPagina('https://spesa.test/piatti?da=impostazioni', '/piatti', BASE)).toBe(true);
    expect(stessaPagina('https://spesa.test/piatti/d-1?da=piano', '/piatti/d-1', BASE)).toBe(true);
  });

  it('un percorso diverso o un altro parametro sono un\'altra pagina', () => {
    expect(stessaPagina('https://spesa.test/piatti/d-1', '/piatti', BASE)).toBe(false);
    expect(stessaPagina('https://spesa.test/lista', '/lista?impostazioni=cima', BASE)).toBe(false);
    expect(stessaPagina('https://altro.test/piano', '/piano', BASE)).toBe(false);
  });
});

describe('tornaA', () => {
  afterEach(() => {
    delete (window as unknown as { navigation?: unknown }).navigation;
  });

  function conStoria(urls: string[], indice: number) {
    (window as unknown as { navigation: unknown }).navigation = {
      currentEntry: { url: urls[indice], index: indice },
      entries: () => urls.map((url, index) => ({ url, index })),
    };
  }

  it('se la voce prima è la destinazione torna indietro: la pagina lasciata esce dalla cronologia', () => {
    conStoria(['http://localhost:3000/piatti?da=impostazioni', 'http://localhost:3000/piatti/d-1?da=piatti'], 1);
    const router = { back: vi.fn(), replace: vi.fn() };
    tornaA(router, '/piatti');
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('se la voce prima è un\'altra pagina sostituisce quella di oggi, non ne aggiunge una', () => {
    conStoria(['http://localhost:3000/lista', 'http://localhost:3000/piatti/d-1'], 1);
    const router = { back: vi.fn(), replace: vi.fn() };
    tornaA(router, '/piatti');
    expect(router.replace).toHaveBeenCalledWith('/piatti');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('aperta per prima (nessuna voce prima) sostituisce', () => {
    conStoria(['http://localhost:3000/piatti/d-1'], 0);
    const router = { back: vi.fn(), replace: vi.fn() };
    tornaA(router, '/piatti');
    expect(router.replace).toHaveBeenCalledWith('/piatti');
  });

  it('se la Navigation API lancia sostituisce, senza propagare', () => {
    (window as unknown as { navigation: unknown }).navigation = {
      currentEntry: { url: 'http://localhost:3000/piatti/d-1', index: 1 },
      entries: () => { throw new Error('negata'); },
    };
    const router = { back: vi.fn(), replace: vi.fn() };
    expect(() => tornaA(router, '/piatti')).not.toThrow();
    expect(router.replace).toHaveBeenCalledWith('/piatti');
    expect(router.back).not.toHaveBeenCalled();
  });

  it("senza Navigation API (i browser che non ce l'hanno) sostituisce", () => {
    const router = { back: vi.fn(), replace: vi.fn() };
    tornaA(router, '/piano');
    expect(router.replace).toHaveBeenCalledWith('/piano');
    expect(router.back).not.toHaveBeenCalled();
  });
});
