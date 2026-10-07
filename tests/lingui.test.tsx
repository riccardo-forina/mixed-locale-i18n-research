import { describe, it, expect, beforeEach } from 'vitest';
import { i18n } from '@lingui/core';

const TEST_DATE = new Date('2025-06-15T14:30:00Z');
const TEST_NUMBER = 1234567.89;

describe('LinguiJS: mixed-locale formatting (strings in FR, values in JP)', () => {
  beforeEach(() => {
    i18n.load('fr', {});
    i18n.load('en', {});
    i18n.load('ja', {});
  });

  describe('i18n.activate(locale, locales) — global formatting locale split', () => {
    it('can set French for strings and Japanese for ALL formatting', () => {
      i18n.activate('fr', ['ja-JP']);

      expect(i18n.locale).toBe('fr');

      const dateResult = i18n.date(TEST_DATE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Date is formatted in Japanese (the locales param)
      expect(dateResult).toMatch(/6月/);
      expect(dateResult).not.toContain('juin');

      const numResult = i18n.number(TEST_NUMBER, {
        style: 'currency',
        currency: 'JPY',
      });

      // Number is also formatted in Japanese
      expect(numResult).toMatch(/￥|¥/);
    });
  });

  describe('limitation: cannot use different locales for dates vs numbers', () => {
    it('activate() sets ONE formatting locale for ALL value types', () => {
      // Want: Japanese for dates, German for numbers — NOT possible
      i18n.activate('fr', ['ja-JP']);

      const dateResult = i18n.date(TEST_DATE, { month: 'long' });
      const numResult = i18n.number(TEST_NUMBER, {
        style: 'currency',
        currency: 'EUR',
      });

      // Both use ja-JP — cannot independently set de-DE for numbers
      expect(dateResult).toMatch(/6月/);
      // Number also uses ja-JP formatting, not de-DE
      expect(numResult).toMatch(/￥|¥|€/);
    });
  });

  describe('limitation: no per-call locale on i18n.date() / i18n.number()', () => {
    it('i18n.date() signature is (value, format) — no locale argument', () => {
      i18n.activate('fr');

      // French formatting — no way to pass locale
      const result = i18n.date(TEST_DATE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toContain('juin');

      // To get Japanese, must re-activate globally
      i18n.activate('fr', ['ja-JP']);
      const jaResult = i18n.date(TEST_DATE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(jaResult).toMatch(/6月/);
    });

    it('i18n.number() signature is (value, format) — no locale argument', () => {
      i18n.activate('en');

      const result = i18n.number(TEST_NUMBER);
      expect(result).toContain('1,234,567');

      // Cannot pass a locale — must change global formatting locale
      i18n.activate('en', ['de-DE']);
      const deResult = i18n.number(TEST_NUMBER);
      expect(deResult).toMatch(/1\.234\.567,89/);
    });
  });

  describe('comparison: Intl API escape hatch works per-call', () => {
    it('Intl.DateTimeFormat allows per-call locale alongside LinguiJS', () => {
      i18n.activate('fr');
      expect(i18n.locale).toBe('fr');

      // LinguiJS can only do French dates
      const linguiDate = i18n.date(TEST_DATE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(linguiDate).toContain('juin');

      // Intl API can do Japanese dates without changing LinguiJS state
      const intlDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(TEST_DATE);
      expect(intlDate).toMatch(/6月/);

      // LinguiJS locale unchanged
      expect(i18n.locale).toBe('fr');
    });
  });
});
