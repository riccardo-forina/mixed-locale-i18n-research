import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, useTranslation, I18nextProvider } from 'react-i18next';

const TEST_DATE = new Date('2025-06-15T14:30:00Z');
const TEST_NUMBER = 1234567.89;

const resources = {
  fr: {
    translation: {
      order_summary:
        'Résumé de la commande : {{date, datetime}} — {{amount, number}}',
      invoice:
        'Facture du {{date, datetime}} pour {{amount, number}} (TVA : {{tax, number}})',
      greeting: 'Bonjour, {{name}} !',
    },
  },
  en: {
    translation: {
      order_summary: 'Order summary: {{date, datetime}} — {{amount, number}}',
      invoice:
        'Invoice from {{date, datetime}} for {{amount, number}} (Tax: {{tax, number}})',
      greeting: 'Hello, {{name}}!',
    },
  },
};

let i18n: typeof i18next;

beforeAll(async () => {
  i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({
    resources,
    lng: 'fr',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
});

describe('react-i18next: mixed-locale formatting (strings in FR, values in JP)', () => {
  describe('core scenario: French string template with Japanese-formatted values', () => {
    it('t() returns French text with date and number formatted in Japanese', () => {
      const result = i18n.t('order_summary', {
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
            currency: 'JPY',
            locale: 'ja-JP',
          },
        },
      });

      // String template is in French
      expect(result).toContain('Résumé de la commande');
      // Date is formatted in Japanese
      expect(result).toMatch(/6月/);
      // Currency is formatted in Japanese Yen
      expect(result).toMatch(/￥|¥/);
    });
  });

  describe('multiple values with different formatting locales in one string', () => {
    it('formats amount in en-US and tax in de-DE within a French string', () => {
      const result = i18n.t('invoice', {
        date: TEST_DATE,
        amount: 12345.67,
        tax: 2469.13,
        formatParams: {
          date: {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            locale: 'ja-JP',
          },
          amount: {
            style: 'currency',
            currency: 'USD',
            locale: 'en-US',
          },
          tax: {
            style: 'currency',
            currency: 'EUR',
            locale: 'de-DE',
          },
        },
      });

      // French string template
      expect(result).toContain('Facture du');
      expect(result).toContain('TVA');
      // Date in Japanese
      expect(result).toMatch(/6月/);
      // Amount in en-US USD
      expect(result).toMatch(/\$12,345\.67/);
      // Tax in de-DE EUR (period thousands, comma decimal)
      expect(result).toMatch(/2\.469,13/);
    });
  });

  describe('formatParams locale vs default app locale', () => {
    it('without formatParams locale, values use the app locale (fr)', () => {
      const result = i18n.t('order_summary', {
        date: TEST_DATE,
        amount: TEST_NUMBER,
        formatParams: {
          date: { year: 'numeric', month: 'long', day: 'numeric' },
          amount: { style: 'currency', currency: 'EUR' },
        },
      });

      // String is French
      expect(result).toContain('Résumé de la commande');
      // Date formatted in French (default app locale)
      expect(result).toContain('juin');
      // Number formatted in French conventions
      expect(result).toMatch(/1[\s  ]234[\s  ]567,89/);
    });

    it('with formatParams locale, values override the app locale', () => {
      const result = i18n.t('order_summary', {
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

      // String is still French
      expect(result).toContain('Résumé de la commande');
      // But date is now Japanese
      expect(result).toMatch(/6月/);
      expect(result).not.toContain('juin');
    });
  });

  describe('React component: useTranslation with formatParams', () => {
    function OrderSummary() {
      const { t } = useTranslation();
      return (
        <span data-testid="order">
          {t('order_summary', {
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
                currency: 'JPY',
                locale: 'ja-JP',
              },
            },
          })}
        </span>
      );
    }

    it('renders French text with Japanese formatting in a React component', () => {
      render(
        <I18nextProvider i18n={i18n}>
          <OrderSummary />
        </I18nextProvider>
      );

      const text = screen.getByTestId('order').textContent!;
      expect(text).toContain('Résumé de la commande');
      expect(text).toMatch(/6月/);
    });
  });
});
