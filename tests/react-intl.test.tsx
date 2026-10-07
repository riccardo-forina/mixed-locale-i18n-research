import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  IntlProvider,
  FormattedDate,
  FormattedNumber,
  createIntl,
  createIntlCache,
} from 'react-intl';

const TEST_DATE = new Date('2025-06-15T14:30:00Z');
const TEST_NUMBER = 1234567.89;

describe('react-intl: mixed-locale formatting (strings in FR, values in JP)', () => {
  describe('core limitation: formatDate/formatNumber have no locale parameter', () => {
    it('formatDate always uses the intl instance locale — cannot override per call', () => {
      const intlFr = createIntl({ locale: 'fr-FR', messages: {} }, createIntlCache());

      const result = intlFr.formatDate(TEST_DATE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Always French — there is no way to pass { locale: 'ja-JP' }
      expect(result).toContain('juin');
      expect(result).not.toMatch(/6月/);

      // To get Japanese, you MUST create a separate intl instance
      const intlJa = createIntl({ locale: 'ja-JP', messages: {} }, createIntlCache());
      const jaResult = intlJa.formatDate(TEST_DATE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(jaResult).toMatch(/6月/);
    });

    it('formatNumber always uses the intl instance locale — cannot override per call', () => {
      const intlFr = createIntl({ locale: 'fr-FR', messages: {} }, createIntlCache());

      const result = intlFr.formatNumber(TEST_NUMBER, {
        style: 'currency',
        currency: 'EUR',
      });

      // Always French formatting
      expect(result).toMatch(/1[\s ]234[\s ]567,89/);

      // Cannot format this same value in ja-JP without a new instance
      const intlJa = createIntl({ locale: 'ja-JP', messages: {} }, createIntlCache());
      const jaResult = intlJa.formatNumber(TEST_NUMBER, {
        style: 'currency',
        currency: 'JPY',
      });
      expect(jaResult).toMatch(/￥|¥/);
    });
  });

  describe('FormattedDate/FormattedNumber — no locale prop', () => {
    it('components inherit locale from IntlProvider — no override possible', () => {
      render(
        <IntlProvider locale="fr-FR" messages={{}}>
          <span data-testid="date">
            <FormattedDate value={TEST_DATE} year="numeric" month="long" day="numeric" />
          </span>
          <span data-testid="number">
            <FormattedNumber value={TEST_NUMBER} style="currency" currency="EUR" />
          </span>
        </IntlProvider>
      );

      // Both use fr-FR — no way to make the date Japanese while keeping the string French
      expect(screen.getByTestId('date').textContent).toContain('juin');
      expect(screen.getByTestId('number').textContent).toContain('€');
    });
  });

  describe('workaround: nested IntlProvider', () => {
    it('can render values in a different locale via subtree — but loses the parent string context', () => {
      function MixedApp() {
        return (
          <IntlProvider locale="fr-FR" messages={{}}>
            <span data-testid="fr-section">
              Résumé de la commande :{' '}
              {/* To get Japanese date, we must nest a new IntlProvider */}
              <IntlProvider locale="ja-JP" messages={{}}>
                <FormattedDate value={TEST_DATE} year="numeric" month="long" day="numeric" />
                {' — '}
                <FormattedNumber value={TEST_NUMBER} style="currency" currency="JPY" />
              </IntlProvider>
            </span>
          </IntlProvider>
        );
      }

      render(<MixedApp />);

      const text = screen.getByTestId('fr-section').textContent!;
      // French string text is present (hardcoded, not from intl)
      expect(text).toContain('Résumé de la commande');
      // Japanese formatted values
      expect(text).toMatch(/6月/);
      expect(text).toMatch(/￥|¥/);

      // BUT: this only works for component-rendered values.
      // There is no way to do this with formatMessage + embedded date/number
      // in a single translated string like react-i18next's formatParams.
    });
  });

  describe('impossible scenario: formatMessage with mixed-locale interpolations', () => {
    it('formatMessage cannot format embedded values in a different locale', () => {
      const intlFr = createIntl(
        {
          locale: 'fr-FR',
          messages: {
            order: 'Résumé : {date, date, ::yyyyMMMd} — {amount, number, ::currency/JPY}',
          },
        },
        createIntlCache()
      );

      const result = intlFr.formatMessage(
        { id: 'order' },
        { date: TEST_DATE, amount: TEST_NUMBER }
      );

      // Both date and amount are formatted in fr-FR — no way to make them ja-JP
      expect(result).toContain('juin');
      expect(result).not.toMatch(/6月/);
    });
  });
});
