import { describe, it, expect } from 'vitest';

const TEST_DATE = new Date('2025-06-15T14:30:00Z');
const TEST_NUMBER = 1234567.89;

describe('Intl API: per-call locale support (always available)', () => {
  describe('Intl.DateTimeFormat — locale as first constructor argument', () => {
    it('produces different output for different locales', () => {
      const opts: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };

      const enDate = new Intl.DateTimeFormat('en-US', opts).format(TEST_DATE);
      const jaDate = new Intl.DateTimeFormat('ja-JP', opts).format(TEST_DATE);
      const frDate = new Intl.DateTimeFormat('fr-FR', opts).format(TEST_DATE);
      const deDate = new Intl.DateTimeFormat('de-DE', opts).format(TEST_DATE);

      expect(enDate).toContain('June');
      expect(jaDate).toMatch(/6月/);
      expect(frDate).toContain('juin');
      expect(deDate).toContain('Juni');
    });
  });

  describe('Intl.NumberFormat — locale as first constructor argument', () => {
    it('formats numbers according to locale conventions', () => {
      const enNum = new Intl.NumberFormat('en-US').format(TEST_NUMBER);
      const frNum = new Intl.NumberFormat('fr-FR').format(TEST_NUMBER);
      const deNum = new Intl.NumberFormat('de-DE').format(TEST_NUMBER);
      const jaNum = new Intl.NumberFormat('ja-JP').format(TEST_NUMBER);

      // en-US: 1,234,567.89
      expect(enNum).toBe('1,234,567.89');
      // fr-FR: 1 234 567,89 (narrow no-break space)
      expect(frNum).toMatch(/1[\s ]234[\s ]567,89/);
      // de-DE: 1.234.567,89
      expect(deNum).toBe('1.234.567,89');
      // ja-JP: 1,234,567.89
      expect(jaNum).toBe('1,234,567.89');
    });

    it('formats currency according to locale conventions', () => {
      const usdEn = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(TEST_NUMBER);
      const eurFr = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(TEST_NUMBER);
      const jpyJa = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
      }).format(TEST_NUMBER);

      expect(usdEn).toMatch(/\$1,234,567\.89/);
      expect(eurFr).toMatch(/1[\s ]234[\s ]567,89/);
      expect(eurFr).toContain('€');
      // JPY has no decimal places
      expect(jpyJa).toMatch(/￥|¥/);
      expect(jpyJa).toContain('1,234,568');
    });
  });

  describe('Intl.RelativeTimeFormat — locale as first constructor argument', () => {
    it('produces localized relative time strings', () => {
      const enRel = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
      const frRel = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
      const jaRel = new Intl.RelativeTimeFormat('ja-JP', { numeric: 'auto' });

      expect(enRel.format(-1, 'day')).toBe('yesterday');
      expect(frRel.format(-1, 'day')).toBe('hier');
      expect(jaRel.format(-1, 'day')).toBe('昨日');

      expect(enRel.format(1, 'day')).toBe('tomorrow');
      expect(frRel.format(1, 'day')).toBe('demain');
      expect(jaRel.format(1, 'day')).toBe('明日');

      expect(enRel.format(-3, 'month')).toBe('3 months ago');
      expect(frRel.format(-3, 'month')).toMatch(/il y a 3 mois/);
      expect(jaRel.format(-3, 'month')).toMatch(/3 か月前/);
    });
  });

  describe('Intl.ListFormat — locale as first constructor argument', () => {
    it('produces localized list formatting', () => {
      const items = ['Alice', 'Bob', 'Charlie'];

      const enList = new Intl.ListFormat('en-US', {
        style: 'long',
        type: 'conjunction',
      }).format(items);
      const frList = new Intl.ListFormat('fr-FR', {
        style: 'long',
        type: 'conjunction',
      }).format(items);
      const jaList = new Intl.ListFormat('ja-JP', {
        style: 'long',
        type: 'conjunction',
      }).format(items);

      expect(enList).toBe('Alice, Bob, and Charlie');
      expect(frList).toMatch(/Alice, Bob et Charlie/);
      expect(jaList).toMatch(/Alice、Bob、Charlie/);
    });
  });

  describe('Intl.PluralRules — locale as first constructor argument', () => {
    it('returns correct plural category per locale', () => {
      const enPlural = new Intl.PluralRules('en-US');
      const frPlural = new Intl.PluralRules('fr-FR');
      const jaPlural = new Intl.PluralRules('ja-JP');
      const arPlural = new Intl.PluralRules('ar-SA');

      // English: 1 = one, 2+ = other
      expect(enPlural.select(1)).toBe('one');
      expect(enPlural.select(2)).toBe('other');
      expect(enPlural.select(0)).toBe('other');

      // French: 0 and 1 = one, 2+ = other
      expect(frPlural.select(0)).toBe('one');
      expect(frPlural.select(1)).toBe('one');
      expect(frPlural.select(2)).toBe('other');

      // Japanese: everything = other (no plural distinction)
      expect(jaPlural.select(0)).toBe('other');
      expect(jaPlural.select(1)).toBe('other');
      expect(jaPlural.select(100)).toBe('other');

      // Arabic: has many plural forms (zero, one, two, few, many, other)
      expect(arPlural.select(0)).toBe('zero');
      expect(arPlural.select(1)).toBe('one');
      expect(arPlural.select(2)).toBe('two');
      expect(arPlural.select(3)).toBe('few');
      expect(arPlural.select(11)).toBe('many');
      expect(arPlural.select(100)).toBe('other');
    });
  });

  describe('Intl.Collator — locale as first constructor argument', () => {
    it('sorts strings differently based on locale', () => {
      const words = ['ä', 'z', 'a'];

      // German: ä sorts near a
      const deSorted = [...words].sort(new Intl.Collator('de-DE').compare);
      expect(deSorted).toEqual(['a', 'ä', 'z']);

      // Swedish: ä sorts after z
      const svSorted = [...words].sort(new Intl.Collator('sv-SE').compare);
      expect(svSorted).toEqual(['a', 'z', 'ä']);
    });

    it('handles locale-specific character ordering', () => {
      const words = ['cote', 'côte', 'coté', 'côté'];

      // French accent-aware sorting
      const frSorted = [...words].sort(
        new Intl.Collator('fr-FR', { sensitivity: 'accent' }).compare
      );
      expect(frSorted[0]).toBe('cote');
      expect(frSorted[frSorted.length - 1]).toBe('côté');
    });
  });

  describe('mixing locales in a single operation', () => {
    it('can format the same value with multiple locales simultaneously', () => {
      const formatters = {
        date: {
          'en-US': new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }),
          'ja-JP': new Intl.DateTimeFormat('ja-JP', { month: 'long', year: 'numeric' }),
          'fr-FR': new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }),
        },
        number: {
          'en-US': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
          'fr-FR': new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
          'ja-JP': new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
        },
      };

      // Simulate: UI in English, dates in Japanese, prices in French
      const uiGreeting = 'Welcome!'; // from en-US translations
      const dateStr = formatters.date['ja-JP'].format(TEST_DATE);
      const priceStr = formatters.number['fr-FR'].format(TEST_NUMBER);

      expect(uiGreeting).toBe('Welcome!');
      expect(dateStr).toMatch(/6月/);
      expect(priceStr).toMatch(/€/);
      expect(priceStr).toMatch(/1[\s ]234[\s ]567,89/);
    });
  });
});
