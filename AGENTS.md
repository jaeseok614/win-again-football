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
Prior-season division 1 ranks 1 and 2 qualify for the following season. New
five-tier campaigns use 20 clubs and 38 home-and-away matches in division one,
then 24 clubs and 46 matches in divisions two through five. Preserve 14 rounds
and 56 league result rows for old two-division and eight-club saves; international
matches use their own results, receipts and statistics. Domestic Cup takes priority at a shared
calendar gate. Only league matches consume salaries and staff contract weeks.
Legacy saves keep their current match and season without adding European games;
qualification applies after the next season transition. Keep strict deterministic
fixture, RNG, receipt and historical champion validation. National-team matches
remain future work. The Europe panel renders only when the tournament view opens.

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

The public game title is now "눈 떠보니 5부 리그 감독이었다! 이번 생엔 우승한다"
(29 characters). The owner wants a long anime/light-novel-style title and football
imagery in the app icon and startup loading screen. Keep the title readable on
small screens; keep win-again protocol identifiers, save keys and package IDs
stable when changing branding. Preserve original-art provenance in docs/.

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
Owner refinement (2026-10-05, career length and finances; expanded 2026-10-09):
fresh Tottunham UI careers start in division five and pursue four promotions through
five tiers. Division one has 20 clubs and 38 home-and-away matches; divisions two
through five have 24 clubs and 46 matches. The game promotes the top two and
relegates the bottom two where a neighboring tier exists; division five has no
relegation. Keep league, cup, calendar, review, statistics, and finance tier-aware.
New division-five scouting costs £8,000 against the £160,000 opening balance.
Preserve old two-tier and eight-club saves, schedules, and receipts unchanged.
Details: docs/FIVE_TIER_PYRAMID_AND_FINANCE.md.

Owner refinement (2026-10-05, English club references and player faces; expanded
2026-10-09): populate the five game tiers with 2026/27 Premier League, Championship,
League One, League Two and National League references at full 20/24-club sizes.
Keep Tottunham's National League story exception, existing club IDs, historic raw
ratings, and old saves stable. Display the fictional parody names; keep the exact
club references in source metadata and docs/ENGLISH_PYRAMID_REFERENCES_2026-27.md.
Use the shared original fictional portrait atlas rather than real-player photos
or runtime downloads. Keep fixed starters and initial transfer targets on
distinct deterministic faces, show portraits on the live pitch and in squad and
tactics screens, and register the large atlas once for both bundled and offline
builds. Preserve the generation prompt beside the asset.
