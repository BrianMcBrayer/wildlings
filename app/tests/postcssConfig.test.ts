import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('postcss config', () => {
  it('uses the Tailwind PostCSS plugin package', () => {
    const config = require('../postcss.config.cjs');

    expect(config.plugins).toHaveProperty('@tailwindcss/postcss');
    expect(config.plugins).not.toHaveProperty('tailwindcss');
  });
});
