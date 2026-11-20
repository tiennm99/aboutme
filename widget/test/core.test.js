import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, describeDuration, hideFor, isHidden, parseDuration, validateProfile } from '../src/core.js';

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
