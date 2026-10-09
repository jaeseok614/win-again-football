# Football manager development

Read DEVELOPMENT.md and the newest entry in HANDOFF.md before editing.
Develop in source/dist; root index.html is generated. The source/ tree is the
current implementation. football-source-v22.zip is only a historic snapshot;
never replace current modules or restore retired legacy modules from that archive.

## Current owner requirements (2026-10-07; supersede historical notes)

The owner explicitly retired old saves, old superstar rosters and 14-round leagues.
Only season schema 10, match engine 10 and full five-tier campaigns are supported.
Do not add compatibility engines, legacy schedules or automatic season migration.
Fresh and practice squads use Tottunham starter identities (sp_*). Preserve valid
current campaigns and player/contract identities during development and testing.
Keep storage key win-again-season-v17 and app/package/protocol IDs stable.
Opponent reports put formation/tactic, calculated strength and stamina before the
eleven-player roster; long coach and specialist analysis follows the roster. Keep
full readable names and preserve all abilities on mobile without horizontal swipes.
Starter/bench comparison separates calculated overall/form from live stamina and
does no work while hidden. Season story wording follows the current or historic
division; first-division dialogue pursues TOP 6 rather than another promotion.
Old chronological design notes do not override this current scope.

The title is "눈 떠보니 5부 리그 감독! 토투넘 1부 귀환기". The parody club starts
in the fifth division and needs four promotions to return to the first division.
The first division has 20 clubs and 38 rounds; lower divisions have 24 clubs and
46 rounds. Use one home and away meeting per opponent. Each lower division promotes
the top two (the game's simplified rule). Relegation groups are division 1 bottom 3,
division 2 bottom 3, division 3 bottom 4, division 4 bottom 2, division 5 none.
Never advance a valid campaign on restore. Only the player's explicit season-review
action starts a new season. League rounds consume wages and staff contract weeks;
cup/European fixtures have separate receipts and statistics. Keep deterministic
fixture, RNG, history and financial validation. Europe qualification uses the
previous first-division top two. Cups take priority at shared calendar gates.

## Presentation and performance

Consider mobile performance in every change. Hidden dashboards do no work during
live ticks. Cache immutable derived structures and invalidate previews when inputs
change. For perceptible operations immediately show loading/progress, prevent
repeated actions, report completion/failure and offer retry where useful. Show a
percentage only when measurable. Keep startup assets small and offline-capable.

Show a title menu before the management home. Do not run match time behind it.
The first campaign automatically presents two short arrival scenes and the actual
two-choice owner conversation before management. Do not hide this behind a story
button or let an old guide preference skip it. Completed arrivals do not replay on
restore. The subsequent controls tour remains optional with skip and settings replay.
The scoreboard, clock, live pitch, commentary and essential match buttons fit one
phone viewport. Controls occupy two filled rows on portrait phones in prep, running, paused and
full states. Short landscape screens place these groups side by side to leave room
for the pitch and readable commentary. The pitch is observation-only. Tactics, substitutions, statistics, reports,
talks, results and settings use accessible popups with internal scrolling, keyboard
focus, Escape dismissal and 44px touch targets. Opening planning pauses the match;
closing never silently resumes it. Tactics use touch/pointer drag and the shared
12-formation layout. Show full player names, overall skill, condition separately
from stamina, and stamina gauges. Verify short/small phone and desktop layouts.

Permanent owner feedback (2026-10-08): keep essential live information on one
phone screen, with readable commentary and no horizontal slides for core facts.
Use compact kits/numbers on the pitch and portraits in squad/detail dialogs.
The foreground ball must remain visible over every player. Show possession
recovery, ball carrying, forward runs, delivery, shot and goalkeeper response in
order. A wing carrier advances beyond teammates before crossing; a goalkeeper
narrows the angle and meets the ball before announcing a save. Presentation must
not invent saved match statistics or change the clock, RNG or recorded outcome.
Permanent owner feedback (2026-10-09): ordinary passes should move briskly while
decisive shooting and goalkeeping remain easy to follow. Show the ball travelling
from the shooting player toward the goalkeeper/net, including visible recovery
before a possession change. Bound display deltas so a stalled frame cannot skip a
shot or reveal its result early. Use the same field geometry for live and replay.
Receivers approach incoming passes and take a visible first touch before ordinary
shots. Running stride and body lean follow actual displayed displacement, settle
when standing, and freeze on pause. Keep these poses out of persistent match state.
Both sides' off-ball defenders and midfielders should shift toward developing
attacks, while supporting attackers advance in separate lanes. Preserve primary
duel/keeper contact paths and verify both teams at every animation boundary.

Reuse the existing explicit substitution selection flow: five players, three
in-play windows, multiple replacements at the same minute share a window and
minute-45 halftime changes do not consume windows. Synchronize set-piece takers
when preparation lineups change. Ratings, estimated possession, chemistry and
coaching comparisons are labelled derived read-only information; never invent
missing events, appearances or engine bonuses.

Keep the latest article headline visible on the home dashboard and full articles
inside the news popup. Derive assessments, manager story
and goals from actual confirmed records. Use original fictional outlets, journalists,
player/coach names and art; do not attribute simulated quotes to real newsrooms.
Use bundled portrait atlases with stable identities, never runtime photo downloads.
Show the current division's club/stadium growth illustration on the default home.
Stage changes follow the actual explicit season transition, including relegation.
Review comparisons use confirmed final league movement; pictures and the top-tier
training campus do not create attendance, capacity, revenue or facility bonuses.
Keep home rank, points, funds, availability, next opponent and primary actions above
the phone navigation in both portrait and short landscape. Before kickoff show
calculated starter strength and fitness; during play show football statistics.
The guide opens the whole 18-player squad with positions, calculated overall,
stamina and separate condition. Transfer filters work with an empty search box;
clearing/editing a keyword immediately updates results, including Korean IME.
Keep generation provenance in docs/. Detailed player traits are identity-derived.
Optional team talks and ClubStory choices retain deterministic validated receipts.
Permanent owner feedback (2026-10-09): home, squad, transfers, academy and competition
entry screens fit one viewport. Use bounded management dialogs with a persistent
close control and section selector instead of expanding long dashboard panels.
Keep transfer filters and candidate results together. Move the existing control
nodes, restore them on close, pause planning and never resume merely on dismissal.
New confirmed-round dialogue appears automatically when home is unobstructed;
opening it never answers on the manager's behalf. Keep recovery, loose-ball duels,
defensive stops and keeper possession visible before the next outlet pass.
Story dialogs show one scene, question or reaction per page. Reveal reactions only
after an explicit answer; retain both chosen answers in replay. Follow-up stories
use validated prior receipts and confirmed rounds, keeping the original actor.
National-team play remains future work.

Permanent owner feedback (2026-10-09, fan/owner story effects): completed ClubStory
dialogues now affect actual match focus through StoryMood. This supersedes earlier
story-only/no-bonus notes for this explicit mechanic. Keep one latest source per
relationship, personality-based reactions and an aggregate cap of ±2% per player.
Expire sources after two confirmed league rounds (cups share the window), freeze
context once kickoff occurs and validate it against the saved receipt prefix.
Reveal results only after both answers. Never alter permanent skills, money or past
match records merely for reading/replaying dialogue. Show current focus in player
details and preserve current v10 saves that predate this optional match context.

Permanent owner feedback (2026-10-09, report follow-up): player abilities,
opponent player comparisons, tactical placement and tactical analysis must fit a
single normal phone viewport, including 320x568 and short 844x390 landscape.
Use report section selectors/pages instead of long vertical stacks. Keep identity,
close, section switching and player navigation visible; preserve every ability and
the existing original control handlers. The tactical pitch adapts to available
height, retains 44px draggable targets and all 12 formations. Scrolling is only an
accessibility fallback for enlarged text/unusually small windows, not the default
way to read these reports. Test actual scroll sizes AND bounds to catch clipped
details contents. Page selection does not alter campaign/RNG/tactics.

Tactical name labels must not spill outside their cards. Use word wrapping for
full names on normal screens; very narrow/short screens may use the same compact
name as the live pitch, retaining full identity in the selected-player status and
accessible label. Render only one name label per card. Verify glyph bounds and
overlap across all 12 formations, not only the initial 4-4-2.

## Verification and delivery

Use Node.js/Python standard libraries; no npm installation is required.
Run node source/run-tests.cjs. Build and verify the public PWA with
node source/build-pwa.cjs and source/test-pwa.cjs with PWA_DIST set to the repository.
Build Android offline assets with node source/build-android.cjs and verify with
node source/test-android.cjs. APK/AAB compilation requires Android Gradle/SDK;
asset generation alone is not an APK or Google Play release.

Commit modular source, regression tests and the complete generated public PWA.
Never commit personal campaign exports, credentials, .openai, QA fixtures,
local.properties, signing keys or generated Android game/build assets.
Document exact tested results and any remaining limitation in HANDOFF.md.
The owner authorized continued development and GitHub pushes to the current work
branch. Do not request repeated confirmation for those actions. Never force-push
or overwrite unexpected remote changes.

All player-facing menus, headings, guidance, loading messages and club names use Korean as the primary language. Keep English IDs and source reference names internal; familiar football position abbreviations and terms may remain. Render English club references through EnglishPyramid.koreanName without changing campaign IDs, ratings or save history.

Match viewing uses a visible 0.5x/1x/2x/4x speed picker, with start/pause/resume instead of a five-minute skip. Keep the same pattern in practice. Speed changes never advance minutes, alter RNG, or resume a pause. Major live build-ups display at at most 2x; decisive controls, shots and outcomes display at at most 1x so the ball/keeper sequence stays readable. Bench alerts use actual energy, discipline and visible score; decisions are explicit, respect substitution rules, and never announce an undisplayed goal. New match stories require confirmed complete records.
