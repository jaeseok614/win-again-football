# 현재 경기 규칙 — 2026-10-20 연속14

새 킥오프/새 연습은 **14**다. 공개1–14의 물리·난수·명령·연습·부분 저장·정산을 보존한다. 다음 물리 변경은 **15**로 분리한다. schema10, win-again-season-v17, 앱 ID와 현재 시즌을 유지한다. [설계/전술 비교](docs/FOOTBALL_RULE14_2026-10-20.md)와 [설치 증빙](docs/FOOTBALL_RULE14_RELEASE_2026-10-20.json)을 먼저 읽는다. Drive에는14 테스트 APK가 공개되었다. 일반 PWA는6,320,000바이트 제한을 유지한다(현재6,319,868). Source20분/Android 계측20분·전체45분 제한과 모든 판정을 유지한다. 가로 UI·실제 저장 왕복·원격 전체 바이트를 검사했지만 일부4-4-2 압박 우세/낮은 수비와 저성능 끊김은 남아 있다. PR25는 초안, main은 미병합이다.

로딩 중에도 resize 같은 이벤트가 스크립트 사이에 도착할 수 있다. 뒤쪽 모듈의 전역을 읽는 초기 이벤트는 준비 여부를 확인한다. source/test-startup-resize.cjs와 source/browser/startup-resize.cjs의 실제 초기화 순서 회귀를 유지한다.

# 이전 공개 경기 규칙13 — 2026-10-19

아래는 공개13 당시의 기록이다. 현행 규칙은 상단14 지침을 따른다. 당시 새 킥오프/새 연습은 **13**이었다. 공개1–12의 저장·물리·난수·명령·연습·정산을 유지한다. 그 다음 물리 변경은14로 분리했다. schema10, win-again-season-v17과 현재 시즌을 바꾸지 않는다. [압박·역습·탈취 전술 분석](docs/PRESS_COUNTER_RULE13_2026-10-19.md)을 먼저 읽고 HANDOFF의 최신 검증 상태를 확인한다.

# 이전 공개 경기 규칙12 — 2026-10-19

다음은 공개12 당시의 기록이다. 현행14는 맨 위 지침을 따른다. 당시 새 킥오프/새 연습의 연속 규칙은 **12**다. 공개된1–11의 부분 저장·물리·RNG·명령·연습·정산은 그대로 보존한다. 다음 물리 변경은13이 필요하다. 시즌/경기 스키마10과 저장키 win-again-season-v17은 변경하지 않는다. [규칙12 접촉·선발 비교·새 코치 대화](docs/FOOTBALL_DUELS_2026-10-19.md)를 먼저 확인한다. 실제 진행 경기는 저장된 규칙으로 계속하고 현재 시즌을 이동하지 않는다.

# Football manager development

Read DEVELOPMENT.md and the newest entry in HANDOFF.md before editing.
Develop in source/dist; root index.html is generated. The source/ tree is the
current implementation. football-source-v22.zip is only a historic snapshot;
never replace current modules or restore retired legacy modules from that archive.

## Landscape-only release direction (2026-10-13; supersedes portrait layouts below)

The owner explicitly requires landscape-only play, including future development.
Android uses sensorLandscape; the installed PWA requests landscape; browsers that
cannot lock orientation show a rotate prompt and pause without auto-resuming.
Prioritize a polished landscape management workspace: pitch and selected-player
attributes together, persistent match navigation instead of a native menu select,
club crests in competitions, and placement-dependent overall estimates.
Quality takes priority over minimum download size, while offline assets, bounded
work and responsive controls remain required. Do not inflate assets without value.
Keep Korean words together when wrapping; use intentional two-line navigation labels.
Keep ratings/position/name inside player cards, with numeric values alongside color.
Check internal text bounds, card overlap and full profile visibility, not only outer panels.
Position ratings are labelled coach estimates, separate from base attributes,
condition and stamina; they must not silently change published engine rules.

## Dense reports (permanent owner feedback, 2026-10-13)

When a popup has little information, show its useful facts directly in the current
landscape screen instead of fragmenting them behind extra buttons or small pages.
Player reports keep age, height/unknown status, wage, preferred foot, preferred
positions and current abilities together. Use compact numeric/color tables and
preserve actual actions, identity routing and 44px essential controls. Unknown
facts remain explicit, never fabricated. Read docs/PLAYER_REPORT_WORKSPACE_2026-10-13.md.

## Single-screen match and management (2026-10-14)

The owner requires the pitch to be larger than the statistical rail (about 62%/38%).
This supersedes the previous 1.6 display-pitch ratio. Keep actual 22-player football
and facts, but bound repetitive viewer highlights. Goal artwork dismisses after
2.6 seconds without resuming a manual pause or crossing a match phase boundary.
Put small management reports inline with consistent 44px lower actions; league
clubs and selected-round fixtures must appear together without table pagination.
Use compact columns plus selected-club totals on phones. Read
docs/SINGLE_SCREEN_WORKSPACES_2026-10-14.md and test real later-campaign states.

## Manager voice and visible press (2026-10-14)

Use original Korean dialogue with distinct owner/coach/player/reporter voices and
explicit manager inner thoughts. The owner dislikes overly formal, very short
conversation cards. Group narration, thought and question into dense readable beats;
preserve every archived sentence, actual answer ID, promise and focus effect.
Expose article headlines and the actual current interview on the home screen.
All reporters/outlets and quotes are fictional; scores and standings use confirmed
records and actual promotion/relegation boundaries. Read
docs/MANAGER_VOICE_2026-10-14.md. Viewing must never submit an answer or spend.

## Match facts and entry routes (2026-10-13)

The landscape match side rail compares actual displayed-match facts, inspired by
FotMob: possession and twelve numeric statistics. Use visibleMatchForReports and
Matchday.facts; show waiting/unknown values explicitly, never fabricated live facts.
Generic substitutions start with no selected player. Only explicit player actions
carry an identity; never inherit a tactical preview as a substitution selection.
Test real bottom-menu and management-dropdown routes, not only direct helper calls.
Read docs/PHONE_WORKSPACES_2026-10-13.md and test internal text/row/goal-action bounds.

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

## Reincarnation loop direction (2026-10-11)

Prioritize a focused failure/retry loop over endless management features. New app
campaigns enable the optional v10 rebirth rules: confirmed league pressure,
six-game promises, a three-game warning before dismissal, free reincarnation with
one chosen memory, and a first-division-return ending. Preserve valid existing
campaigns; offer explicit opt-in from their current point, never retroactive losses.
Do not restart or consume a continuation on viewing/dismissing a dialog. Keep the
pre-rebirth full backup and handle storage failure atomically. The current one-use
appeal from life two onward is free; real billing is not integrated. Local JSON
history is not payment entitlement proof. Read docs/REBIRTH_LOOP_2026-10-11.md.

## Full continuous engine direction (2026-10-12, supersedes hybrid notes below)

The owner requested whole-match continuous football. New confirmed kickoffs use
continuousSetup.version=10, a shared 100ms physical world for the actual two elevens.
The minute opportunity sampler is not used for those matches. Live and replay read
the same physical coordinates, contacts and recorded statistics. Preserve valid v10
running/confirmed matches and the released spatial version1 solver. Never change a
released continuous rule underneath saved receipts; future changes need explicit
versioning. Store and validate tick-level command journals, appearances, cards,
segments and measured statistics. Read docs/CONTINUOUS_FOOTBALL_ENGINE_2026-10-12.md.
New rule10 adds physical arrival-based pass/shot choices, formation-bounded support
pockets, shared-snapshot avoidance and reacted goalkeeper acceleration. Read
docs/REA_FOOTBALL_RULE10_2026-10-15.md. Preserve published rules1–9 exactly;
future physics changes require11+. Analysis uses the real read-only target solver.
Read docs/CONTINUOUS_TACTICAL_AI_2026-10-12.md for version3 arrival-based
press/cover, fatigue, safe passing and goalkeeper containment. Preserve released
continuous versions1/2/3/4/5/6 and their exact receipts too. Read
docs/CONTINUOUS_CONTACT_AND_BALANCE_2026-10-12.md for version4 swept contacts,
whole-ball lines, restarts, offside rebounds and balanced recovery/keeper reactions.
Read docs/CONTINUOUS_PASSING_FLOW_2026-10-12.md for version5 bounded pass
lead, physical ball arrival, first touches, diagonal support and opponent response.
Read docs/CONTINUOUS_PRESS_AND_DEFENCE_2026-10-12.md for version7 trigger-based double pressing, compact goal-side cover, actual-speed exertion and low-block outlets. Preserve published version6/7 practice seeds/parameters too. Read docs/MOBILE_MATCH_FEEDBACK_2026-10-13.md for version8 formation lanes, limited close support, stable challenger selection and formation-only arrival easing. The benchmark defaults to actual halftime reset; --half-reset false is only for reproducing historical diagnostics. Read docs/CONTINUOUS_DECISIONS_2026-10-12.md for version6 local carry/attack choices, moving-carrier interception, complementary press screens, carrying speed cost and explicit remaining tactic balance. Read docs/NOTEBOOK_STORY_2026-10-12.md for original record-driven notebook scenes and shared cast art. Use the new engine in new practice sessions too, show preparation before expensive
replay/practice work, and keep all current names/ball/core controls on one viewport.
Latest owner feedback (2026-10-12): no player-name connector lines in live matches,
replays or practice. Keep names near the markers and simplify the pitch. Default
key viewing accelerates routine play while showing actual major action in order;
full viewing remains selectable. Display filtering never removes saved contacts.

## Pre-match squad and movement direction (2026-10-11)

2026-10-12 explicit user request authorizes actual engine changes inspired by
reference engines. New kickoffs enable optional v10 `spatialSetup.version=1`:
fixed-step open-play paths decide pass contact/offside and affect future shots/xG.
Preserve existing running matches and confirmed records. Rendering remains read-only
and must reuse that recorded attack's shared solver, with all active names shown.
Do not change the released version1 solver underneath saved version1 receipts;
future physics changes need explicit rule versioning and preservation of those records.
Keep the first title and mandatory arrival pages visually anchored to the bundled
original Korean manager image, with no internal prose scroll on supported phones.

The mandatory kickoff briefing shows both actual selected elevens, formation,
calculated strength/energy and three role-based key players. Both actual elevens and each team’s average ability remain simultaneously visible on phones and wide screens in compact readable comparison columns. An explicit detailed roster opens the existing own/opponent player dialogs over the briefing. Full names and our reserves
are available in six-player pages. Closing any report never starts the match.
Use the current custom placements and suspension replacements, not a parallel XI.
Our overall matches TouchlinePlan’s role-weighted formula; opponent overall uses Opposition.
Core restore/preview validation must work before late UI modules load.
Keep individual movement timing keyed to identity, with near-ball support,
far-side depth and limited centre-back drift. Avoid reintroducing the old shared
large sine-wave displacement. Movement remains presentation-only and must preserve
ball contact, local recovery, pause, replay and RNG/score continuity.

## Presentation and performance

Permanent owner requirement (2026-10-11, reaffirmed): ALL on-field players on
BOTH teams must have readable names by default throughout live matches AND
replays, including off-ball play, set pieces, pause and reduced-motion mode.
Never gate names behind possession, focus, hover, a setting or a small-screen
breakpoint. Use compact names without ellipses, separate crowded labels with
nearby collision-aware placement without connector lines, and keep the ball above them. Full identities remain accessible.
This is a continuing requirement for every later feature, not an optional mode.

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
During the controls tour, keep visible Previous / Next / Skip actions inside the
actual squad, tactics and talk dialogs. Closing a report returns to its current
explanation; Next alone advances each explanation. Squad/tactics/talk opening uses a separate optional button. Completed mandatory arrival replies also have an explicit Next to the controls tour; no extra team-talk action is required. A team-talk choice is optional.
Do not apply tactics, talk effects, substitutions or kickoff for a tutorial step.
Reserve space for the guide controls without covering the tactical pitch, and
remove them on completion, skip or deliberate navigation outside the tour.
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

Permanent owner feedback (2026-10-11): restrict tactical dragging to nine labelled
field zones and a fixed keeper-only area; moving a field player changes the
assigned role, never their registration identity. Pick routine ball recoverers
from the local attacking lane on both teams and preserve cycle continuity.
Keep both teams' compact names visible during live play. Require an opponent
briefing before every kickoff. Show kickoff, halftime and full-time ceremonies;
wait for the last visible action, and never run the clock behind a ceremony.
Player detail is an explicit exception to the earlier no-scroll report rule:
show all technical, mental and physical attributes together with internal scroll,
fixed identity/close/navigation, and role-based highlighting rather than hiding
non-selected attributes. Optional v10 stoppage activates at the next kickoff,
plays actual engine ticks, and is recorded in player minutes and settlements.
Existing in-progress matches keep their saved duration. Halftime substitutions
use the actual halftime boundary (45 plus first-half added time).

## Specific placement and pacing feedback (2026-10-13)
Use distinct LS/RS, left/right midfield/defence and wingback slots in the tactics editor. Dropping onto an occupied location swaps both placement coordinates atomically, preserving identities and natural registrations. Avoid the retired nine-zone scattering UI. Keep recorded continuous1–7/spatial1 receipts exact. New rule8 movement eases only formation targets; receivers, carriers, pressing, goalkeeping and restarts must still physically reach contact. Selected playback speed also affects shooting: key shots 2× selected speed, bounded at4×; attack4× selected bounded12×; routine48× selected. Full viewing has separate readable rates. These are presentation rates, never score/clock/RNG edits.

## Browser-engine reference and display performance (2026-10-13)

Read docs/BROWSER_ENGINE_REFERENCES_2026-10-13.md. Keep fixed physical ticks separate
from rendering. Reuse consecutive physical display snapshots only within a single
RAF callback; next callback reads fresh state. Project active players into team
frames in one pass. Display optimization must not change journal, RNG or receipts.
Do not infer a reusable football engine from a browser-port headline; inspect
primary source and license before any source or asset reuse.

## Latest formation movement (2026-10-13)
New kickoffs/practice use continuous9. Read docs/FORMATION_MOVEMENT_2026-10-13.md. Preserve published1–8 worlds/receipts; future physical changes require10. Use actual formation anchors, local pressing, distinct marks, far-wing width and time-bounded off-ball target changes. Drop stale targets at restarts/end changes. Never apply arrival slowdown to physical receivers. Benchmarks are diagnostics, not proof of finished tactical balance.

## Latest viewing pace (2026-10-13)
Read docs/MATCH_VIEWING_PACE_2026-10-13.md. The owner likes formation movement but wants calmer players and faster match time. Default key mode holds a clearly labelled all-player position overview during routine play (144× selected), then displays real attack3× capped6 and decisive1.5× capped3. This supersedes earlier key rates. Keep whole physical ticks, exact clock/results,6ms RAF work budget/50ms display delta and readonly presentation. Clear overview on phase/contact/pause/inactive callbacks/match/watch changes; pause shows current real coordinates. Full viewing remains available.

## Latest commentary placement and slight slow motion
The owner wants commentary directly ABOVE the pitch in portrait and landscape, with readable two-line text and no overlap with players. Keep clock text separate and all core controls in one viewport. Routine key play is180× selected; attacks stay3× capped6; shots/saves2.25× capped4.5, only25% slower than key attacks. Full-view shots use2.25× capped4.5 too. These supersede previous viewing rates; physics and saved records remain identical.

Permanent owner feedback (2026-10-13): reserve real layout space for bottom navigation on management screens so club news stays above it. The tactics tab is the central entry for formation, instructions, lineup comparison and existing set-piece takers. Reuse actual editors; closing returns to the tactics centre without resuming. Competition starts with confirmed current standings (played/W/D/L/GF/GA/GD/points) and actual cup brackets; paginate vertically dense tables without horizontal swipes or future-result disclosure.

## Landscape reading and match space (2026-10-13)
Keep commentary above the enlarged pitch and the compact score beside it. Guides/story/notebook use illustration left, prose right and stable bottom actions with44px primary targets. Expand Korean narrative without moving reply controls offscreen. Test568×280 through tablet; reading must not answer or mutate the campaign. Long management lists may scroll inside a bounded report; title/close stay visible. See docs/LANDSCAPE_SCREENS_2026-10-13.md.

## FM-style roster/recruitment (2026-10-13)
Use dense list plus selected-person report, numeric/color ability comparison, actual remaining energy and stable44px primary actions. Squad selection previews; a separate visible detail button opens the full report in normal and guided views. Recruitment list uses trained owned-player values and current outgoing identity. List/mode selection never spends, saves, advances physics or changes lineup. See docs/FM_WORKSPACE_2026-10-13.md. Owner permits larger assets when they improve quality; keep shared atlases and measured performance rather than inflating bytes.

## Direct formation and page workspaces (2026-10-14)
Formation choices (all 12), actual player placement, selected numeric/color abilities,
23 placement choices, attack/defence orders and the three set-piece assignments
belong on the main landscape tactics page. Do not require a formation popup.
Primary squad/recruitment navigation opens the actual inline workspace, not a modal.
Show short home facts and illustrated article summaries directly; only the full
article and richer reports need a modal. Preserve native back routing through
focused child reports before returning to home, actual slot swaps and registered
player identities. Read docs/DENSE_PAGE_WORKSPACES_2026-10-14.md and verify card
overlap, every internal text/control bound and actual bottom-menu routes.

## Single-screen training and club operations (2026-10-14)
Primary training, coaches, owner promises, body status, saved-XI plans, current
finance, club facts and discipline use actual landscape page workspaces. Keep all
18 training players, all 10 staff candidates, current 5 roles and 11-player plan
visible together with real effects/quotes and explicit actions. Short core facts
are inline; long forecast rows/full player reports remain explicit detail reads.
Never let hidden inactive panes occupy layout space. Preserve real node handlers,
weekly training sharing, role contract limits, confirmed-only finance, readonly
previews and the Android back path from an inline home operation to main home.
Test internal glyph/photo bounds and post-action states, not only outer rectangles.
See docs/OPERATIONS_WORKSPACES_2026-10-14.md.

## Preparation report and real training comparisons (2026-10-14)
Keep opponent formation/danger player/actual comparisons, recent confirmed league results, current body status, staff expiration and owner promises together in the club workspace. Four team-training choices show actual expected effects and energy cost before explicit execution. Only successful execution shows exact before/after values, scoped to the matching campaign/week/identities/results; the session-only receipt is not saved history and must never be fabricated on restore. Read docs/PREPARATION_DESK_2026-10-14.md.


## Record-driven serial stories and contextual press (2026-10-15)
Read docs/TOUCHLINE_STORIES_2026-10-15.md. Four original three-episode arcs use the existing two explicit ClubStory receipts. Freeze published serial keys, trigger rules, recorded actor identity, answer meanings and original prose; future incompatible changes need new keys/versioning. Follow-ups use two full confirmed league games after the actual last answer, including validated continuous own goals without assigning them to a normal scorer. Never consume a Rebirth deal, move a season, alter a lineup or create investment from reading. Keep all words in complete replays, show the final reply immediately after the answer, and return from a notebook scene to the same notebook tab/page. Press follow-up context uses facts only up to its actual fixture; preserve existing questions, spoken answers and archived articles. A post-match home answer stays visible until the player opens the next interview. Use one shared original drama atlas, no match-tick work, and test fresh/complete/historic/ended stories and actual native back.

## Additive player threads and inline story selection (2026-10-15)
Read docs/PLAYER_THREADS_2026-10-15.md. Keep thread-link-v1 and thread-red-v1 keys, recorded actors, trigger rules, original prose and both receipt meanings stable; incompatible changes need new keys. Preserve the four published serial arcs. Three or more available arcs use the cached inline list plus selected report. Return restores the exact selection as well as tab/page/year. Player-thread finales use their own four-panel atlas, never the goalkeeper resolution picture. Test actual glyph bounds, all six titles, all replies, whole replays and native return/save.

## Actual readiness and additive corner scene (2026-10-19)

LineupReadiness is readonly preparation advice, never automatic replacement. Retain explicit preview/apply, actual primary ability versus placement estimate, body-status priority and the tactical return without resuming. Keep all11 numeric/colour skills and essential44px actions in the landscape viewport. Preserve deadball-second-v1, its first full rule12+ league-corner trigger, original prose and both receipt meanings. readingVersion2 retains every word, shows the last reply immediately and routes explicit actions to existing set-piece controls. Reuse shared art; never invent corners/goals or change a taker from reading.
