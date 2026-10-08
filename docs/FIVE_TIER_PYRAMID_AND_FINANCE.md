# Five-division career and finances

Fresh UI careers marked `startingClub: "tottunham"` begin in division five. The
fictional national pyramid has 20 clubs in division one and 24 in each lower tier.
Every club plays each opponent home and away: 38 league matches in division one
and 46 in divisions two through five. A round-robin schedule is generated for
the selected pool. The game promotes the top two clubs one division and relegates
the bottom two where a lower tier exists. The fifth tier has no relegation, and the
first tier has no division above it. Four successful promotions are needed to
reach the first division. Its top two qualify for the Champions League under the
existing rule. Promotion places and playoffs are simplified game rules; the match
counts and club numbers follow the English leagues.

The league names are Foundation League, Regional League, Merchant League, Crown
Championship, and Highland Premier, from fifth to first. Each tier has its own cup
with a five-round single-elimination bracket and byes where needed. Existing club
IDs and the legacy two-division pools remain unchanged. The five-tier roster now
contains 115 unique English-club references, with Tottunham retained as the story
exception across its fifth-tier start and eventual first-tier campaign. When
Tottunham moves to another tier, the destination league records its exact 20 or 24
club IDs. Season history stores the exact club list used for strict fixture, cup,
and champion validation.

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
season's 20 or 24 club IDs. Restoring versions 2–8 keeps their original division,
fixtures, 14-round schedules, financial receipts, and campaign history; an old
save is never silently converted into the five-tier game. The device save key stays
`win-again-season-v17`, and campaign backup format remains version 1.

Each promoted season replaces all seven opponents with the destination tier's
club pool. Opponent names and eleven-player rosters are generated from those club
IDs. Match profiles apply tier floors so league-wide attack, defense, midfield,
and speed averages rise from division five through division one; generated player
attack, defense, passing, and speed averages rise too. Historic raw club ratings
and non-pyramid profiles remain available for legacy seasons. The opponent report
and live pitch read the same adjusted match profile.

New Tottunham matches use engine version 6. One minute can produce one attacking
event at most, actions are recorded as crosses, cutbacks, through balls, dribbles,
or combinations, and each event still uses the established eight RNG draws.
Version 5 saved matches continue with their old outcomes. The live pitch keeps a
side in possession through a longer build-up, routes the ball through a wide
player before entering the box, and animates a recorded cross from its named
passer to the receiving striker before the shot. Reduced-motion mode stays static.

The match presentation follows Football Manager's published possession and
out-of-possession approach and risk-based pass decisions, adapted to the game's
existing three instructions and fictional squad data.

Useful checks after editing this feature:

```sh
node source/test-progression.cjs
node source/test-economy.cjs
node source/run-tests.cjs
node source/build-pwa.cjs
PWA_DIST=. node source/test-pwa.cjs index.html
node source/build-android.cjs
```
