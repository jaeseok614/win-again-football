# Five-division career and finances

Fresh UI careers marked `startingClub: "tottunham"` begin in division five. The
fictional national pyramid has five divisions with eight clubs apiece: 40 clubs
in total. Each season keeps the existing 14-round home-and-away schedule. The
top two clubs move up one division; places seven and eight move down one division
where a lower tier exists. The fifth tier has no relegation, and the first tier
has no relegation target above it. Four successful promotions are needed to
reach the first division. Its top two qualify for the Champions League under the
existing rule.

The league names are Foundation League, Regional League, Merchant League, Crown
Championship, and Highland Premier, from fifth to first. Each tier has its own
eight-team cup. Existing club IDs and the legacy two-division pools remain
unchanged. The five-tier roster adds 25 fictional clubs. When Tottunham moves to
a different tier, the destination league records its exact eight club IDs and
replaces its lowest-rated place with Tottunham. Season history stores the exact
club list used for strict fixture, cup, and champion validation.

New careers retain the existing £160,000 opening balance. Youth scouting costs
£8,000 per report in the new pyramid (5% of opening funds; at most £16,000 per
season). Existing two-division and legacy seasons retain their historic £12,000
fee, including all saved receipts. The five-tier finance curve grows with the
competition level:

| Division | Home gate | Away gate | Sponsor per league match | Target reward |
| --- | ---: | ---: | ---: | ---: |
| 5 | £24,000 | £10,000 | £8,000 | 1st £80,000; 2nd £50,000 |
| 4 | £28,000 | £12,000 | £9,000 | 1st £100,000; 2nd £65,000 |
| 3 | £33,000 | £14,000 | £10,500 | 1st £120,000; 2nd £75,000 |
| 2 | £39,000 | £17,000 | £12,500 | 1st £150,000; 2nd £90,000 |
| 1 | £46,000 | £21,000 | £15,000 | Current first-tier reward curve |

The target remains promotion for divisions two through five and top-six survival
for division one. Cup income, match bonuses, and transfer rules follow the
corresponding division rates. Legacy and existing `pyramid` rates are unchanged.

The season schema is version 9. It stores `five-tier` league rules and each
season's eight club IDs. Restoring versions 2–8 keeps their original division,
fixtures, financial receipts, and campaign history; an old save is never silently
converted into the five-tier game. The device save key stays
`win-again-season-v17`, and campaign backup format remains version 1.

Useful checks after editing this feature:

```sh
node source/test-progression.cjs
node source/test-economy.cjs
node source/run-tests.cjs
node source/build-pwa.cjs
PWA_DIST=. node source/test-pwa.cjs index.html
node source/build-android.cjs
```
