import { describe, it, expect } from 'vitest';
import { AREE, tonoMedioArea, tintaOpacaArea } from '../aree';

describe('toni delle aree per le icone ingrediente (delta 26/09)', () => {
  it('tono medio: stessa tinta, luminosità a 2,8:1 su bianco', () => {
    expect(AREE.map((a) => tonoMedioArea(a.id))).toEqual([
      '#7AA838', '#D88384', '#759EC8', '#BB9609', '#D48949', '#9D91D6',
    ]);
  });

  it('tinta opaca: il 26% della Dispensa steso sul bianco, colore dell\'alone', () => {
    expect(AREE.map((a) => tintaOpacaArea(a.id))).toEqual([
      '#E8F5D8', '#FCE5E5', '#E5F0FC', '#FCF2D4', '#FCE7D7', '#EDEAFC',
    ]);
  });
});
