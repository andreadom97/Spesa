import { describe, it, expect } from 'vitest';
import config from '../../../next.config';

describe('redirect Settimana → Piano (spec §E)', () => {
  it('/settimana e i suoi sottopercorsi vanno a /piano, permanenti', async () => {
    const r = await config.redirects!();
    expect(r).toEqual(expect.arrayContaining([
      { source: '/settimana', destination: '/piano', permanent: true },
      { source: '/settimana/:path*', destination: '/piano/:path*', permanent: true },
    ]));
  });
});
