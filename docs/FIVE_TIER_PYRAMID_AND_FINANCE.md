# Five-division career, schedule and finances

Fresh UI careers marked `startingClub: "tottunham"` begin in division five and
use the full 2026/27 English pyramid reference pool: 20 clubs in the Premier
League and 24 in each of the Championship, League One, League Two and National
League (116 clubs total). Tottunham is a fictional story exception placed in the
National League. The other reference memberships come from the official 2026/27
competition allocations; the in-game club names remain fictional parodies.

| Game division | Competition | Clubs | League matches |
| --- | --- | ---: | ---: |
| 1 | Premier League | 20 | 38 |
| 2 | Championship | 24 | 46 |
| 3 | League One | 24 | 46 |
| 4 | League Two | 24 | 46 |
| 5 | National League | 24 | 46 |

Each opponent is met once at home and once away. Top two move up one tier;
seventh and eighth move down where a neighboring tier exists. The National
League has no relegation target in this five-level model, and the Premier League
has no higher domestic division. Four promotions take the story club from the
fifth division to the Premier League. New five-tier domestic cups have eight
clubs, include the manager's club, and place their three knockout rounds across
the league calendar. Domestic cup matches take priority when calendars overlap.

The game keeps its original 40 core club IDs and existing compact `legacy` and
`pyramid` rule sets. The additional English reference clubs are mapped to
fictional in-game clubs. New campaign rosters and opposition squads are generated
from those references, with league-tier floors that raise team and player
attribute averages as the manager is promoted. The 1–99 positional overall in
the opposition report is calculated from fictional game attributes. FotMob is a
benchmarking reference, not a live feed or a source of copied player ratings.

The season schema is version 10. A saved eight-club five-tier prototype expands
in place: its year, round, completed original fixtures, current match, save and
financial balance remain in the same season. Previously completed matches
between newly added AI clubs are simulated deterministically so standings and
round history have a complete shape. If the prototype's 14 rounds are already
complete, the same season resumes at round 15. An old goal reward remains in the
ledger and balance, and cannot be paid twice. A user must explicitly choose the
next season from the season review; loading a save never advances it.

The league schedule builder retains the original compact 14-round ordering for
its eight-team compatibility fixtures. Full-size schedules are generated once
and cached per club list. In-progress match restore validates the same seed,
opponent, venue and round. Historic eight-club schedules and receipts remain
supported, including old cup brackets and their original calendar gates.

New careers keep the existing £160,000 opening balance. Youth scouting costs
£8,000 per report in the five-tier mode (at most £16,000 per season); historic
two-tier and legacy seasons retain their £12,000 fee and saved receipts. The
five-tier finance curve grows with competition level:

| Division | Home gate | Away gate | Sponsor per league match | Target reward |
| --- | ---: | ---: | ---: | ---: |
| 5 | £24,000 | £10,000 | £8,000 | 1st £80,000; 2nd £50,000 |
| 4 | £28,000 | £12,000 | £9,000 | 1st £100,000; 2nd £65,000 |
| 3 | £33,000 | £14,000 | £10,500 | 1st £120,000; 2nd £75,000 |
| 2 | £39,000 | £17,000 | £12,500 | 1st £150,000; 2nd £90,000 |
| 1 | £46,000 | £21,000 | £15,000 | Current first-tier reward curve |

The target remains promotion for divisions two through five and top-six survival
for division one. Match income, match bonuses, staffing clocks, career year,
statistics retention, cups, calendar and progress labels follow the active
season length. A 14-round historic save retains the appropriate prior schedule
and receipts.

New Tottunham matches use engine version 6. One minute can produce one attacking
event at most; crosses, cutbacks, through balls, dribbles and combinations have
separate action records, while each event retains the established eight RNG
draws. Version 5 saved matches continue with their old outcomes. The live pitch
shows a longer build-up and follows the recorded pass path. Reduced-motion mode
stays static.

The match presentation adapts public Football Manager tactical concepts to the
game's existing instructions and fictional player data. See
[English club reference memberships](ENGLISH_PYRAMID_REFERENCES_2026-27.md).

Useful checks after editing this feature:

```sh
node source/test-progression.cjs
node source/test-economy.cjs
node source/run-tests.cjs
node source/build-pwa.cjs
PWA_DIST=. node source/test-pwa.cjs index.html
```
