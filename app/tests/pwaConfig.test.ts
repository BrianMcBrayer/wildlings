// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { UserConfigExport } from 'vite';
import config, { pwaOptions } from '../vite.config';

const resolveConfig = async () => {
  const resolved = config as unknown as UserConfigExport;
  return typeof resolved === 'function'
    ? resolved({ command: 'build', mode: 'production' })
    : resolved;
};

describe('PWA configuration', () => {
  it('exposes a PWA manifest with offline fallback', async () => {
    const resolved = await resolveConfig();
    const pluginNames = (resolved.plugins ?? [])
      .flatMap((plugin) => (Array.isArray(plugin) ? plugin : [plugin]))
      .map((plugin) =>
        plugin && typeof plugin === 'object' && 'name' in plugin ? String(plugin.name) : undefined,
      )
      .filter(Boolean);

    expect(pluginNames).toContain('vite-plugin-pwa');
    const manifest = pwaOptions.manifest as {
      name?: string;
      short_name?: string;
      display?: string;
    };
    expect(manifest.name).toBe('Wildlings');
    expect(manifest.short_name).toBe('Wildlings');
    expect(manifest.display).toBe('standalone');
    expect(pwaOptions.workbox?.navigateFallback).toBe('/index.html');
  });
});
