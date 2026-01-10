import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('styles.css', () => {
  it('avoids tailwind @apply directives that break the build', () => {
    const stylesPath = resolve(process.cwd(), 'src/styles.css');
    const contents = readFileSync(stylesPath, 'utf-8');

    expect(contents).not.toContain('@apply');
  });
});
