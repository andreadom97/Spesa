import { describe, it, expect } from 'vitest';
import { metadata } from '../layout';
import Home from '../page';

describe('identità', () => {
  it('il title è Spesa, non il default del template', () => {
    expect(metadata.title).toBe('Spesa');
    expect(String(metadata.description)).not.toMatch(/create next app/i);
  });

  it('la root reindirizza a /lista', () => {
    // redirect() di next/navigation lancia un errore con digest NEXT_REDIRECT;<tipo>;<url>;...
    let digest = '';
    try {
      Home();
    } catch (err) {
      digest = (err as { digest?: string }).digest ?? '';
    }
    expect(digest).toContain('NEXT_REDIRECT');
    expect(digest).toContain('/lista');
  });
});
