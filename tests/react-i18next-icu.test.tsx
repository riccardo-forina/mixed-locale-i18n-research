import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, useTranslation, I18nextProvider } from 'react-i18next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ICU = require('i18next-icu').default;

const TEST_DATE = new Date('2025-06-15T14:30:00Z');
const TEST_NUMBER = 1234567.89;

const resources = {
  fr: {
    translation: {
      order_summary:
        'Résumé de la commande : {date, date, ::yyyyMMMd} — {amount, number, ::currency/JPY}',
      items: '{count, plural, one {# article} other {# articles}}',
      greeting: 'Bonjour, {name} !',
      report:
        'Rapport du {date, date, ::yyyyMMMMd} — {amount, number, ::currency/EUR}',
    },
  },
  en: {
    translation: {
      order_summary:
        'Order summary: {date, date, ::yyyyMMMd} — {amount, number, ::currency/JPY}',
      items: '{count, plural, one {# item} other {# items}}',
      greeting: 'Hello, {name}!',
      report:
        'Report from {date, date, ::yyyyMMMMd} — {amount, number, ::currency/EUR}',
    },
  },
};

let i18n: typeof i18next;

beforeAll(async () => {
  i18n = i18next.createInstance();
  await i18n
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources,
      lng: 'fr',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
});

describe('i18next-icu: ICU MessageFormat works correctly', () => {
  it('resolves ICU plural syntax', () => {
    expect(i18n.t('items', { count: 1 })).toBe('1 article');
    expect(i18n.t('items', { count: 5 })).toBe('5 articles');
  });

  it('resolves ICU named arguments', () => {
    expect(i18n.t('greeting', { name: 'Alice' })).toBe('Bonjour, Alice !');
  });

  it('formats dates and numbers using the app locale (fr)', () => {
    const result = i18n.t('report', {
      date: TEST_DATE,
      amount: TEST_NUMBER,
    });

    expect(result).toContain('Rapport du');
    expect(result).toMatch(/juin/i);
    expect(result).toContain('€');
  });
});

describe('i18next-icu: formatParams locale overrides are SILENTLY IGNORED', () => {
  it('formatParams locale has no effect — ICU plugin bypasses native Formatter', () => {
    const result = i18n.t('report', {
      date: TEST_DATE,
      amount: TEST_NUMBER,
      formatParams: {
        date: {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          locale: 'ja-JP',
        },
        amount: {
          style: 'currency',
          currency: 'EUR',
          locale: 'ja-JP',
        },
      },
    });

    // French string template works
    expect(result).toContain('Rapport du');

    // Date is formatted in FRENCH (app locale), NOT Japanese
    // formatParams.locale is silently ignored
    expect(result).toMatch(/juin/i);
    expect(result).not.toMatch(/6月/);
  });

  it('same message without formatParams produces identical output', () => {
    const withParams = i18n.t('report', {
      date: TEST_DATE,
      amount: TEST_NUMBER,
      formatParams: {
        date: { locale: 'ja-JP' },
        amount: { locale: 'ja-JP' },
      },
    });

    const withoutParams = i18n.t('report', {
      date: TEST_DATE,
      amount: TEST_NUMBER,
    });

    // Proves formatParams is completely ignored — both outputs are identical
    expect(withParams).toBe(withoutParams);
  });
});

describe('i18next-icu: native {{value}} interpolation is disabled', () => {
  it('native i18next syntax is treated as literal text', () => {
    i18n.addResource('fr', 'translation', 'native_test', 'Natif : {{value}}');
    const result = i18n.t('native_test', { value: 'test' });

    // {{value}} is NOT interpolated — rendered as literal text
    expect(result).toBe('Natif : {{value}}');
    expect(result).not.toBe('Natif : test');
  });
});

describe('i18next-icu: React component confirms formatParams ignored', () => {
  function Report() {
    const { t } = useTranslation();
    return (
      <span data-testid="icu-report">
        {t('report', {
          date: TEST_DATE,
          amount: TEST_NUMBER,
          formatParams: {
            date: {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              locale: 'ja-JP',
            },
            amount: {
              style: 'currency',
              currency: 'EUR',
              locale: 'ja-JP',
            },
          },
        })}
      </span>
    );
  }

  it('renders ICU message with French formatting despite ja-JP in formatParams', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Report />
      </I18nextProvider>
    );

    const text = screen.getByTestId('icu-report').textContent!;
    expect(text).toContain('Rapport du');
    // Still French — formatParams locale has no effect
    expect(text).toMatch(/juin/i);
    expect(text).not.toMatch(/6月/);
  });
});
