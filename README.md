## Research Results: Mixed-Locale Rendering Support

We investigated whether react-intl, react-i18next, and LinguiJS support the following scenario: app strings stay in the user's chosen locale (e.g. French), but date/number/currency formatting uses a different locale (e.g. Japanese). 23 of 25 claims were verified through documentation, source code analysis, and adversarial cross-checking. All claims were then validated with a runnable Vitest suite (24 tests, all passing).

### Feature Matrix

| Capability | react-intl | react-i18next | LinguiJS | Intl API (escape hatch) |
|---|---|---|---|---|
| Dates in locale B | :x: No per-call override | :white_check_mark: formatParams locale | :warning: Global only via activate() | :white_check_mark: Always |
| Numbers/currency in locale C | :x: No per-call override | :white_check_mark: formatParams locale | :warning: Same global mechanism | :white_check_mark: Always |
| Different locales per value in one string | :x: Impossible | :white_check_mark: Yes — per-value formatParams | :x: Impossible | :white_check_mark: Always (manual) |
| Plural rules per locale | :x: Follows IntlProvider | :white_check_mark: lng option on t() | :x: Follows activate() | :white_check_mark: Always |
| Relative time override | :x: No per-call override | :white_check_mark: formatParams locale | :x: No built-in | :white_check_mark: Always |
| List formatting override | :x: No per-call override | :white_check_mark: formatParams locale | :x: No built-in | :white_check_mark: Always |
| Collation/sorting | N/A | N/A | N/A | :white_check_mark: Always via Intl.Collator |

---

### react-i18next — Full Support

react-i18next (v21.3.0+) supports mixed-locale formatting through `formatParams` with per-value `locale` overrides. The app locale controls which translation string is selected; `formatParams.locale` controls how each interpolated value is formatted.

**Core scenario — French string, Japanese formatting:**

```javascript
// App locale is 'fr'. Translation catalog:
// "order_summary": "Résumé de la commande : {{date, datetime}} — {{amount, number}}"

const result = t('order_summary', {
  date: someDate,
  amount: 1234567.89,
  formatParams: {
    date: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      locale: 'ja-JP',           // ← date formatted in Japanese
    },
    amount: {
      style: 'currency',
      currency: 'JPY',
      locale: 'ja-JP',           // ← number formatted in Japanese
    },
  },
});

// Output: "Résumé de la commande : 2025年6月15日 — ￥1,234,568"
//          ^^^^^^^^^^^^^^^^^^^^^^^^                              French string
//                                   ^^^^^^^^^^^^   ^^^^^^^^^^    Japanese formatting
```

**Multiple formatting locales in one string:**

```javascript
// "invoice": "Facture du {{date, datetime}} pour {{amount, number}} (TVA : {{tax, number}})"

const result = t('invoice', {
  date: someDate,
  amount: 12345.67,
  tax: 2469.13,
  formatParams: {
    date: {
      year: 'numeric', month: 'long', day: 'numeric',
      locale: 'ja-JP',           // ← Japanese date
    },
    amount: {
      style: 'currency', currency: 'USD',
      locale: 'en-US',           // ← US dollars
    },
    tax: {
      style: 'currency', currency: 'EUR',
      locale: 'de-DE',           // ← German euros
    },
  },
});

// Output: "Facture du 2025年6月15日 pour $12,345.67 (TVA : 2.469,13 €)"
//          French text   JP date         US dollars        DE euros
```

**Without formatParams locale, values use the app locale:**

```javascript
// Same key, no locale overrides — everything uses fr-FR
const result = t('order_summary', {
  date: someDate,
  amount: 1234567.89,
  formatParams: {
    date: { year: 'numeric', month: 'long', day: 'numeric' },
    amount: { style: 'currency', currency: 'EUR' },
  },
});

// Output: "Résumé de la commande : 15 juin 2025 — 1 234 567,89 €"
//          All French — default behavior preserved
```

**React component usage:**

```javascript
function OrderSummary({ date, amount }) {
  const { t } = useTranslation();
  return (
    <span>
      {t('order_summary', {
        date,
        amount,
        formatParams: {
          date: { year: 'numeric', month: 'long', day: 'numeric', locale: 'ja-JP' },
          amount: { style: 'currency', currency: 'JPY', locale: 'ja-JP' },
        },
      })}
    </span>
  );
}
```

---

### react-intl (FormatJS) — No Support

Locale is set once at `IntlProvider`/`createIntl` level. None of the formatting functions (`formatDate`, `formatNumber`, `formatRelativeTime`, `formatList`) or `Formatted*` components accept a locale parameter. The TypeScript types confirm this — `FormatDateOptions` has no locale field. GitHub issue [#1674](https://github.com/formatjs/formatjs/issues/1674) requested this feature but it was never implemented.

Workaround: nested `IntlProvider` can render values in a different locale, but only for component-rendered values — not within a single translated string via `formatMessage`.

---

### LinguiJS — Minimal Support

`i18n.activate('fr', ['ja-JP'])` separates UI locale from formatting locale, but it's all-or-nothing — you can't use ja-JP for dates and de-DE for numbers simultaneously. `i18n.date()` and `i18n.number()` accept no per-call locale parameter. Both methods are deprecated — LinguiJS recommends using `Intl.DateTimeFormat`/`Intl.NumberFormat` directly.

---

### Intl API — Always Available

Every `Intl` constructor (`DateTimeFormat`, `NumberFormat`, `RelativeTimeFormat`, `ListFormat`, `PluralRules`, `Collator`) accepts locale as its first argument. Any app can bypass library limitations by calling these directly — this is what LinguiJS officially recommends.

---

### Caveats

- react-i18next's `formatParams` locale override requires i18next v21.3.0+ (Formatter class)
- LinguiJS `i18n.date()`/`i18n.number()` are deprecated and will be removed
- Collation/sorting is not a feature of any library — all rely on `Intl.Collator`
- SSR-specific mixed-locale behavior (Next.js, Remix) was not tested

### Test Suite

A runnable Vitest suite validating every claim is at `research/mixed-locale-i18n/` in the repo (24 tests, 4 files, all passing). Run with:

```sh
cd research/mixed-locale-i18n && npm install && npm test
```

### Sources

- [FormatJS API docs](https://formatjs.github.io/docs/react-intl/api/)
- [FormatJS #1674 — per-call locale request (never implemented)](https://github.com/formatjs/formatjs/issues/1674)
- [i18next API docs — t() options](https://www.i18next.com/overview/api)
- [i18next Formatting — formatParams](https://www.i18next.com/translation-function/formatting)
- [react-i18next useTranslation — lng option](https://react.i18next.com/latest/usetranslation-hook)
- [LinguiJS Core Reference](https://lingui.dev/ref/core)
