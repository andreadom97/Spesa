import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// vi.hoisted: la stessa `replace` a ogni chiamata di useRouter.
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }) }));

import Impostazioni from '../page';
import Ingredienti from '../ingredienti/page';
import Reparti from '../reparti/page';

describe('le vecchie route delle Impostazioni fanno da rimando al pannello (spec fase 5 §A.1)', () => {
  beforeEach(() => replace.mockClear());

  it.each([
    ['/impostazioni', '/lista?impostazioni=cima', Impostazioni],
    ['/impostazioni/ingredienti', '/lista?impostazioni=ingredienti', Ingredienti],
    ['/impostazioni/reparti', '/lista?impostazioni=aree', Reparti],
  ])('%s manda a %s', (_percorso, verso, Pagina) => {
    const { container } = render(<Pagina />);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(verso);
    expect(container).toBeEmptyDOMElement();
  });
});
