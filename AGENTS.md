# Football manager development

Read DEVELOPMENT.md before changing the game.
If HANDOFF.md is present, read it for the latest checkpoint, known failures and
unfinished requests before editing or describing the build as ready.
The latest modular source is tracked in source/. The original fallback snapshot is
football-source-v22.zip. If source/ is absent,
run `python3 setup-source.py` (Windows: `python setup-source.py`). This verifies the
archive and extracts 140 files. If source/ exists, keep its current changes.

Develop in source/dist, not the generated root index.html. Use Node.js and Python
standard libraries; no npm install is needed. Test using the commands in
DEVELOPMENT.md. Keep season save key win-again-season-v17 and legacy restore
compatibility. Preserve existing campaigns during tests; use isolated fixtures.

Never commit personal campaign exports, credentials, .openai, or local QA pages.
The root files serve the published game. Source edits alone do not update the
published game; prepare and verify the complete PWA bundle before deployment.
Commit edited modular source files so subsequent tasks can continue from them.

## Persistent development requirements from the owner (2026-10-02)

Match screen requirement (2026-10-05): keep the scoreboard, clock, live pitch,
commentary and essential match buttons in one viewport without page scrolling.
Substitution, tactics, player tools, reports, statistics, team talks, settings and
results belong in accessible popups, not inline panels pushing the pitch away.
Opening a planning popup pauses the match; closing must never silently resume it.
Reuse existing controls and require an explicit candidate action for substitutions.
Preserve keyboard focus and Escape dismissal, allow scrolling inside popups, and
verify small/short phone and desktop viewports. Apply this rule to future features.

Owner refinement (2026-10-05): match controls occupy exactly two filled rows in
prep, running, paused and full-time states. The live pitch is observation-only:
no player selection or drag there. Position and role changes belong exclusively
to the tactics popup; substitution selection lists every starter in its own popup.
New UI campaigns use the Tottunham parody starter identities (sp_*) inspired by
the 2024/25 Tottenham squad. Keep old squad identities and their contract history.
The startingClub marker selects canonical starter contracts for finance/statistics
validation. When an unmarked legacy campaign is already saved, make the title
screen's primary action start the canonical Tottunham campaign and keep the previous
campaign recoverable as the prior-save backup; do not resume its old superstar roster
by default. Mental attributes influence team talks; rules:2 receipts replay the new
formula and missing rules retain the original formula. Never reinterpret old talks.
Onboarding/tutorial completion is a device preference, separate from campaign data. Keep the
guided practice optional, connect it to real controls, and never auto-kickoff.

Consider performance in every change, especially on mobile. Avoid rebuilding
hidden dashboards during live match ticks; defer expensive work and keep startup
assets small. Verify the actual mobile UI, touch targets and responsiveness.
For operations that may take perceptible time, immediately show a loading state
or progress gauge. Show a percentage only when progress can be measured; otherwise
use an indeterminate indicator with a clear description. Prevent duplicate actions,
show completion or failure, and offer a retry when useful. Never leave the player
looking at an apparently frozen screen. Preserve these requirements in future work.

Source now includes the full modular tree. Run `node source/run-tests.cjs` and build
the complete public PWA with `node source/build-pwa.cjs`. Do not commit personal
QA fixtures or browser saves. The v22 ZIP is the original fallback, not the newest
source; setup-source.py only fills missing files and preserves current edits.

Champions League is implemented in europe.js with the shared Football engine.
Prior-season division 1 ranks 1 and 2 qualify for the following season. Existing
compact campaigns retain their saved fixtures and results. New full-size campaign
work must not advance, replace, or discard a restored campaign: keep its year,
round, confirmed records, and in-progress match. A season transition happens only
after the player explicitly chooses it from the season review. International
matches use their own results, receipts and statistics. Domestic Cup takes
priority at a shared calendar gate. Only league matches consume salaries and staff
contract weeks. Keep strict deterministic fixture, RNG, receipt and historical
champion validation. National-team matches remain future work. The Europe panel
renders only when the tournament view opens.

ClubLife provides optional pre-match, halftime and 65-minute team talks, canonical
pre/post-match interviews and recent articles derived from real game receipts.
Preserve deterministic RNG and old saves without morale. Talk confidence is capped
at +/-3, and a spoken-to player cannot be replaced through recruitment mid-fixture.
Keep hidden journal/talk views cheap. Coach portraits are original fictional art;
do not substitute real club/player photos or download portrait assets at runtime.

Android is the intended Google Play release route. Build the offline native app
with `node source/build-android.cjs` and android/gradlew. Keep local.properties,
signing keys, generated assets and build outputs out of Git. Release bundles are
unsigned until the owner creates a Play account and provides an upload key.

The public game title is now "눈 떠보니 5부 리그 감독! 토투넘 1부 귀환기"
(26 characters). The story begins with the relegated parody club in the fifth tier
and follows four promotions back to the Premier League. Keep the title readable on
small screens; keep win-again protocol identifiers, save keys and package IDs
stable when changing branding. Google Play titles must remain within 30 characters.
Preserve original-art provenance in docs/.

The owner tested the APK and wants an app title menu before the management home,
visible articles without expansion buttons, and manager/player media assessments.
Keep startup presentation out of campaign exports; never advance a restored match
behind the title menu. Main score, pitch and match actions must fit a phone viewport.
MediaRoom derives opinions from confirmed statistics without touching RNG or saves.
Use clearly labelled original fictional outlets, never credit simulated quotes to
actual journalists or newsrooms. Keep articles visible on the home dashboard.

Owner refinement (2026-10-05, APK feedback): tactics uses pointer/touch drag/drop,
never position sliders. Derive assigned pitch position from coordinates while
preserving natural registration and saved contracts. Live pitch remains read-only.
Keep a shared layout source for all twelve formations. A shot highlight starts
at the last visible ball, shows recovery/pass before shooting, and preserves RNG.
New UI campaigns default to Tottunham with no separate Tottunham-start button.
Onboarding appears on first play with visible skip; replay belongs in settings.

Owner refinement (2026-10-05, player traits): display player-specific left/right foot
strength and detailed positional suitability in reports and the tactics popup.
Separate match condition from stamina. On the live pitch, show stamina as a vertical
green/yellow/red fill gauge and condition as a separate dot; keep names legible and
the entire match UI in one phone viewport. Preserve the identity-derived traits and
old campaign saves. See docs/PLAYER_TRAITS_AND_CONDITION.md.
Continue fictional story chapters on the home screen from confirmed season progress.
Interactive ClubStory choices are optional campaign receipts, unlike onboarding.
Keep their two-turn dialogue, identity, season and round validation on restore;
derive rookie promises from confirmed league minutes, never invented appearances.
Dialogue choices affect fictional relationships and later replies, not engine RNG
or finance. Show dialogue in an accessible popup and keep hidden story views cheap.

Owner refinement (2026-10-05, player labels): tactics player cards show full names
with wrapping, never ellipsis, plus overall skill and live energy. Support links
show a derived coach chemistry score and color with named component explanations.
Use actual passing, deterministic teamwork, current role suitability and energy;
keep this analysis separate from engine bonuses or invented shared-match records.
Earlier compact-pyramid rules (superseded 2026-10-06): the five-tier prototype
used 40 clubs, eight per tier, and 14 rounds. Preserve those rules when restoring
their historic campaign data, but fresh five-tier careers and in-place-upgraded
five-tier saves now use 116 referenced clubs, 38/46 rounds, and season schema 10.
Top two promote and seventh/eighth relegate where a neighboring tier exists.
New division-five scouting costs £8,000 against the £160,000 opening balance.
Preserve all recorded receipts. Details: docs/FIVE_TIER_PYRAMID_AND_FINANCE.md.

Owner refinement (2026-10-06, realistic English pyramid; implemented): use 20
Premier League clubs/38 matches and 24 clubs in each of the four divisions
below/46 matches. New five-tier seasons include the manager's club in the
eight-team domestic cup, spaced across the season. Upgrade compact five-tier
saves in place, retaining year, played progress, original receipts, and current
match; deterministically fill completed AI fixtures and resume at round 15 if
the old 14 rounds were complete. Never advance a save during restore. Only an
explicit player action starts the next season. Finance, staff clocks,
statistics, cups, calendars and UI follow the active season length, while
historic non-five-tier schedules and receipts remain intact. See HANDOFF.md,
docs/FIVE_TIER_PYRAMID_AND_FINANCE.md and
docs/ENGLISH_PYRAMID_REFERENCES_2026-27.md.

The current five-tier implementation already uses real competition sizes and
schedules: 20 Premier League clubs/38 rounds, and 24 clubs/46 rounds in each of
the lower four divisions. Schema-10 migration upgrades compact five-tier saves in
place while retaining their year, results, receipts, finance and current match.
The home season-progress indicator uses the active schedule length. Keep legacy
non-five-tier fixtures and receipts intact. See HANDOFF.md, the five-tier design
and 2026/27 reference list when changing this system.

Owner refinement (2026-10-05, English club references and player faces): use
2026/27 Premier League, Championship, League One, League Two and National League
clubs as references for full tier pools. Keep the Tottunham-to-National-League
story exception, original club IDs, raw ratings, compact schedules and old saves
stable. Display fictional parody names; keep exact reference clubs in source
metadata and docs/ENGLISH_PYRAMID_REFERENCES_2026-27.md.
Use the shared original fictional portrait atlases rather than real-player photos
or runtime downloads. Keep fixed starters and initial transfer targets on their
stable faces; give opposition starters distinct faces. Show portraits on the live
pitch, in squad/tactics screens, and in the opponent scout. Register the atlases
once for bundled and offline builds, keep additional atlases compact, and preserve
each generation prompt beside its asset.
