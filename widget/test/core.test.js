import { describe, expect, it } from 'vitest';
import {
  POSITION_KEY,
  STORAGE_KEY,
  STRINGS,
  brightnessOf,
  describeDuration,
  fill,
  hideFor,
  isCurrentSite,
  isHidden,
  parseDuration,
  parseLayout,
  parseOffset,
  parsePosition,
  pickLang,
  pickTheme,
  readPlacement,
  savePlacement,
  validateProfile,
  visibleLinks,
} from '../src/core.js';

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

describe('parseLayout', () => {
  it('accepts list, grid and icons', () => {
    for (const value of ['list', 'grid', 'icons']) expect(parseLayout(value)).toBe(value);
  });

  it('falls back to list for missing or unknown values', () => {
    for (const value of [undefined, '', 'Grid', ' grid', 'tiles', 'toString']) expect(parseLayout(value)).toBe('list');
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
    expect(brightnessOf('color(display-p3 1 1 1)')).toBeCloseTo(1);
    expect(brightnessOf('color(display-p3 0.05 0.05 0.05)')).toBeCloseTo(0.05);
    expect(brightnessOf('color(xyz 1 1 1)')).toBeNull();
  });

  it('gamma-encodes color(srgb-linear ...) before weighing it', () => {
    // Linear 0.5 is about sRGB 0.735, so mid-grey linear light reads as light.
    expect(brightnessOf('color(srgb-linear 0.5 0.5 0.5)')).toBeCloseTo(0.735, 2);
    expect(brightnessOf('color(srgb-linear 0.001 0.001 0.001)')).toBeCloseTo(0.01292, 4);
    expect(brightnessOf('color(srgb-linear 0 0 0 / 0.2)')).toBeNull();
  });

  it('reads the lightness of lch', () => {
    expect(brightnessOf('lch(12 0 0)')).toBeCloseTo(0.12);
    expect(brightnessOf('lch(92% 10 100)')).toBeCloseTo(0.92);
    expect(brightnessOf('lch(20 10 100 / 0.3)')).toBeNull();
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

  it('reads lch and display-p3 backgrounds as opaque colours', () => {
    expect(pickTheme({ ...page, backgrounds: ['lch(12 0 0)', 'rgba(0, 0, 0, 0)'], text: 'lch(92 0 0)' })).toBe('dark');
    expect(pickTheme({ ...page, backgrounds: ['color(display-p3 0.05 0.05 0.05)', 'rgba(0, 0, 0, 0)'], prefersDark: false })).toBe('dark');
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

describe('parsePosition', () => {
  it('reads the four corners', () => {
    expect(parsePosition('top-left')).toEqual({ side: 'left', fromBottom: false });
    expect(parsePosition('top-right')).toEqual({ side: 'right', fromBottom: false });
    expect(parsePosition('bottom-left')).toEqual({ side: 'left', fromBottom: true });
    expect(parsePosition('bottom-right')).toEqual({ side: 'right', fromBottom: true });
  });

  it('keeps left and right as the bottom corners', () => {
    expect(parsePosition('left')).toEqual({ side: 'left', fromBottom: true });
    expect(parsePosition('right')).toEqual({ side: 'right', fromBottom: true });
  });

  it('falls back to bottom-right for missing or unknown values', () => {
    for (const value of [undefined, '', 'top', 'center', 'Top-Left', 'middle-left', 'top-left ']) {
      expect(parsePosition(value)).toEqual({ side: 'right', fromBottom: true });
    }
  });
});

describe('parseOffset', () => {
  it('reads pixels with or without a unit', () => {
    expect(parseOffset('0')).toBe(0);
    expect(parseOffset('120')).toBe(120);
    expect(parseOffset(' 24px ')).toBe(24);
    expect(parseOffset('99999')).toBe(99999);
  });

  it('falls back to 32 for missing or invalid values', () => {
    for (const value of [undefined, '', '-10', '1.5', '10%', '2em', 'abc']) expect(parseOffset(value)).toBe(32);
  });
});

describe('placement storage', () => {
  const placement = { side: 'left', fromBottom: false, gap: 120, share: 0.2 };

  it('round-trips a dragged position under its own key', () => {
    const storage = memoryStorage();
    savePlacement(storage, placement);
    expect(JSON.parse(storage.getItem(POSITION_KEY))).toEqual(placement);
    expect(readPlacement(storage)).toEqual(placement);
  });

  it('ignores missing and corrupt values', () => {
    expect(readPlacement(memoryStorage())).toBeNull();
    expect(readPlacement(null)).toBeNull();
    for (const raw of ['{', 'null', '42', '"left"', '[]', '{"side":"up","fromBottom":true,"gap":1,"share":0}',
      '{"side":"left","fromBottom":"yes","gap":1,"share":0}', '{"side":"left","fromBottom":true,"gap":-1,"share":0}',
      '{"side":"left","fromBottom":true,"gap":1,"share":2}', '{"side":"left","fromBottom":true,"gap":"1","share":0}',
      '{"side":"left","fromBottom":true,"share":0}']) {
      const storage = memoryStorage();
      storage.setItem(POSITION_KEY, raw);
      expect(readPlacement(storage)).toBeNull();
    }
  });

  it('survives storage that throws', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readPlacement(blocked)).toBeNull();
    expect(() => savePlacement(blocked, placement)).not.toThrow();
  });
});

describe('UI strings', () => {
  it('picks data-lang first, then the page language, then English', () => {
    expect(pickLang('vi', 'en')).toBe('vi');
    expect(pickLang('en', 'vi')).toBe('en');
    expect(pickLang(undefined, 'vi')).toBe('vi');
    expect(pickLang(undefined, 'vi-VN')).toBe('vi');
    expect(pickLang('', 'VI')).toBe('vi');
    expect(pickLang('fr', 'vi')).toBe('vi');
    for (const page of [undefined, null, '', 'en', 'en-US', 'fr', 'vie', 'video']) expect(pickLang(undefined, page)).toBe('en');
  });

  it('has every string in both languages', () => {
    expect(Object.keys(STRINGS.vi).sort()).toEqual(Object.keys(STRINGS.en).sort());
    expect(fill(STRINGS.en.about, 'name', 'Jane')).toBe('About Jane');
    expect(fill(STRINGS.vi.about, 'name', 'Jane')).toBe('Giới thiệu về Jane');
    expect(STRINGS.vi.drag).toBe('Kéo xuống dưới để ẩn');
    expect(STRINGS.vi.close).toBe('Đóng');
  });

  it('inserts names literally', () => {
    expect(fill(STRINGS.en.about, 'name', "$& $' $1")).toBe("About $& $' $1");
  });

  it('describes hide periods in Vietnamese without plurals', () => {
    expect(fill(STRINGS.vi.hide, 'period', describeDuration('7d', 'vi'))).toBe('Ẩn trong 7 ngày');
    expect(describeDuration('1d', 'vi')).toBe('1 ngày');
    expect(describeDuration('30m', 'vi')).toBe('30 phút');
    expect(describeDuration('12h', 'vi')).toBe('12 giờ');
    expect(describeDuration('2w', 'vi')).toBe('2 tuần');
    expect(describeDuration('bad', 'vi')).toBe('7 ngày');
    expect(fill(STRINGS.en.hide, 'period', describeDuration('7d', 'en'))).toBe('Hide for 7 days');
  });
});

describe('isCurrentSite', () => {
  it('matches the site root and paths at or above the page', () => {
    expect(isCurrentSite('https://site.test/', 'https://site.test/posts/1')).toBe(true);
    expect(isCurrentSite('https://site.test', 'https://site.test/')).toBe(true);
    expect(isCurrentSite('https://site.test/blog', 'https://site.test/blog')).toBe(true);
    expect(isCurrentSite('https://site.test/blog', 'https://site.test/blog/post?x=1#y')).toBe(true);
    expect(isCurrentSite('https://site.test/blog/', 'https://site.test/blog/post')).toBe(true);
    expect(isCurrentSite('https://site.test/cv/', 'https://site.test/cv')).toBe(true);
    expect(isCurrentSite('https://site.test/cv/', 'https://site.test/cv/')).toBe(true);
  });

  it('does not match other sites, other paths or non-web links', () => {
    expect(isCurrentSite('https://other.test/', 'https://site.test/')).toBe(false);
    expect(isCurrentSite('http://site.test/', 'https://site.test/')).toBe(false);
    expect(isCurrentSite('https://site.test:8443/', 'https://site.test/')).toBe(false);
    expect(isCurrentSite('https://blog.site.test/', 'https://site.test/')).toBe(false);
    expect(isCurrentSite('https://site.test/blog', 'https://site.test/')).toBe(false);
    expect(isCurrentSite('https://site.test/blog', 'https://site.test/blogger')).toBe(false);
    expect(isCurrentSite('https://site.test/cv/', 'https://site.test/cvx')).toBe(false);
    expect(isCurrentSite('mailto:me@site.test', 'https://site.test/')).toBe(false);
    expect(isCurrentSite('https://site.test/', 'about:blank')).toBe(false);
    expect(isCurrentSite('not a url', 'https://site.test/')).toBe(false);
  });
});

describe('visibleLinks', () => {
  const links = [
    { id: 'home', url: 'https://site.test/' },
    { id: 'blog', url: 'https://blog.test/' },
  ];

  it('drops the link to the current site and keeps the rest in order', () => {
    expect(visibleLinks(links, 'https://site.test/about').map((link) => link.id)).toEqual(['blog']);
    expect(visibleLinks(links, 'https://elsewhere.test/').map((link) => link.id)).toEqual(['home', 'blog']);
  });

  it('keeps every link when all of them point at the current site', () => {
    const own = [links[0], { id: 'cv', url: 'https://site.test/cv' }];
    expect(visibleLinks(own, 'https://site.test/cv')).toEqual(own);
  });
});
