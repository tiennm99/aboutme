import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, brightnessOf, describeDuration, hideFor, isHidden, parseDuration, pickTheme, validateProfile } from '../src/core.js';

const DAY = 86_400_000;

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
}

describe('parseDuration', () => {
  it('reads minutes, hours, days and weeks', () => {
    expect(parseDuration('30m')).toBe(30 * 60_000);
    expect(parseDuration('12h')).toBe(12 * 3_600_000);
    expect(parseDuration('1d')).toBe(DAY);
    expect(parseDuration('2W')).toBe(14 * DAY);
  });

  it('falls back to 7 days for missing, zero or invalid values', () => {
    for (const value of [undefined, '', '0d', 'soon', '1y', '-1d']) {
      expect(parseDuration(value)).toBe(7 * DAY);
    }
  });
});

describe('describeDuration', () => {
  it('pluralizes the unit', () => {
    expect(describeDuration('1w')).toBe('1 week');
    expect(describeDuration('3d')).toBe('3 days');
    expect(describeDuration('bad')).toBe('7 days');
  });
});

describe('hide timer', () => {
  it('hides until the period ends', () => {
    const storage = memoryStorage();
    hideFor(storage, 1_000, DAY);
    expect(storage.getItem(STORAGE_KEY)).toBe(String(1_000 + DAY));
    expect(isHidden(storage, 1_000 + DAY - 1)).toBe(true);
    expect(isHidden(storage, 1_000 + DAY)).toBe(false);
  });

  it('shows the widget when storage is empty, corrupt or blocked', () => {
    expect(isHidden(memoryStorage(), 0)).toBe(false);
    expect(isHidden({ getItem: () => 'junk' }, 0)).toBe(false);
    expect(isHidden({ getItem: () => { throw new Error('blocked'); } }, 0)).toBe(false);
    expect(isHidden(null, 0)).toBe(false);
    expect(() => hideFor({ setItem: () => { throw new Error('blocked'); } }, 0, DAY)).not.toThrow();
  });
});

describe('validateProfile', () => {
  const base = 'https://example.workers.dev/profile.json';
  const valid = {
    schemaVersion: 1,
    name: 'Jane Doe',
    tagline: 'Builds things',
    avatar: 'https://example.com/a.png',
    events: '/e',
    links: [{ id: 'github', label: 'GitHub', url: 'https://github.com/example', icon: 'github' }],
  };

  it('normalizes a valid profile and resolves the events URL', () => {
    expect(validateProfile(valid, base)).toEqual({
      name: 'Jane Doe',
      tagline: 'Builds things',
      avatar: 'https://example.com/a.png',
      events: 'https://example.workers.dev/e',
      links: [{ id: 'github', label: 'GitHub', url: 'https://github.com/example', icon: 'github' }],
    });
  });

  it('rejects other schema versions and profiles without a name or links', () => {
    expect(validateProfile({ ...valid, schemaVersion: 2 }, base)).toBeNull();
    expect(validateProfile({ ...valid, name: ' ' }, base)).toBeNull();
    expect(validateProfile({ ...valid, links: [] }, base)).toBeNull();
    expect(validateProfile(null, base)).toBeNull();
  });

  it('drops script URLs, bad ids and duplicates, and defaults unknown icons', () => {
    const profile = validateProfile(
      {
        ...valid,
        avatar: 'http://insecure.example/a.png',
        links: [
          { id: 'bad', label: 'XSS', url: 'javascript:alert(1)' },
          { id: 'Bad Id', label: 'Bad', url: 'https://example.com' },
          { id: 'blog', label: 'Blog', url: 'https://blog.example.com', icon: 'rocket' },
          { id: 'blog', label: 'Again', url: 'https://example.com' },
          { id: 'mail', label: 'Email', url: 'mailto:me@example.com', icon: 'email' },
        ],
      },
      base,
    );
    expect(profile.avatar).toBeNull();
    expect(profile.links.map((l) => [l.id, l.icon])).toEqual([
      ['blog', 'link'],
      ['mail', 'email'],
    ]);
  });

  it('sends no counts when events is missing or not http', () => {
    expect(validateProfile({ ...valid, events: undefined }, base).events).toBeNull();
    expect(validateProfile({ ...valid, events: 'javascript:alert(1)' }, base).events).toBeNull();
  });
});

describe('brightnessOf', () => {
  it('reads rgb and rgba in comma and space syntax', () => {
    expect(brightnessOf('rgb(0, 0, 0)')).toBe(0);
    expect(brightnessOf('rgb(255, 255, 255)')).toBeCloseTo(1);
    expect(brightnessOf('rgb(255 255 255 / 0.9)')).toBeCloseTo(1);
    expect(brightnessOf('rgba(28, 33, 40, 1)')).toBeLessThan(0.2);
    expect(brightnessOf('rgb(100% 100% 100%)')).toBeCloseTo(1);
  });

  it('reads the lightness of oklch, oklab and lab', () => {
    expect(brightnessOf('oklch(0.2 0.02 250)')).toBeCloseTo(0.2);
    expect(brightnessOf('oklch(90% 0.02 250)')).toBeCloseTo(0.9);
    expect(brightnessOf('oklab(0.7 0 0)')).toBeCloseTo(0.7);
    expect(brightnessOf('lab(30 10 -20)')).toBeCloseTo(0.3);
  });

  it('reads color(srgb ...)', () => {
    expect(brightnessOf('color(srgb 1 1 1)')).toBeCloseTo(1);
    expect(brightnessOf('color(srgb 0.1 0.1 0.1 / 0.8)')).toBeCloseTo(0.1);
    expect(brightnessOf('color(display-p3 1 1 1)')).toBeNull();
  });

  it('returns null for transparent, mostly transparent and unknown colours', () => {
    expect(brightnessOf('transparent')).toBeNull();
    expect(brightnessOf('rgba(0, 0, 0, 0)')).toBeNull();
    expect(brightnessOf('rgb(0 0 0 / 40%)')).toBeNull();
    expect(brightnessOf('rgba(0, 0, 0, 0.5)')).toBe(0);
    expect(brightnessOf('hwb(0 0% 0%)')).toBeNull();
    expect(brightnessOf('')).toBeNull();
    expect(brightnessOf(undefined)).toBeNull();
  });
});

describe('pickTheme', () => {
  const page = { backgrounds: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'], markers: [], text: 'rgb(128, 128, 128)', prefersDark: false };

  it('uses an opaque body background first, then the html background', () => {
    expect(pickTheme({ ...page, backgrounds: ['rgb(17, 17, 17)', 'rgb(255, 255, 255)'], markers: ['light'] })).toBe('dark');
    expect(pickTheme({ ...page, backgrounds: ['rgba(0, 0, 0, 0)', 'rgb(250, 250, 250)'], text: 'rgb(255, 255, 255)' })).toBe('light');
  });

  it('then an explicit marker, never reading a missing one as light', () => {
    expect(pickTheme({ ...page, markers: [null, 'Dark '], prefersDark: false })).toBe('dark');
    expect(pickTheme({ ...page, markers: ['light'], prefersDark: true })).toBe('light');
    expect(pickTheme({ ...page, markers: [null, 'auto', ''], prefersDark: true })).toBe('dark');
  });

  it('then the text colour: light text means a dark page', () => {
    expect(pickTheme({ ...page, text: 'rgb(238, 238, 238)' })).toBe('dark');
    expect(pickTheme({ ...page, text: 'rgb(20, 20, 20)', prefersDark: true })).toBe('light');
  });

  it('uses the system preference only for mid-grey or unknown text', () => {
    expect(pickTheme({ ...page, prefersDark: true })).toBe('dark');
    expect(pickTheme({ ...page, prefersDark: false })).toBe('light');
    expect(pickTheme({ ...page, text: 'bogus', prefersDark: true })).toBe('dark');
  });
});
