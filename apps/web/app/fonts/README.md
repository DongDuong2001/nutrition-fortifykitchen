# Self-hosted fonts

Google Fonts' own latin and vietnamese slices (woff2), as next/font/google downloaded them on 22/10/2026, so builds never
call Google Fonts. Loaded by `fonts.ts` with Google's unicode-ranges.

| File | Family | Weights | Style |
|---|---|---|---|
| manrope-latin / manrope-vietnamese | Manrope (variable) | 400, 600, 700 | normal |
| saira-italic-latin / saira-italic-vietnamese | Saira (variable) | 800, 900 | italic |
| saira-condensed-800-latin / -vietnamese | Saira Condensed | 800 | normal |
| saira-condensed-900-latin / -vietnamese | Saira Condensed | 900 | normal |

Licence: SIL Open Font License 1.1 (https://openfontlicense.org). Manrope © The Manrope Project Authors
(github.com/sharanda/manrope); Saira and Saira Condensed © The Saira Project Authors (github.com/Omnibus-Type/Saira).
A new weight or style: add the two slices here and a `src` entry in each of the family's two calls in `fonts.ts`.
